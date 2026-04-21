import { z } from "zod";
import { listTests, getTestById, startTest, autosaveAttempt, submitAttempt, getAttemptResult } from "../services/testEngineService.js";
import { TestAttempt } from "../models/TestAttempt.js";
import { User } from "../models/User.js";
import { notFound, forbidden } from "../middleware/errorHandler.js";
import { persistCheatEventsFromAutosave } from "./cheatingController.js";

export async function getTests(req, res, next) {
  try {
    const items = await listTests();
    res.json({ ok: true, items });
  } catch (e) {
    next(e);
  }
}

export async function getTest(req, res, next) {
  try {
    const id = z.string().min(1).parse(req.params.id);
    const test = await getTestById(id);
    res.json({ ok: true, test });
  } catch (e) {
    next(e);
  }
}

export async function start(req, res, next) {
  try {
    const body = z
      .object({
        testId: z.string().min(1),
        sessionId: z.string().min(8).max(200),
        deviceId: z.string().optional().default("")
      })
      .parse(req.body);

    const user = await User.findById(req.user.id);
    if (!user) throw notFound("User not found");

    if (!user.isPremium && user.testsAttempted >= 2) {
      // Allow resuming
      const existingAttempt = await TestAttempt.findOne({
        userId: req.user.id,
        testId: body.testId,
        status: "in_progress"
      });
      if (!existingAttempt) {
        throw forbidden("TEST_LIMIT_REACHED", "You have reached your 2 free tests limit. Please upgrade to premium.");
      }
    }

    const { test, attempt, resumed } = await startTest({
      userId: req.user.id,
      testId: body.testId,
      sessionId: body.sessionId,
      deviceId: body.deviceId
    });

    if (!resumed && !user.isPremium) {
      await User.updateOne({ _id: user._id }, { $inc: { testsAttempted: 1 } });
    }

    res.status(resumed ? 200 : 201).json({
      ok: true,
      resumed,
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
        id: attempt._id?.toString?.() || attempt.id || attempt._id,
        testId: attempt.testId,
        exam: attempt.exam,
        status: attempt.status,
        startedAt: attempt.startedAt,
        endsAt: attempt.endsAt,
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

export async function autosave(req, res, next) {
  try {
    const body = z
      .object({
        attemptId: z.string().min(1),
        sessionId: z.string().min(8),
        revision: z.number().int().min(0).optional(),
        currentSectionId: z.string().optional(),
        sectionProgress: z.record(z.string(), z.string()).optional(),
        answers: z
          .array(
            z.object({
              questionId: z.string().min(1),
              subject: z.string().min(1).optional(),
              type: z.enum(["MCQ", "NUMERICAL"]),
              selectedOptionKey: z.string().optional(),
              numericalValue: z.number().optional(),
              markForReview: z.boolean().optional(),
              timeSpentMs: z.number().int().min(0).optional()
            })
          )
          .default([]),
        cheatEvents: z.array(z.object({ kind: z.string().min(1), ts: z.string().datetime().optional(), meta: z.any().optional() })).default([]),
        networkEvents: z
          .array(z.object({ kind: z.enum(["OFFLINE", "ONLINE", "AUTOSAVE_FAIL", "AUTOSAVE_OK"]), ts: z.string().datetime().optional(), meta: z.any().optional() }))
          .default([])
      })
      .parse(req.body);

    const out = await autosaveAttempt({
      userId: req.user.id,
      attemptId: body.attemptId,
      sessionId: body.sessionId,
      revision: body.revision,
      patch: {
        answers: body.answers,
        cheatEvents: body.cheatEvents,
        networkEvents: body.networkEvents,
        currentSectionId: body.currentSectionId,
        sectionProgress: body.sectionProgress
      }
    });

    if (body.cheatEvents?.length) {
      await persistCheatEventsFromAutosave({
        userId: req.user.id,
        attemptId: body.attemptId,
        events: body.cheatEvents
      });
    }

    res.json({ ok: true, lastSavedAt: out.lastSavedAt, revision: out.revision });
  } catch (e) {
    next(e);
  }
}

export async function submit(req, res, next) {
  try {
    const body = z
      .object({
        attemptId: z.string().min(1),
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
          .optional()
          .default([]),
        timeUsed: z.coerce.number().int().min(0).optional()
      })
      .parse(req.body);

    const out = await submitAttempt({
      userId: req.user.id,
      attemptId: body.attemptId,
      sessionId: body.sessionId,
      submitIdempotencyKey: body.submitIdempotencyKey,
      responses: body.responses,
      timeUsed: body.timeUsed
    });

    res.json({ ok: true, alreadySubmitted: out.alreadySubmitted, timedOut: out.timedOut, result: out.result });
  } catch (e) {
    next(e);
  }
}

export async function submitByTestId(req, res, next) {
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
        timeUsed: z.coerce.number().int().min(0).optional()
      })
      .parse(req.body);

    const testId = z.string().min(1).parse(req.params.testId);
    const attempt = await TestAttempt.findOne({ userId: req.user.id, testId, status: "in_progress" }).select("_id").lean();
    if (!attempt) throw notFound("Active attempt not found for this test");

    const out = await submitAttempt({
      userId: req.user.id,
      attemptId: attempt._id.toString(),
      sessionId: body.sessionId,
      submitIdempotencyKey: body.submitIdempotencyKey,
      responses: body.responses,
      timeUsed: body.timeUsed
    });

    res.json({ ok: true, alreadySubmitted: out.alreadySubmitted, timedOut: out.timedOut, result: out.result });
  } catch (e) {
    next(e);
  }
}

export async function getResult(req, res, next) {
  try {
    const attemptId = z.string().min(1).parse(req.params.attemptId);
    const result = await getAttemptResult({ userId: req.user.id, attemptId });
    res.json({ ok: true, result });
  } catch (e) {
    next(e);
  }
}

