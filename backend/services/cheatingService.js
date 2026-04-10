import crypto from "crypto";
import mongoose from "mongoose";
import { z } from "zod";
import PDFDocument from "pdfkit";
import { badRequest } from "../middleware/errorHandler.js";
import { CheatingLog } from "../models/CheatingLog.js";
import { TestAttempt } from "../models/TestAttempt.js";

const LogInputSchema = z.object({
  userId: z.string().min(1),
  testAttemptId: z.string().min(1),
  examType: z.string().min(1),
  eventType: z.string().min(1),
  timestamp: z.union([z.string().datetime(), z.date()]).optional(),
  details: z.unknown().optional()
});

function normalizeEventType(input) {
  const s = String(input || "").trim().toUpperCase();
  if (!s) return "unknown";
  const map = {
    TAB_HIDDEN: "tab_switch",
    WINDOW_BLUR: "tab_switch",
    FULLSCREEN_EXIT: "fullscreen_exit",
    COPY_BLOCKED: "copy_attempt",
    COPY_SHORTCUT_BLOCKED: "copy_attempt",
    PASTE_BLOCKED: "paste_attempt",
    PASTE_SHORTCUT_BLOCKED: "paste_attempt",
    MULTI_TAB_DETECTED: "multiple_tab",
    DEVTOOLS_OPEN: "devtools_open",
    RIGHT_CLICK_BLOCKED: "right_click",
    CUT_BLOCKED: "cut_attempt",
    CUT_SHORTCUT_BLOCKED: "cut_attempt",
    DRAG_BLOCKED: "drag_attempt",
    DROP_BLOCKED: "drop_attempt",
    TEXT_SELECTION_BLOCKED: "selection_attempt"
  };
  return map[s] || s.toLowerCase();
}

function toFingerprint({ userId, testAttemptId, eventType, ts, details }) {
  const payload = `${userId}|${testAttemptId}|${eventType}|${new Date(ts).toISOString()}|${JSON.stringify(details || {})}`;
  return crypto.createHash("sha1").update(payload).digest("hex");
}

export async function createCheatingLog(input) {
  const parsed = LogInputSchema.parse(input);
  if (!mongoose.isValidObjectId(parsed.userId)) throw badRequest("Invalid userId", "INVALID_USER_ID");
  if (!mongoose.isValidObjectId(parsed.testAttemptId)) throw badRequest("Invalid testAttemptId", "INVALID_TEST_ATTEMPT_ID");

  const ts = parsed.timestamp ? new Date(parsed.timestamp) : new Date();
  const doc = {
    userId: parsed.userId,
    testAttemptId: parsed.testAttemptId,
    examType: parsed.examType,
    eventType: normalizeEventType(parsed.eventType),
    timestamp: ts,
    details: parsed.details || {},
    fingerprint: toFingerprint({
      userId: parsed.userId,
      testAttemptId: parsed.testAttemptId,
      eventType: normalizeEventType(parsed.eventType),
      ts,
      details: parsed.details || {}
    })
  };
  try {
    const created = await CheatingLog.create(doc);
    return created;
  } catch (e) {
    if (e?.code === 11000) return null;
    throw e;
  }
}

export async function createCheatingLogsBulk({ userId, attemptId, events = [] }) {
  if (!mongoose.isValidObjectId(userId)) throw badRequest("Invalid userId", "INVALID_USER_ID");
  if (!mongoose.isValidObjectId(attemptId)) throw badRequest("Invalid testAttemptId", "INVALID_TEST_ATTEMPT_ID");
  if (!Array.isArray(events) || events.length === 0) return { insertedCount: 0 };

  const attempt = await TestAttempt.findById(attemptId).select("_id exam userId").lean();
  if (!attempt) throw badRequest("Attempt not found", "ATTEMPT_NOT_FOUND");
  if (attempt.userId.toString() !== String(userId)) throw badRequest("Attempt does not belong to user", "ATTEMPT_USER_MISMATCH");

  const docs = events.map((evt) => {
    const ts = evt.ts ? new Date(evt.ts) : new Date();
    const normalizedType = normalizeEventType(evt.kind || evt.eventType);
    return {
      userId,
      testAttemptId: attemptId,
      examType: attempt.exam,
      eventType: normalizedType,
      timestamp: ts,
      details: evt.meta || evt.details || {},
      fingerprint: toFingerprint({ userId, testAttemptId: attemptId, eventType: normalizedType, ts, details: evt.meta || evt.details || {} })
    };
  });

  try {
    const inserted = await CheatingLog.insertMany(docs, { ordered: false });
    return { insertedCount: inserted.length };
  } catch (e) {
    if (e?.writeErrors?.length) {
      const duplicateOnly = e.writeErrors.every((we) => we?.code === 11000);
      if (duplicateOnly) return { insertedCount: 0 };
      const nonDupErrors = e.writeErrors.filter((we) => we?.code !== 11000);
      if (nonDupErrors.length === 0) return { insertedCount: docs.length - e.writeErrors.length };
    }
    throw e;
  }
}

export async function listCheatingLogs({ studentId = "", examType = "", from = "", to = "", page = 1, limit = 50 }) {
  const safePage = Math.max(1, Number(page || 1));
  const safeLimit = Math.max(1, Math.min(200, Number(limit || 50)));

  const filter = {};
  if (studentId) {
    if (!mongoose.isValidObjectId(studentId)) throw badRequest("Invalid student id", "INVALID_STUDENT_ID");
    filter.userId = new mongoose.Types.ObjectId(studentId);
  }
  if (examType) filter.examType = examType;
  if (from || to) {
    filter.timestamp = {};
    if (from) filter.timestamp.$gte = new Date(from);
    if (to) filter.timestamp.$lte = new Date(to);
  }

  const skip = (safePage - 1) * safeLimit;
  const [items, total] = await Promise.all([
    CheatingLog.aggregate([
      { $match: filter },
      { $sort: { timestamp: -1, _id: -1 } },
      { $skip: skip },
      { $limit: safeLimit },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "student"
        }
      },
      { $unwind: { path: "$student", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          userId: 1,
          testAttemptId: 1,
          examType: 1,
          eventType: 1,
          timestamp: 1,
          details: 1,
          studentName: { $ifNull: ["$student.name", "Unknown"] }
        }
      }
    ]),
    CheatingLog.countDocuments(filter)
  ]);

  return { items, total, page: safePage, limit: safeLimit };
}

export async function writeCheatingLogsPdf({ logs, stream }) {
  const doc = new PDFDocument({ margin: 40, size: "A4" });
  doc.pipe(stream);

  doc.fontSize(18).text("ExamEdge Cheating Violation Report", { align: "left" });
  doc.moveDown(0.4);
  doc.fontSize(10).fillColor("#555").text(`Date generated: ${new Date().toLocaleString()}`);
  doc.moveDown(1);
  doc.fillColor("#000");

  const cols = [40, 145, 245, 320, 410];
  doc.fontSize(10).text("Student Name", cols[0], doc.y, { width: 100 });
  doc.text("Exam Type", cols[1], doc.y, { width: 95 });
  doc.text("Event Type", cols[2], doc.y, { width: 70 });
  doc.text("Timestamp", cols[3], doc.y, { width: 85 });
  doc.text("Details", cols[4], doc.y, { width: 150 });
  doc.moveDown(0.4);
  doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke();
  doc.moveDown(0.4);

  for (const row of logs) {
    const y = doc.y;
    const detailsText = typeof row.details === "string" ? row.details : JSON.stringify(row.details || {});
    doc.fontSize(9).text(row.studentName || "Unknown", cols[0], y, { width: 100 });
    doc.text(row.examType || "-", cols[1], y, { width: 95 });
    doc.text(row.eventType || "-", cols[2], y, { width: 70 });
    doc.text(new Date(row.timestamp).toLocaleString(), cols[3], y, { width: 85 });
    doc.text(detailsText, cols[4], y, { width: 150 });
    doc.moveDown(1.1);
    if (doc.y > 760) doc.addPage();
  }

  doc.end();
}
