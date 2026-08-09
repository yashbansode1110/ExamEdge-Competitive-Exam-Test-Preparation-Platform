import mongoose from "mongoose";
import { TestAttempt } from "../models/TestAttempt.js";
import { Question } from "../models/Question.js";
import { badRequest } from "../middleware/errorHandler.js";

function pct(n, d) {
  if (!d || d <= 0) return 0;
  return (n / d) * 100;
}

function mean(arr) {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function stdDev(arr) {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  return Math.sqrt(mean(arr.map((x) => (x - m) ** 2)));
}

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}

function toDateKey(d) {
  const dt = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(dt.getTime())) return "";
  return dt.toISOString().slice(0, 10);
}

function attemptCompletedAt(a) {
  return a.finalizedAt || a.submittedAt || a.updatedAt || a.startedAt;
}

function scorePercent(a) {
  const tm = Number(a.totalMarks || 0);
  const sc = Number(a.score || 0);
  if (tm > 0) return clamp((sc / tm) * 100, 0, 100);
  const acc = Number(a.accuracy || 0);
  if (acc > 0 && acc <= 1) return acc * 100;
  if (acc > 1) return clamp(acc, 0, 100);
  return 0;
}

function isAnswerAttempted(r, questionType) {
  if (!r) return false;
  if (questionType === "MCQ") {
    return typeof r.selectedOption === "string" && r.selectedOption.length > 0;
  }
  return typeof r.selectedOption === "number" && !Number.isNaN(r.selectedOption);
}

function mergeSubjectBucket(agg, name, correct, attempted) {
  if (!name) return;
  const cur = agg.get(name) || { correct: 0, attempted: 0 };
  cur.correct += correct;
  cur.attempted += attempted;
  agg.set(name, cur);
}

function ingestBreakdownSubject(agg, bySubject) {
  if (!bySubject) return;
  if (Array.isArray(bySubject)) {
    for (const s of bySubject) {
      const name = s.sectionName || s.subject;
      mergeSubjectBucket(agg, name, Number(s.correct || 0), Number(s.total || s.attempted || 0));
    }
  } else if (typeof bySubject === "object") {
    for (const [subject, s] of Object.entries(bySubject)) {
      mergeSubjectBucket(agg, subject, Number(s.correct || 0), Number(s.attempted || s.total || 0));
    }
  }
}

function topicKey(q) {
  return [q.exam, q.subject, q.chapter, q.topic].filter(Boolean).join("::");
}

function buildHeuristicRecommendations({ weakTopics, weakSubjects, timeManagement, avgAccuracy }) {
  const out = [];
  if (weakTopics.length) {
    out.push(`Prioritize ${weakTopics[0].topic} (${weakTopics[0].subject}) — accuracy is under 50% with enough attempts to be meaningful.`);
  }
  if (weakSubjects.length) {
    out.push(`Schedule focused drills for: ${weakSubjects.slice(0, 3).join(", ")}.`);
  }
  if (timeManagement?.timedOutTests > timeManagement?.submittedTests) {
    out.push("Several tests ended on time pressure; practice shorter timed blocks to build pacing.");
  }
  if (avgAccuracy < 55) {
    out.push("Review every incorrect question within 24 hours of each mock to lift overall accuracy.");
  }
  if (!out.length) {
    out.push("Maintain momentum with mixed-topic mocks twice a week.");
  }
  return out.slice(0, 8);
}

function buildStudyPlan({ weakTopics, weakSubjects }) {
  const plan = [];
  if (weakSubjects.length) {
    plan.push(`Week 1–2: 40% time on ${weakSubjects[0]}, 30% second weak subject, 30% mixed review.`);
  }
  if (weakTopics.length) {
    plan.push(`Daily: 25 minutes on "${weakTopics[0].topic}" until accuracy crosses 60%.`);
  }
  plan.push("After each test: log mistakes by topic in a notebook and re-attempt similar questions.");
  return plan.slice(0, 6);
}

function buildAiSummary({ subjectAccuracy, weakTopics, strengthSubjects, improvingSubjects }) {
  const parts = [];
  if (improvingSubjects.length) {
    parts.push(`You are improving in ${improvingSubjects.slice(0, 3).join(", ")}.`);
  }
  const strong = subjectAccuracy.filter((s) => s.accuracy >= 75 && s.attempted >= 3).map((s) => s.subject);
  if (strong.length) {
    parts.push(`Strong areas include ${strong.join(", ")}.`);
  }
  const weak = subjectAccuracy.filter((s) => s.accuracy < 50 && s.attempted >= 3).map((s) => s.subject);
  if (weak.length) {
    parts.push(`Add deliberate practice in ${weak.join(", ")}.`);
  } else if (weakTopics.length) {
    parts.push(
      `Topic-level gaps show up in ${weakTopics
        .slice(0, 4)
        .map((t) => t.topic)
        .join(", ")}.`
    );
  }
  if (!parts.length) {
    return "Complete a few more timed tests to unlock richer subject and topic insights.";
  }
  return parts.join(" ");
}

/**
 * @param {string} studentId
 * @param {{ attemptsLimit?: number }} opts
 */
export async function buildStudentAnalytics(studentId, { attemptsLimit = 30 } = {}) {
  if (!mongoose.isValidObjectId(studentId)) throw badRequest("Invalid student id", "INVALID_ID");
  const sId = new mongoose.Types.ObjectId(studentId);

  const attempts = await TestAttempt.find({
    userId: sId,
    status: { $in: ["submitted", "timeout", "expired"] }
  })
    .select(
      "exam status startedAt endsAt submittedAt finalizedAt updatedAt score accuracy breakdown answers questionIds responses correctCount totalMarks timeUsed subjectStats sectionStats"
    )
    .sort({ startedAt: 1 })
    .limit(attemptsLimit)
    .lean();

  // eslint-disable-next-line no-console
  console.log("Attempts found for analytics:", attempts.length);

  if (!attempts.length) {
    return emptyAnalyticsPayload(studentId);
  }

  const scorePercents = attempts.map(scorePercent);
  const chronological = attempts;

  const scoreTrend = chronological.map((a) => {
    const when = attemptCompletedAt(a);
    return {
      date: toDateKey(when),
      score: Math.round(scorePercent(a) * 10) / 10,
      rawScore: Number(a.score || 0),
      totalMarks: Number(a.totalMarks || 0)
    };
  });

  const subjectAgg = new Map();
  const topicAgg = new Map();
  let totalAnswered = 0;
  let totalCorrectAnswered = 0;
  let totalTimeOnAnsweredMs = 0;
  const subjectAttemptedOnly = new Map();

  const allQids = [];
  for (const a of attempts) {
    for (const qid of a.questionIds || []) allQids.push(qid);
  }
  const uniqueQids = [...new Set(allQids.map((id) => id.toString()))].map((id) => new mongoose.Types.ObjectId(id));

  const qDocs = await Question.find({ _id: { $in: uniqueQids } })
    .select("_id exam subject chapter topic type correctOptionKey numericalAnswer")
    .lean();
  const qById = new Map(qDocs.map((q) => [q._id.toString(), q]));

  let filledFromQuestions = false;

  for (const a of attempts) {
    const respByQ = new Map((a.responses || []).map((r) => [r.questionId.toString(), r]));
    const ansByQ = new Map((a.answers || []).map((x) => [x.questionId.toString(), x]));
    const useResponses = (a.responses || []).length > 0;

    for (const qid of a.questionIds || []) {
      const q = qById.get(qid.toString());
      if (!q) continue;

      let attempted = false;
      let correct = false;
      let timeMs = 0;

      if (useResponses) {
        const r = respByQ.get(qid.toString());
        attempted = isAnswerAttempted(r, q.type);
        if (!attempted) continue;
        correct = !!r?.isCorrect;
        timeMs = Math.max(0, Number(r?.timeTaken || 0));
      } else {
        const ans = ansByQ.get(qid.toString());
        attempted =
          !!ans &&
          ((q.type === "MCQ" && typeof ans.selectedOptionKey === "string") ||
            (q.type === "NUMERICAL" && typeof ans.numericalValue === "number"));
        if (!attempted) continue;
        correct =
          q.type === "MCQ"
            ? ans.selectedOptionKey === q.correctOptionKey
            : Math.abs(Number(ans.numericalValue) - Number(q.numericalAnswer)) <= 1e-6;
        timeMs = Math.max(0, Number(ans?.timeSpentMs || 0));
      }

      filledFromQuestions = true;
      totalAnswered += 1;
      if (correct) totalCorrectAnswered += 1;
      totalTimeOnAnsweredMs += timeMs;

      mergeSubjectBucket(subjectAgg, q.subject, correct ? 1 : 0, 1);
      const sAtt = subjectAttemptedOnly.get(q.subject) || 0;
      subjectAttemptedOnly.set(q.subject, sAtt + 1);

      const key = topicKey(q);
      const cur =
        topicAgg.get(key) ||
        ({
          correct: 0,
          attempted: 0,
          meta: { exam: q.exam, subject: q.subject, chapter: q.chapter, topic: q.topic }
        });
      cur.attempted += 1;
      cur.correct += correct ? 1 : 0;
      topicAgg.set(key, cur);
    }
  }

  if (!filledFromQuestions) {
    for (const a of attempts) {
      ingestBreakdownSubject(subjectAgg, a.breakdown?.bySubject);
      ingestBreakdownSubject(subjectAgg, a.breakdown?.bySection);
    }
    for (const [sub, v] of subjectAgg) {
      subjectAttemptedOnly.set(sub, v.attempted);
    }
    totalAnswered = attempts.reduce((s, a) => s + Number(a.breakdown?.attempted || 0), 0);
    totalCorrectAnswered = attempts.reduce((s, a) => s + Number(a.breakdown?.correct || 0), 0);
    if (!totalAnswered) {
      totalAnswered = attempts.reduce((s, a) => s + Number(a.correctCount || 0) + Number(a.wrongCount || 0), 0);
      totalCorrectAnswered = attempts.reduce((s, a) => s + Number(a.correctCount || 0), 0);
    }
    totalTimeOnAnsweredMs = attempts.reduce((s, a) => s + Math.max(0, Number(a.timeUsed || 0)), 0);
  }

  const subjectLabels = [...new Set([...subjectAgg.keys(), ...subjectAttemptedOnly.keys()])].sort();
  const subjectAccuracy = subjectLabels.map((sub) => {
    const b = subjectAgg.get(sub) || { correct: 0, attempted: 0 };
    return {
      subject: sub,
      accuracy: Math.round(pct(b.correct, b.attempted) * 10) / 10,
      correct: b.correct,
      attempted: b.attempted
    };
  });

  const attemptedTotal = [...subjectAttemptedOnly.values()].reduce((s, n) => s + n, 0) || totalAnswered;
  const subjectDistribution = subjectLabels.map((sub) => {
    const c = subjectAttemptedOnly.get(sub) || 0;
    return {
      subject: sub,
      count: c,
      percent: attemptedTotal ? Math.round((c / attemptedTotal) * 1000) / 10 : 0
    };
  }).filter((x) => x.count > 0);

  const topicItems = [...topicAgg.values()].filter((t) => t.attempted > 0);
  topicItems.sort((a, b) => pct(a.correct, a.attempted) - pct(b.correct, b.attempted));

  const weakTopics = topicItems
    .filter((x) => x.attempted >= 2 && pct(x.correct, x.attempted) < 50)
    .slice(0, 15)
    .map((x) => ({
      exam: x.meta.exam,
      subject: x.meta.subject,
      chapter: x.meta.chapter,
      topic: x.meta.topic,
      accuracy: Math.round(pct(x.correct, x.attempted) * 10) / 10,
      attempts: x.attempted
    }));

  const strengthTopics = topicItems
    .filter((x) => x.attempted >= 2 && pct(x.correct, x.attempted) >= 75)
    .sort((a, b) => pct(b.correct, b.attempted) - pct(a.correct, a.attempted))
    .slice(0, 10)
    .map((x) => ({
      topic: x.meta.topic,
      subject: x.meta.subject,
      accuracy: Math.round(pct(x.correct, x.attempted) * 10) / 10,
      attempts: x.attempted
    }));

  const strengthSubjects = subjectAccuracy.filter((s) => s.attempted >= 3 && s.accuracy > 75).map((s) => s.subject);
  const weakSubjects = subjectAccuracy.filter((s) => s.attempted >= 3 && s.accuracy < 50).map((s) => s.subject);

  const strengths = [
    ...strengthSubjects.map((s) => `Strong in ${s} (>${75}% accuracy across recent attempts)`),
    ...strengthTopics.slice(0, 5).map((t) => `Solid grasp of ${t.topic} in ${t.subject} (~${t.accuracy}% )`)
  ].slice(0, 12);

  const weakAreas = [
    ...weakSubjects.map((s) => `${s} needs work (<50% accuracy)`),
    ...weakTopics.slice(0, 6).map((t) => `${t.topic} (${t.subject}) at ~${t.accuracy}%`)
  ].slice(0, 12);

  const avgScorePercent = Math.round(mean(scorePercents) * 10) / 10;
  const highestScore = Math.round(Math.max(...scorePercents) * 10) / 10;
  const overallAccuracy = totalAnswered ? Math.round(pct(totalCorrectAnswered, totalAnswered) * 10) / 10 : 0;

  let improvementPercent = 0;
  if (scorePercents.length >= 4) {
    const first = mean(scorePercents.slice(0, Math.min(3, scorePercents.length)));
    const last = mean(scorePercents.slice(-Math.min(3, scorePercents.length)));
    if (first > 0) improvementPercent = Math.round(((last - first) / first) * 1000) / 10;
  } else if (scorePercents.length >= 2) {
    improvementPercent = Math.round((scorePercents[scorePercents.length - 1] - scorePercents[0]) * 10) / 10;
  }

  const improvingSubjects = [];
  if (attempts.length >= 2) {
    const half = Math.floor(attempts.length / 2);
    const early = attempts.slice(0, half);
    const late = attempts.slice(half);
    const earlyMap = new Map();
    const lateMap = new Map();
    for (const a of early) ingestBreakdownSubject(earlyMap, a.breakdown?.bySubject);
    for (const a of late) ingestBreakdownSubject(lateMap, a.breakdown?.bySubject);
    for (const sub of subjectLabels) {
      const e = earlyMap.get(sub);
      const l = lateMap.get(sub);
      if (!e?.attempted || !l?.attempted || e.attempted < 2 || l.attempted < 2) continue;
      const pe = pct(e.correct, e.attempted);
      const pl = pct(l.correct, l.attempted);
      if (pl - pe >= 8) improvingSubjects.push(sub);
    }
  }

  const std = stdDev(scorePercents);
  const consistencyScore = std < 0.5 ? 95 : clamp(100 - std * 8, 15, 100);
  const volumeScore = clamp((totalAnswered / 60) * 100, 0, 100);
  const performanceScore = clamp(avgScorePercent, 0, 100);
  const confidenceValue = Math.round(consistencyScore * 0.45 + volumeScore * 0.35 + performanceScore * 0.2);
  const confidence = {
    score: confidenceValue,
    label:
      confidenceValue >= 75 ? "High" : confidenceValue >= 50 ? "Moderate" : confidenceValue >= 30 ? "Limited" : "Low",
    factors: {
      consistency: Math.round(consistencyScore),
      dataVolume: Math.round(volumeScore),
      recentPerformance: Math.round(performanceScore)
    }
  };

  let predictedNext = avgScorePercent;
  let trend = "stable";
  if (scorePercents.length >= 2) {
    const deltas = [];
    for (let i = 1; i < scorePercents.length; i++) deltas.push(scorePercents[i] - scorePercents[i - 1]);
    const avgDelta = mean(deltas);
    predictedNext = clamp(scorePercents[scorePercents.length - 1] + avgDelta, 0, 100);
    if (avgDelta > 1.5) trend = "up";
    else if (avgDelta < -1.5) trend = "down";
  }
  const predictedScore = {
    nextScorePercent: Math.round(predictedNext * 10) / 10,
    trend,
    method: "moving average of last test deltas"
  };

  const submittedTests = attempts.filter((a) => a.status === "submitted").length;
  const timedOutTests = attempts.filter((a) => a.status === "timeout" || a.status === "expired").length;
  const avgSecPerQuestion =
    totalAnswered > 0 ? Math.round(totalTimeOnAnsweredMs / totalAnswered / 1000) : 0;
  const rushed = subjectAccuracy
    .filter((s) => s.attempted >= 5 && s.accuracy < 45)
    .map((s) => s.subject);

  const timeManagement = {
    averageSecondsPerQuestion: avgSecPerQuestion,
    submittedTests,
    timedOutTests,
    rushedSubjectHints: rushed,
    summary:
      timedOutTests > submittedTests
        ? "Time limits are often biting before you finish; prioritize skipping hard stalls earlier."
        : avgSecPerQuestion > 0 && avgSecPerQuestion < 25
          ? "Very fast per-question pace — verify you are not rushing at the cost of accuracy."
          : "Timing looks sustainable versus your recent attempts."
  };

  const recommendations = buildHeuristicRecommendations({
    weakTopics,
    weakSubjects,
    timeManagement,
    avgAccuracy: overallAccuracy
  });

  const studyPlan = buildStudyPlan({ weakTopics, weakSubjects });

  const aiSummary = buildAiSummary({
    subjectAccuracy,
    weakTopics,
    strengthSubjects,
    improvingSubjects
  });

  const subjectAccuracyMap = Object.fromEntries(subjectAccuracy.map((s) => [s.subject, s.accuracy]));

  return {
    ok: true,
    userId: studentId,
    totalTests: attempts.length,
    totalQuestionsAnswered: totalAnswered,
    highestScore,
    averageScorePercent: avgScorePercent,
    improvementPercent,
    overallScore: avgScorePercent,
    accuracy: overallAccuracy,
    scoreTrend,
    subjectAccuracy,
    subjectDistribution,
    weakTopics,
    strengthTopics,
    strengths,
    weakAreas,
    recommendations,
    studyPlan,
    confidence,
    predictedScore,
    predictedPerformance: `Next mock ~${predictedScore.nextScorePercent}% (${predictedScore.trend})`,
    confidenceLevel: `${confidence.label} (${confidence.score}/100)`,
    timeManagement,
    aiSummary,
    subjectAccuracyMap,
    strongTopics: strengthTopics
  };
}

function emptyAnalyticsPayload(studentId = "") {
  return {
    ok: true,
    userId: studentId,
    totalTests: 0,
    totalQuestionsAnswered: 0,
    highestScore: 0,
    averageScorePercent: 0,
    improvementPercent: 0,
    overallScore: 0,
    accuracy: 0,
    scoreTrend: [],
    subjectAccuracy: [],
    subjectDistribution: [],
    weakTopics: [],
    strengthTopics: [],
    strengths: [],
    weakAreas: [],
    recommendations: ["Complete a full timed mock to unlock your dashboard."],
    studyPlan: ["Take an official pattern mock under exam rules."],
    confidence: { score: 0, label: "None", factors: { consistency: 0, dataVolume: 0, recentPerformance: 0 } },
    predictedScore: { nextScorePercent: 0, trend: "unknown", method: "insufficient data" },
    predictedPerformance: "Not enough data yet.",
    confidenceLevel: "N/A",
    timeManagement: {
      averageSecondsPerQuestion: 0,
      submittedTests: 0,
      timedOutTests: 0,
      rushedSubjectHints: [],
      summary: "No completed attempts found."
    },
    aiSummary: "Complete your first test to generate analytics.",
    subjectAccuracyMap: {}
  };
}
