import mongoose from "mongoose";
import crypto from "crypto";
import { z } from "zod";
import { Question } from "../models/Question.js";
import { badRequest, notFound } from "../middleware/errorHandler.js";

const PUBLIC_SELECT =
  "exam subject chapter topic subtopic type difficulty text latex statement options tags source year isActive createdAt";

function computeContentHash({ exam, subject, chapter, topic, type, text, statement, options, correctOptionKey, numericalAnswer, latex }) {
  const effectiveStatement =
    Array.isArray(statement) && statement.length
      ? statement
      : [{ kind: latex ? "LATEX" : "TEXT", value: (text || "").trim() }];
  const normalized = [
    exam,
    subject,
    chapter,
    topic,
    type,
    (text || "").trim().replace(/\s+/g, " "),
    JSON.stringify(effectiveStatement || []),
    JSON.stringify(options || []),
    String(correctOptionKey || ""),
    typeof numericalAnswer === "number" ? String(numericalAnswer) : ""
  ].join("|");
  return crypto.createHash("sha1").update(normalized).digest("hex");
}

export async function listQuestions(req, res, next) {
  try {
    const q = z
      .object({
        exam: z.string().optional(),
        subject: z.string().optional(),
        chapter: z.string().optional(),
        difficulty: z.coerce.number().int().min(1).max(5).optional(),
        page: z.coerce.number().int().min(1).default(1),
        limit: z.coerce.number().int().min(1).max(100).default(20)
      })
      .parse(req.query);

    const filter = { isActive: true };
    if (q.exam) filter.exam = q.exam;
    if (q.subject) filter.subject = q.subject;
    if (q.chapter) filter.chapter = q.chapter;
    if (q.difficulty) filter.difficulty = q.difficulty;

    const skip = (q.page - 1) * q.limit;
    const [items, total] = await Promise.all([
      Question.find(filter).select(PUBLIC_SELECT).sort({ _id: 1 }).skip(skip).limit(q.limit).lean(),
      Question.countDocuments(filter)
    ]);
    res.json({ ok: true, items, page: q.page, limit: q.limit, total });
  } catch (e) {
    next(e);
  }
}

export async function filterQuestions(req, res, next) {
  return listQuestions(req, res, next);
}

export async function getByIds(req, res, next) {
  try {
    const body = z.object({ ids: z.array(z.string().min(1)).min(1).max(400) }).parse(req.body);
    const items = await Question.find({ _id: { $in: body.ids }, isActive: true }).select(PUBLIC_SELECT).lean();
    res.json({ ok: true, items });
  } catch (e) {
    next(e);
  }
}

export async function adminCreateQuestion(req, res, next) {
  try {
    const body = req.body; // validated at route layer (zod there if you extend)
    const contentHash = computeContentHash({
      exam: body.exam,
      subject: body.subject,
      chapter: body.chapter,
      topic: body.topic,
      type: body.type,
      text: body.text,
      statement: body.statement || [],
      options: body.type === "MCQ" ? body.options : [],
      correctOptionKey: body.type === "MCQ" ? body.correctOptionKey : "",
      numericalAnswer: body.type === "NUMERICAL" ? body.numericalAnswer : undefined,
      latex: body.latex
    });

    const dupe = await Question.exists({
      exam: body.exam,
      subject: body.subject,
      chapter: body.chapter,
      topic: body.topic,
      type: body.type,
      contentHash
    });
    if (dupe) throw badRequest("Duplicate question", "DUPLICATE_QUESTION");

    const created = await Question.create({
      exam: body.exam,
      subject: body.subject,
      chapter: body.chapter,
      topic: body.topic,
      subtopic: body.subtopic || "",
      type: body.type,
      difficulty: body.difficulty,
      text: body.text,
      latex: body.latex,
      statement: body.statement || [],
      options: body.type === "MCQ" ? body.options : undefined,
      correctOptionKey: body.type === "MCQ" ? body.correctOptionKey : undefined,
      numericalAnswer: body.type === "NUMERICAL" ? body.numericalAnswer : undefined,
      solution: body.solution ? { finalAnswerText: body.solution.finalAnswerText || "", steps: body.solution.steps || [] } : undefined,
      tags: body.tags || [],
      source: body.source || "",
      year: body.year,
      isActive: body.isActive ?? true
    });

    res.status(201).json({ ok: true, id: created._id.toString() });
  } catch (e) {
    if (e?.code === 11000) return next(badRequest("Duplicate question", "DUPLICATE_QUESTION"));
    next(e);
  }
}

export async function adminUpdateQuestion(req, res, next) {
  try {
    const id = req.params.id;
    if (!mongoose.isValidObjectId(id)) throw badRequest("Invalid question id", "INVALID_ID");
    const q = await Question.findById(id).select("+correctOptionKey +numericalAnswer +solution");
    if (!q) throw notFound("Question not found");

    Object.assign(q, req.body);

    const nextHash = computeContentHash({
      exam: q.exam,
      subject: q.subject,
      chapter: q.chapter,
      topic: q.topic,
      type: q.type,
      text: q.text,
      statement: q.statement || [],
      options: q.type === "MCQ" ? q.options || [] : [],
      correctOptionKey: q.type === "MCQ" ? q.correctOptionKey : "",
      numericalAnswer: q.type === "NUMERICAL" ? q.numericalAnswer : undefined,
      latex: q.latex
    });

    const dupe = await Question.exists({
      _id: { $ne: q._id },
      exam: q.exam,
      subject: q.subject,
      chapter: q.chapter,
      topic: q.topic,
      type: q.type,
      contentHash: nextHash
    });
    if (dupe) throw badRequest("Duplicate question", "DUPLICATE_QUESTION");

    await q.save();
    res.json({ ok: true });
  } catch (e) {
    if (e?.code === 11000) return next(badRequest("Duplicate question", "DUPLICATE_QUESTION"));
    next(e);
  }
}

export async function adminDeleteQuestion(req, res, next) {
  try {
    const id = req.params.id;
    if (!mongoose.isValidObjectId(id)) throw badRequest("Invalid question id", "INVALID_ID");
    const hit = await Question.findByIdAndUpdate(id, { $set: { isActive: false } }, { new: true }).select("_id isActive");
    if (!hit) throw notFound("Question not found");
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
}

