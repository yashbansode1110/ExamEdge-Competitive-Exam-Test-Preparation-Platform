import mongoose from "mongoose";
import { z } from "zod";
import { Test } from "../models/Test.js";
import { TestAttempt } from "../models/TestAttempt.js";
import { TestSession } from "../models/TestSession.js";
import { startTest, getAttemptResult, submitAttempt } from "../services/testEngineService.js";
import { badRequest, notFound } from "../middleware/errorHandler.js";

function deriveSubjectTimers(test) {
  const out = { physics: 0, chemistry: 0, math: 0, biology: 0 };
  for (const section of test.sections || []) {
    const mins = Math.round(Number(section.durationMs || 0) / 1000);
    for (const subject of section.subjects || []) {
      const key = String(subject || "").toLowerCase();
      if (key.includes("physics")) out.physics += mins;
      if (key.includes("chemistry")) out.chemistry += mins;
      if (key.includes("mathematics") || key === "math") out.math += mins;
      if (key.includes("biology")) out.biology += mins;
    }
  }
  return out;
}

function defaultMhtSectionState() {
  return {
    sectionTimers: { physics: 2700, chemistry: 2700, mathematics: 5400, biology: 5400 },
    sectionStatus: { physics: "not-started", chemistry: "not-started", mathematics: "locked", biology: "locked" },
    activeSection: ""
  };
}

export async function startSession(req, res, next) {
  try {
    const body = z.object({ testId: z.string().min(1), sessionId: z.string().min(8) }).parse(req.body);
    const test = await Test.findById(body.testId).lean();
    if (!test || !test.isActive) throw notFound("Test not found");

    const started = await startTest({
      userId: req.user.id,
      testId: body.testId,
      sessionId: body.sessionId
    });

    const attemptId = started.attempt._id?.toString?.() || started.attempt.id || started.attempt._id;
    const existingSession = await TestSession.findOne({
      userId: req.user.id,
      attemptId,
      status: "in-progress"
    });
    if (existingSession) {
      return res.json({ ok: true, testSessionId: existingSession._id.toString(), resumed: true });
    }

    const subjectTimers = deriveSubjectTimers(test);
    const durationSeconds = Math.max(0, Math.floor(Number(test.durationMs || 0) / 1000));
    const isMht = String(test.exam || "").toUpperCase().includes("MHT");
    const mht = isMht ? defaultMhtSectionState() : null;
    const session = await TestSession.create({
      userId: req.user.id,
      testId: body.testId,
      attemptId,
      startTime: started.attempt.startedAt,
      endTime: started.attempt.endsAt,
      status: "in-progress",
      subjectTimers,
      durationSeconds,
      remainingTimeSeconds: durationSeconds,
      ...(mht ? mht : {})
    });

    res.status(201).json({ ok: true, testSessionId: session._id.toString(), resumed: false });
  } catch (e) {
    next(e);
  }
}

export async function getSessionBootstrap(req, res, next) {
  try {
    const sessionId = z.string().min(1).parse(req.params.testSessionId);
    if (!mongoose.isValidObjectId(sessionId)) throw badRequest("Invalid session id");
    const session = await TestSession.findOne({ _id: sessionId, userId: req.user.id }).lean();
    if (!session) throw notFound("Test session not found");

    const attempt = await TestAttempt.findById(session.attemptId).lean();
    if (!attempt) throw notFound("Attempt not found");
    const test = await Test.findById(session.testId).lean();
    if (!test) throw notFound("Test not found");

    let endsAt = attempt.endsAt;
    if (!endsAt && attempt.startedAt && test.durationMs) {
      endsAt = new Date(new Date(attempt.startedAt).getTime() + Number(test.durationMs));
    }
    const durationSeconds = Math.max(0, Math.floor(Number(test.durationMs || 0) / 1000));
    const remainingSeconds = endsAt
      ? Math.max(0, Math.floor((new Date(endsAt).getTime() - Date.now()) / 1000))
      : 0;

    res.json({
      ok: true,
      testSession: {
        id: session._id.toString(),
        status: session.status,
        subjectTimers: session.subjectTimers,
        startTime: session.startTime,
        endTime: session.endTime,
        durationSeconds: session.durationSeconds ?? durationSeconds,
        remainingTimeSeconds: remainingSeconds,
        sectionTimers: session.sectionTimers,
        sectionStatus: session.sectionStatus,
        activeSection: session.activeSection
      },
      test: {
        id: test._id.toString(),
        exam: test.exam,
        name: test.name,
        durationMs: test.durationMs,
        totalQuestions: test.totalQuestions,
        sections: test.sections,
        marking: test.marking
      },
      attempt: {
        id: attempt._id.toString(),
        sessionId: attempt.sessionId,
        testId: attempt.testId,
        exam: attempt.exam,
        status: attempt.status,
        startedAt: attempt.startedAt,
        endsAt,
        questionIds: attempt.questionIds,
        answers: attempt.answers,
        sections: attempt.sections,
        currentSectionId: attempt.currentSectionId,
        lastSavedAt: attempt.lastSavedAt,
        revision: attempt.revision || 0
      }
    });
  } catch (e) {
    next(e);
  }
}

export async function saveSessionTimers(req, res, next) {
  try {
    const body = z
      .object({
        subjectTimers: z
          .object({
            physics: z.coerce.number().int().min(0).optional(),
            chemistry: z.coerce.number().int().min(0).optional(),
            math: z.coerce.number().int().min(0).optional(),
            biology: z.coerce.number().int().min(0).optional()
          })
          .default({})
        ,
        sectionTimers: z
          .object({
            physics: z.coerce.number().int().min(0).optional(),
            chemistry: z.coerce.number().int().min(0).optional(),
            mathematics: z.coerce.number().int().min(0).optional(),
            biology: z.coerce.number().int().min(0).optional()
          })
          .optional(),
        sectionStatus: z
          .object({
            physics: z.enum(["not-started", "in-progress", "completed"]).optional(),
            chemistry: z.enum(["not-started", "in-progress", "completed"]).optional(),
            mathematics: z.enum(["locked", "not-started", "in-progress", "completed"]).optional(),
            biology: z.enum(["locked", "not-started", "in-progress", "completed"]).optional()
          })
          .optional(),
        activeSection: z.enum(["physics", "chemistry", "mathematics", "biology"]).optional()
      })
      .parse(req.body);
    const sessionId = z.string().min(1).parse(req.params.testSessionId);

    const $set = { subjectTimers: body.subjectTimers };
    if (body.sectionTimers) $set.sectionTimers = body.sectionTimers;
    if (body.sectionStatus) $set.sectionStatus = body.sectionStatus;
    if (body.activeSection) $set.activeSection = body.activeSection;

    const hit = await TestSession.findOneAndUpdate(
      { _id: sessionId, userId: req.user.id, status: "in-progress" },
      { $set },
      { new: true }
    ).select("_id subjectTimers sectionTimers sectionStatus activeSection");
    if (!hit) throw notFound("Test session not found");
    res.json({
      ok: true,
      subjectTimers: hit.subjectTimers,
      sectionTimers: hit.sectionTimers,
      sectionStatus: hit.sectionStatus,
      activeSection: hit.activeSection
    });
  } catch (e) {
    next(e);
  }
}

export async function completeSession(req, res, next) {
  try {
    const body = z
      .object({
        sessionId: z.string().min(8),
        submitIdempotencyKey: z.string().min(8).optional(),
        responses: z
          .array(
            z.object({
              questionId: z.string().min(1),
              selectedOption: z.union([z.string(), z.number()]).optional(),
              type: z.enum(["MCQ", "NUMERICAL"]),
              timeTaken: z.coerce.number().int().min(0).optional().default(0)
            })
          )
          .default([]),
        timeUsed: z.coerce.number().int().min(0).optional(),
        timeLeft: z.coerce.number().int().min(0).optional()
      })
      .parse(req.body);
    const testSessionId = z.string().min(1).parse(req.params.testSessionId);
    const session = await TestSession.findOne({ _id: testSessionId, userId: req.user.id });
    if (!session) throw notFound("Test session not found");

    const out = await submitAttempt({
      userId: req.user.id,
      attemptId: session.attemptId.toString(),
      sessionId: body.sessionId,
      submitIdempotencyKey: body.submitIdempotencyKey,
      responses: body.responses,
      timeUsed: body.timeUsed
    });

    const attemptResult = await getAttemptResult({ userId: req.user.id, attemptId: session.attemptId.toString() });
    session.status = "completed";
    session.score = attemptResult.score;
    session.totalMarks = attemptResult.totalMarks;
    session.accuracy = attemptResult.accuracy;
    session.timeUsed = attemptResult.timeUsed;
    session.answers = (out.result?.responses || []).map((r) => ({
      questionId: r.questionId,
      selectedOption: r.selectedOption,
      isCorrect: r.isCorrect,
      marksAwarded: r.marksAwarded,
      timeTaken: r.timeTaken
    }));
    await session.save();

    res.json({ ok: true, result: out.result, attemptId: session.attemptId.toString() });
  } catch (e) {
    next(e);
  }
}

export async function getUserTestSessions(req, res, next) {
  try {
    const userId = z.string().min(1).parse(req.params.userId);
    if (!mongoose.isValidObjectId(userId)) throw badRequest("Invalid user id");
    if (req.user.id !== userId && req.user.role !== "admin") throw badRequest("Not allowed", "FORBIDDEN");

    const sessions = await TestSession.find({ userId, status: "completed" })
      .populate("testId", "name totalQuestions")
      .sort({ createdAt: -1 })
      .lean();

    const items = sessions.map((s) => ({
      id: s._id.toString(),
      testId: s.testId?._id?.toString?.() || "",
      testName: s.testId?.name || "Untitled Test",
      score: Number(s.score || 0),
      totalMarks: Number(s.totalMarks || 0),
      accuracy: Number(s.accuracy || 0) * 100,
      timeUsed: Number(s.timeUsed || 0),
      date: s.createdAt
    }));

    const totalTests = items.length;
    const averageScore = totalTests ? items.reduce((sum, i) => sum + i.score, 0) / totalTests : 0;
    const bestScore = totalTests ? Math.max(...items.map((i) => i.score)) : 0;

    res.json({
      ok: true,
      items,
      summary: {
        totalTests,
        averageScore: Number(averageScore.toFixed(2)),
        bestScore
      }
    });
  } catch (e) {
    next(e);
  }
}
