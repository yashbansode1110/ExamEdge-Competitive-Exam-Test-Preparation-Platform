import mongoose from "mongoose";
import { TestAttempt } from "../models/TestAttempt.js";
import { Question } from "../models/Question.js";
import { badRequest } from "../middleware/errorHandler.js";

function safePct(n, d) {
  if (!d) return 0;
  return n / d;
}

function aggKey(parts) {
  return parts.filter(Boolean).join("::");
}

function toLineSeries(points, label, color = "rgb(99, 102, 241)") {
  return {
    labels: points.map((p) => p.label),
    datasets: [
      {
        label,
        data: points.map((p) => p.value),
        borderColor: color,
        backgroundColor: color.replace("rgb", "rgba").replace(")", ", 0.2)")
      }
    ]
  };
}

export async function buildStudentAnalytics(studentId, { attemptsLimit = 30 } = {}) {
  if (!mongoose.isValidObjectId(studentId)) throw badRequest("Invalid student id", "INVALID_ID");
  const sId = new mongoose.Types.ObjectId(studentId);

  const attempts = await TestAttempt.find({
    userId: sId,
    status: { $in: ["submitted", "timeout", "expired", "in_progress"] }
  })
    .select("exam status startedAt finalizedAt submittedAt score accuracy breakdown answers questionIds correctCount totalMarks")
    .sort({ startedAt: -1 })
    .limit(attemptsLimit)
    .lean();

  console.log("Attempts found for user", studentId, ":", attempts.length);

  if (!attempts.length) {
    return {
      ok: true,
      meta: { studentId, attempts: 0 },
      charts: {
        scoreTrend: { labels: [], datasets: [] },
        subjectAccuracy: { labels: [], datasets: [] },
        topicAccuracy: { labels: [], datasets: [] },
        timePerQuestion: { labels: [], datasets: [] }
      },
      weakTopics: []
    };
  }

  const scorePoints = attempts
    .slice()
    .reverse()
    .map((a) => ({ label: new Date(a.startedAt).toLocaleDateString(), value: Number(a.score || 0) }));

  const timePoints = attempts
    .slice()
    .reverse()
    .map((a) => {
      const total = (a.answers || []).reduce((sum, x) => sum + Math.max(0, Number(x.timeSpentMs || 0)), 0);
      const n = (a.questionIds || []).length || 0;
      return { label: new Date(a.startedAt).toLocaleDateString(), value: n ? Math.round(total / n / 1000) : 0 };
    });

  const subjectAgg = new Map();
  let needComputeAttempts = [];
  for (const a of attempts) {
    const bySubject = a.breakdown?.bySubject || a.breakdown?.bySection;
    if (bySubject) {
      if (Array.isArray(bySubject)) {
        for (const s of bySubject) {
          const name = s.sectionName || s.subject;
          if (!name) continue;
          const cur = subjectAgg.get(name) || { correct: 0, attempted: 0 };
          cur.correct += Number(s.correct || 0);
          cur.attempted += Number(s.total || s.attempted || 0);
          subjectAgg.set(name, cur);
        }
      } else if (typeof bySubject === "object") {
        for (const [subject, s] of Object.entries(bySubject)) {
          const cur = subjectAgg.get(subject) || { correct: 0, attempted: 0 };
          cur.correct += Number(s.correct || 0);
          cur.attempted += Number(s.attempted || s.total || 0);
          subjectAgg.set(subject, cur);
        }
      }
    } else {
      if (needComputeAttempts.length < 10) needComputeAttempts.push(a);
    }
  }

  const topicAgg = new Map();
  if (needComputeAttempts.length) {
    const allQids = [];
    for (const a of needComputeAttempts) for (const qid of a.questionIds || []) allQids.push(qid);

    const qDocs = await Question.find({ _id: { $in: allQids } })
      .select("_id exam subject chapter topic type correctOptionKey numericalAnswer")
      .lean();
    const qById = new Map(qDocs.map((q) => [q._id.toString(), q]));

    for (const a of needComputeAttempts) {
      const ansById = new Map((a.answers || []).map((x) => [x.questionId.toString(), x]));
      for (const qid of a.questionIds || []) {
        const q = qById.get(qid.toString());
        if (!q) continue;
        const ans = ansById.get(qid.toString());
        const attempted =
          ans &&
          ((q.type === "MCQ" && typeof ans.selectedOptionKey === "string") ||
            (q.type === "NUMERICAL" && typeof ans.numericalValue === "number"));
        if (!attempted) continue;

        let isCorrect = false;
        if (q.type === "MCQ") isCorrect = ans.selectedOptionKey === q.correctOptionKey;
        else isCorrect = Math.abs(Number(ans.numericalValue) - Number(q.numericalAnswer)) <= 1e-6;

        const sCur = subjectAgg.get(q.subject) || { correct: 0, attempted: 0 };
        sCur.attempted += 1;
        sCur.correct += isCorrect ? 1 : 0;
        subjectAgg.set(q.subject, sCur);

        const key = aggKey([q.exam, q.subject, q.chapter, q.topic]);
        const tCur = topicAgg.get(key) || {
          correct: 0,
          attempted: 0,
          meta: { exam: q.exam, subject: q.subject, chapter: q.chapter, topic: q.topic }
        };
        tCur.attempted += 1;
        tCur.correct += isCorrect ? 1 : 0;
        topicAgg.set(key, tCur);
      }
    }
  }

  const subjectLabels = [...subjectAgg.keys()].sort();
  const subjectData = subjectLabels.map((s) => Math.round(safePct(subjectAgg.get(s).correct, subjectAgg.get(s).attempted) * 1000) / 10);
  const subjectAccuracy = {
    labels: subjectLabels,
    datasets: [
      {
        label: "Subject accuracy (%)",
        data: subjectData,
        backgroundColor: "rgba(16, 185, 129, 0.35)",
        borderColor: "rgba(16, 185, 129, 0.9)",
        borderWidth: 1
      }
    ]
  };

  const topicItems = [...topicAgg.values()];
  topicItems.sort((a, b) => safePct(a.correct, a.attempted) - safePct(b.correct, b.attempted));
  const topWeak = topicItems.filter((x) => x.attempted >= 3 && safePct(x.correct, x.attempted) < 0.5).slice(0, 10);
  const topicAccuracy = {
    labels: topWeak.map((x) => `${x.meta.subject} • ${x.meta.topic}`),
    datasets: [
      {
        label: "Weak topic accuracy (%)",
        data: topWeak.map((x) => Math.round(safePct(x.correct, x.attempted) * 1000) / 10),
        backgroundColor: "rgba(244, 63, 94, 0.35)",
        borderColor: "rgba(244, 63, 94, 0.9)",
        borderWidth: 1
      }
    ]
  };

  const weakTopics = topWeak.map((x) => ({
    exam: x.meta.exam,
    subject: x.meta.subject,
    chapter: x.meta.chapter,
    topic: x.meta.topic,
    accuracy: safePct(x.correct, x.attempted) * 100, // convert to percentage
    attempts: x.attempted
  }));

  // Strong topics (accuracy >= 70%)
  const topStrong = topicItems.filter((x) => x.attempted >= 3 && safePct(x.correct, x.attempted) >= 0.7).sort((a,b) => safePct(b.correct, b.attempted) - safePct(a.correct, a.attempted)).slice(0, 10);
  const strongTopics = topStrong.map((x) => ({
    topic: x.meta.topic,
    subject: x.meta.subject,
    accuracy: safePct(x.correct, x.attempted) * 100,
    attempts: x.attempted
  }));

  let totalScore = 0;
  let totalCorrect = 0;
  let totalQuestionsA = 0;
  for (const a of attempts) {
     totalScore += Number(a.score || 0);
     totalCorrect += Number(a.correctCount || 0);
     totalQuestionsA += Number((a.questionIds || []).length);
  }
  const overallAccuracy = totalQuestionsA > 0 ? (totalCorrect / totalQuestionsA) * 100 : 0;
  
  const subjectAccuracyMap = {};
  for (const s of subjectLabels) {
    subjectAccuracyMap[s] = Math.round(safePct(subjectAgg.get(s).correct, subjectAgg.get(s).attempted) * 100);
  }

  return {
    ok: true,
    meta: { studentId, attempts: attempts.length, computedFromAttempts: needComputeAttempts.length },
    charts: {
      scoreTrend: toLineSeries(scorePoints, "Score"),
      subjectAccuracy,
      topicAccuracy,
      timePerQuestion: toLineSeries(timePoints, "Avg time per question (sec)", "rgb(16, 185, 129)")
    },
    weakTopics,
    strongTopics,
    score: totalScore,
    accuracy: overallAccuracy,
    subjectAccuracyMap
  };
}

