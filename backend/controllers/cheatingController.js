import { z } from "zod";
import { TestAttempt } from "../models/TestAttempt.js";
import { createCheatingLog, createCheatingLogsBulk, listCheatingLogs, writeCheatingLogsPdf } from "../services/cheatingService.js";
import { badRequest } from "../middleware/errorHandler.js";

export async function logCheatingEvent(req, res, next) {
  try {
    const body = z
      .object({
        testAttemptId: z.string().min(1),
        examType: z.string().optional(),
        eventType: z.string().min(1),
        timestamp: z.string().datetime().optional(),
        details: z.any().optional()
      })
      .parse(req.body);

    const attempt = await TestAttempt.findById(body.testAttemptId).select("_id exam userId").lean();
    if (!attempt) throw badRequest("Attempt not found", "ATTEMPT_NOT_FOUND");
    if (attempt.userId.toString() !== String(req.user.id)) throw badRequest("Attempt does not belong to user", "ATTEMPT_USER_MISMATCH");

    await createCheatingLog({
      userId: req.user.id,
      testAttemptId: body.testAttemptId,
      examType: body.examType || attempt.exam,
      eventType: body.eventType,
      timestamp: body.timestamp,
      details: body.details
    });

    res.status(201).json({ ok: true });
  } catch (e) {
    next(e);
  }
}

export async function adminGetCheatingLogs(req, res, next) {
  try {
    const q = z
      .object({
        studentId: z.string().optional().default(""),
        examType: z.string().optional().default(""),
        from: z.string().optional().default(""),
        to: z.string().optional().default(""),
        page: z.coerce.number().int().min(1).default(1),
        limit: z.coerce.number().int().min(1).max(200).default(50)
      })
      .parse(req.query);

    const data = await listCheatingLogs({
      studentId: q.studentId,
      examType: q.examType,
      from: q.from,
      to: q.to,
      page: q.page,
      limit: q.limit
    });
    res.json({ ok: true, ...data });
  } catch (e) {
    next(e);
  }
}

export async function adminExportCheatingLogsPdf(req, res, next) {
  try {
    const q = z
      .object({
        studentId: z.string().optional().default(""),
        examType: z.string().optional().default(""),
        from: z.string().optional().default(""),
        to: z.string().optional().default("")
      })
      .parse(req.query);

    const data = await listCheatingLogs({
      studentId: q.studentId,
      examType: q.examType,
      from: q.from,
      to: q.to,
      page: 1,
      limit: 5000
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="cheating-logs-${Date.now()}.pdf"`);
    await writeCheatingLogsPdf({ logs: data.items, stream: res });
  } catch (e) {
    next(e);
  }
}

export async function persistCheatEventsFromAutosave({ userId, attemptId, events }) {
  try {
    await createCheatingLogsBulk({ userId, attemptId, events });
  } catch {
    // Best-effort; autosave should not fail if secondary logging fails.
  }
}
