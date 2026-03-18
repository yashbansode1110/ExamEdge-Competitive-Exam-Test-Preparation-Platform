import { z } from "zod";
import { listTests, getTestById, startTest, autosaveAttempt, submitAttempt } from "../services/testEngineService.js";

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

    const { test, attempt, resumed } = await startTest({
      userId: req.user.id,
      testId: body.testId,
      sessionId: body.sessionId,
      deviceId: body.deviceId
    });

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
        currentSectionId: body.currentSectionId
      }
    });

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
        submitIdempotencyKey: z.string().min(8).optional()
      })
      .parse(req.body);

    const out = await submitAttempt({
      userId: req.user.id,
      attemptId: body.attemptId,
      sessionId: body.sessionId,
      submitIdempotencyKey: body.submitIdempotencyKey
    });

    res.json({ ok: true, alreadySubmitted: out.alreadySubmitted, timedOut: out.timedOut, result: out.result });
  } catch (e) {
    next(e);
  }
}

