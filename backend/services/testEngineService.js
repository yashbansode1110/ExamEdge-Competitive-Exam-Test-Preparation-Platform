import mongoose from "mongoose";
import { Test } from "../models/Test.js";
import { TestAttempt } from "../models/TestAttempt.js";
import { Question } from "../models/Question.js";
import { badRequest, forbidden, notFound } from "../middleware/errorHandler.js";
import { evaluateTestAttempt } from "./evaluationService.js";

function buildExamMatchFilter(exam) {
  const value = String(exam || "").trim();
  if (!value) return value;
  if (value.toUpperCase().includes("MHT-CET")) {
    return { $in: ["MHT-CET", "MHT-CET (PCM)", "MHT-CET (PCB)"] };
  }
  if (value.toUpperCase().includes("JEE MAIN")) {
    return { $in: ["JEE Main", "JEE Main (PCM)"] };
  }
  return value;
}

function normalizeSubjectKey(subject) {
  const raw = String(subject || "").trim().toLowerCase();
  if (raw === "math" || raw === "mathematics") return "mathematics";
  return raw;
}

function buildSubjectMatchFilter(subject) {
  const key = normalizeSubjectKey(subject);
  if (key === "mathematics") return /^(mathematics|math)$/i;
  return new RegExp(`^${String(subject || "").trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");
}

function buildSectionStates(test, startedAt) {
  const sections = [...test.sections].sort((a, b) => a.order - b.order);
  const out = [];
  let cursor = startedAt.getTime();
  for (const s of sections) {
    const sStart = new Date(cursor);
    const sEnd = new Date(cursor + s.durationMs);
    out.push({ sectionId: s.sectionId, startedAt: sStart, endsAt: sEnd, timeSpentMs: 0, completed: false });
    cursor += s.durationMs;
  }
  return out;
}

function activeSectionForAttempt(attempt, now) {
  if (!attempt.sections?.length) return null;
  const t = now.getTime();
  return attempt.sections.find((s) => t >= new Date(s.startedAt).getTime() && t < new Date(s.endsAt).getTime()) || null;
}

function enforceSectionWindow({ test, attempt, now, answers }) {
  const sec = activeSectionForAttempt(attempt, now);
  if (!sec) return;
  const testSec = test.sections.find((x) => x.sectionId === sec.sectionId);
  if (!testSec?.hardWindowEnforced) return;
  const allowedSubjects = new Set(testSec.subjects || []);
  for (const a of answers) {
    if (a.subject && !allowedSubjects.has(a.subject)) {
      throw forbidden("Section time window violation", "SECTION_VIOLATION");
    }
  }
}

async function pickQuestionsForTest(test) {
  const preselected = Array.isArray(test.blueprint?.topicFilters?.__preselectedQuestionIds)
    ? test.blueprint.topicFilters.__preselectedQuestionIds
    : [];
  if (preselected.length > 0) {
    return preselected.map((id) => new mongoose.Types.ObjectId(id));
  }

  const counts =
    test.blueprint?.subjectQuestionCounts && Object.keys(test.blueprint.subjectQuestionCounts).length
      ? test.blueprint.subjectQuestionCounts
      : test.sections.reduce((acc, s) => {
          for (const [subj, c] of Object.entries(s.questionCountBySubject || {})) acc[subj] = (acc[subj] || 0) + c;
          return acc;
        }, {});

  const picked = [];
  for (const [subject, countRaw] of Object.entries(counts)) {
    const count = Number(countRaw) || 0;
    if (count <= 0) continue;
    const rows = await Question.aggregate([
      { $match: { isActive: true, exam: buildExamMatchFilter(test.exam), subject: buildSubjectMatchFilter(subject) } },
      { $sample: { size: count } },
      { $project: { _id: 1 } }
    ]);
    if (rows.length !== count) throw badRequest(`Not enough questions for ${subject}`, "INSUFFICIENT_QUESTIONS");
    picked.push(...rows.map((r) => r._id));
  }
  if (picked.length < 1) throw badRequest("Test has no question blueprint", "NO_BLUEPRINT");
  if (picked.length > 300) throw badRequest("Too many questions requested", "TOO_MANY_QUESTIONS");
  return picked;
}

export async function listTests() {
  return Test.find({ isActive: true })
    .select("exam name version isOfficial totalQuestions durationMs sections marking createdAt")
    .sort({ isOfficial: -1, createdAt: -1 })
    .lean();
}

export async function getTestById(id) {
  if (!mongoose.isValidObjectId(id)) throw badRequest("Invalid test id", "INVALID_ID");
  const test = await Test.findById(id).select("exam name version isOfficial totalQuestions durationMs sections marking blueprint isActive").lean();
  if (!test || test.isActive === false) throw notFound("Test not found");
  return test;
}

export async function startTest({ userId, testId, sessionId, deviceId = "" }) {
  if (!mongoose.isValidObjectId(testId)) throw badRequest("Invalid testId", "INVALID_ID");
  const test = await Test.findById(testId).lean();
  if (!test || !test.isActive) throw notFound("Test not found");

  const existing = await TestAttempt.findOne({ userId, testId, status: "in_progress" });
  if (existing) {
    // If a user has only one active tab now but an older in-progress attempt
    // carries a previous session id, rotate the session to the current one
    // to avoid false MULTI_TAB blocks on autosave/submit.
    if (existing.sessionId !== sessionId) {
      existing.cheatEvents.push({
        kind: "SESSION_ROTATED_ON_START",
        ts: new Date(),
        meta: { from: existing.sessionId, to: sessionId }
      });
      existing.sessionId = sessionId;
      existing.deviceId = deviceId || existing.deviceId;
      await existing.save();
    }
    return { test, attempt: existing.toObject(), resumed: true };
  }

  const questionIds = await pickQuestionsForTest(test);
  const startedAt = new Date();
  const endsAt = new Date(startedAt.getTime() + test.durationMs);
  const sections = buildSectionStates(test, startedAt);

  const attempt = await TestAttempt.create({
    userId,
    testId,
    exam: test.exam,
    sessionId,
    deviceId,
    status: "in_progress",
    startedAt,
    endsAt,
    questionIds,
    answers: [],
    sections,
    currentSectionId: sections[0]?.sectionId || "",
    revision: 0
  });

  return { test, attempt: attempt.toObject(), resumed: false };
}

export async function autosaveAttempt({ userId, attemptId, sessionId, revision, patch, now = new Date() }) {
  if (!mongoose.isValidObjectId(attemptId)) throw badRequest("Invalid attemptId", "INVALID_ID");
  const attempt = await TestAttempt.findOne({ _id: attemptId, userId });
  if (!attempt) throw notFound("Attempt not found");
  if (attempt.status !== "in_progress") throw forbidden("Attempt is not active", "ATTEMPT_NOT_ACTIVE");
  if (attempt.sessionId !== sessionId) {
    attempt.cheatEvents.push({ kind: "MULTI_TAB_SESSION_MISMATCH", meta: { got: sessionId } });
    await attempt.save();
    throw forbidden("Session mismatch (multi-tab detected)", "MULTI_TAB");
  }

  if (now > attempt.endsAt) {
    attempt.status = "timeout";
    attempt.finalizedAt = now;
    await attempt.save();
    throw forbidden("Time over", "TIME_OVER");
  }

  const test = await Test.findById(attempt.testId).lean();
  if (!test) throw notFound("Test not found");

  const answers = patch.answers || [];
  enforceSectionWindow({ test, attempt, now, answers });

  if (typeof revision === "number" && revision !== attempt.revision) {
    throw forbidden("Stale autosave revision", "STALE_REVISION");
  }

  const byQid = new Map(attempt.answers.map((x) => [x.questionId.toString(), x]));
  for (const a of answers) {
    const prev = byQid.get(a.questionId);
    const merged = {
      questionId: a.questionId,
      type: a.type,
      selectedOptionKey: a.selectedOptionKey,
      numericalValue: a.numericalValue,
      markForReview: !!a.markForReview,
      timeSpentMs: Math.max(0, Number(a.timeSpentMs || 0)),
      savedAt: now
    };
    if (prev) Object.assign(prev, merged);
    else attempt.answers.push(merged);
  }

  if (patch.currentSectionId) attempt.currentSectionId = patch.currentSectionId;

  for (const e of patch.cheatEvents || []) {
    attempt.cheatEvents.push({ kind: e.kind, ts: e.ts ? new Date(e.ts) : now, meta: e.meta || {} });
  }
  for (const e of patch.networkEvents || []) {
    attempt.networkEvents.push({ kind: e.kind, ts: e.ts ? new Date(e.ts) : now, meta: e.meta || {} });
  }

  attempt.lastSavedAt = now;
  attempt.revision += 1;
  await attempt.save();

  return { lastSavedAt: attempt.lastSavedAt, revision: attempt.revision };
}

export async function submitAttempt({ userId, attemptId, sessionId, submitIdempotencyKey, responses = [], timeUsed, now = new Date() }) {
  if (!mongoose.isValidObjectId(attemptId)) throw badRequest("Invalid attemptId", "INVALID_ID");
  const attempt = await TestAttempt.findOne({ _id: attemptId, userId });
  if (!attempt) throw notFound("Attempt not found");

  if (attempt.status === "submitted") {
    return { alreadySubmitted: true, timedOut: false, result: { score: attempt.score, accuracy: attempt.accuracy, breakdown: attempt.breakdown } };
  }
  if (attempt.status !== "in_progress") throw forbidden("Attempt is not active", "ATTEMPT_NOT_ACTIVE");
  if (attempt.sessionId !== sessionId) throw forbidden("Session mismatch", "MULTI_TAB");

  const test = await Test.findById(attempt.testId).lean();
  if (!test) throw notFound("Test not found");

  const timedOut = now > attempt.endsAt;

  if (Array.isArray(responses) && responses.length) {
    const byQid = new Map(attempt.answers.map((x) => [x.questionId.toString(), x]));
    for (const a of responses) {
      const merged = {
        questionId: a.questionId,
        type: a.type,
        selectedOptionKey: a.type === "MCQ" ? a.selectedOption : undefined,
        numericalValue: a.type === "NUMERICAL" ? Number(a.selectedOption) : undefined,
        markForReview: false,
        timeSpentMs: Math.max(0, Number(a.timeTaken || 0)),
        savedAt: now
      };
      const prev = byQid.get(a.questionId);
      if (prev) Object.assign(prev, merged);
      else attempt.answers.push(merged);
    }
    await attempt.save();
  }

  const qs = await Question.find({ _id: { $in: attempt.questionIds } })
    .select("_id subject type correctOptionKey numericalAnswer")
    .lean();
  const scored = evaluateTestAttempt({ test, questions: qs, answers: attempt.answers });

  const baseTimeUsed = typeof timeUsed === "number" ? Math.max(0, timeUsed) : Math.max(0, Number(scored.timeUsed || 0));

  const finalStatus = timedOut ? "timeout" : "submitted";
  const update = {
    status: finalStatus,
    submittedAt: now,
    finalizedAt: now,
    submitIdempotencyKey: submitIdempotencyKey || attempt.submitIdempotencyKey,
    score: scored.score,
    accuracy: scored.accuracy,
    totalMarks: scored.totalMarks,
    correctCount: scored.correctCount,
    wrongCount: scored.wrongCount,
    unattemptedCount: scored.unattemptedCount,
    responses: scored.responses,
    sectionStats: scored.sectionStats,
    timeUsed: baseTimeUsed,
    breakdown: {
      correct: scored.correctCount,
      wrong: scored.wrongCount,
      attempted: scored.attemptedCount,
      bySection: scored.sectionStats
    }
  };

  const updated = await TestAttempt.findOneAndUpdate({ _id: attempt._id, status: "in_progress" }, { $set: update }, { new: true }).lean();
  if (!updated) {
    const fresh = await TestAttempt.findById(attempt._id).lean();
    return {
      alreadySubmitted: fresh?.status === "submitted",
      timedOut: fresh?.status === "timeout",
      result: {
        attemptId: fresh?._id?.toString?.() || "",
        score: fresh?.score || 0,
        totalMarks: fresh?.totalMarks || 0,
        accuracy: fresh?.accuracy || 0,
        accuracyPercent: Number(fresh?.accuracy || 0) * 100,
        correct: fresh?.correctCount || 0,
        wrong: fresh?.wrongCount || 0,
        unattempted: fresh?.unattemptedCount || 0,
        sectionStats: fresh?.sectionStats || [],
        timeUsed: fresh?.timeUsed || 0,
        responses: fresh?.responses || [],
        breakdown: fresh?.breakdown || {},
        rank: 0
      }
    };
  }

  const rank = (await TestAttempt.countDocuments({
    testId: updated.testId,
    status: { $in: ["submitted", "timeout"] },
    score: { $gt: updated.score }
  })) + 1;

  await TestAttempt.findByIdAndUpdate(updated._id, { $set: { rank } });

  return {
    alreadySubmitted: false,
    timedOut,
    result: {
      attemptId: updated._id.toString(),
      score: updated.score,
      totalMarks: updated.totalMarks || scored.totalMarks,
      accuracy: updated.accuracy,
      accuracyPercent: Number(updated.accuracy || 0) * 100,
      correct: updated.correctCount || scored.correctCount,
      wrong: updated.wrongCount || scored.wrongCount,
      unattempted: updated.unattemptedCount || scored.unattemptedCount,
      sectionStats: updated.sectionStats || scored.sectionStats,
      timeUsed: updated.timeUsed || baseTimeUsed,
      responses: updated.responses || scored.responses,
      rank,
      breakdown: updated.breakdown || {}
    }
  };
}

export async function getAttemptResult({ userId, attemptId }) {
  if (!mongoose.isValidObjectId(attemptId)) throw badRequest("Invalid attemptId", "INVALID_ID");
  const attempt = await TestAttempt.findOne({ _id: attemptId, userId }).lean();
  if (!attempt) throw notFound("Attempt not found");
  const rank =
    attempt.rank && attempt.rank > 0
      ? attempt.rank
      : (await TestAttempt.countDocuments({
          testId: attempt.testId,
          status: { $in: ["submitted", "timeout"] },
          score: { $gt: attempt.score || 0 }
        })) + 1;

  return {
    attemptId: attempt._id.toString(),
    score: attempt.score || 0,
    totalMarks: attempt.totalMarks || 0,
    accuracy: attempt.accuracy || 0,
    accuracyPercent: Number(attempt.accuracy || 0) * 100,
    correct: attempt.correctCount || 0,
    wrong: attempt.wrongCount || 0,
    unattempted: attempt.unattemptedCount || 0,
    sectionStats: attempt.sectionStats || [],
    timeUsed: attempt.timeUsed || 0,
    responses: attempt.responses || [],
    rank,
    breakdown: attempt.breakdown || {}
  };
}

