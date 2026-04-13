import { z } from "zod";
import { TestAttempt } from "../models/TestAttempt.js";
import { createCheatingLog, createCheatingLogsBulk, listCheatingLogs, writeCheatingLogsPdf } from "../services/cheatingService.js";
import { badRequest } from "../middleware/errorHandler.js";

export async function logCheatingEvent(req, res, next) {
  try {
    const { testAttemptId, eventType, examType, timestamp, details } = req.body;
    const userId = req.user?.id;

    if (!userId || !testAttemptId || !eventType) {
      return res.status(200).json({ success: true, error: "Missing required fields" });
    }

    const attempt = await TestAttempt.findById(testAttemptId).select("_id exam userId").lean();
    
    // As long as fields are valid, we attempt to log. If skipped or fails, return 200.
    if (attempt && attempt.userId.toString() === String(userId)) {
      try {
        await createCheatingLog({
          userId,
          testAttemptId,
          examType: examType || attempt.exam || "UNKNOWN",
          eventType,
          timestamp,
          details
        });
      } catch (err) {
        // silent error handling for logging failures
      }
    }

    return res.status(200).json({ success: true });
  } catch (e) {
    // catch all unexpected server errors but return success as requested
    return res.status(200).json({ success: true });
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
