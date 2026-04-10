import mongoose from "mongoose";
import crypto from "crypto";
import { z } from "zod";
import { Question } from "../models/Question.js";
import { badRequest, notFound } from "../middleware/errorHandler.js";

const PUBLIC_SELECT =
  "exam subject chapter topic subtopic type difficulty text latex statement options tags source year isActive createdAt";

const StatementBlockSchema = z.object({
  kind: z.enum(["TEXT", "LATEX"]),
  value: z.string().min(1)
});

const OptionSchema = z.object({
  key: z.string().min(1),
  text: z.string().min(1)
});

const SolutionStepSchema = z.object({
  title: z.string().optional().default(""),
  blocks: z.array(StatementBlockSchema).default([])
});

const SolutionSchema = z.object({
  finalAnswerText: z.string().optional().default(""),
  steps: z.array(SolutionStepSchema).optional().default([])
});

const AdminQuestionCreateSchema = z
  .object({
    exam: z.string().min(1),
    subject: z.string().min(1),
    chapter: z.string().min(1),
    topic: z.string().min(1),
    subtopic: z.string().optional().default(""),

    type: z.enum(["MCQ", "NUMERICAL"]),
    difficulty: z.coerce.number().int().min(1).max(5),

    text: z.string().min(1),
    latex: z.boolean().optional().default(false),
    statement: z.array(StatementBlockSchema).optional(),

    // MCQ-specific fields
    options: z.array(OptionSchema).optional(),
    correctOptionKey: z.string().optional(),

    // NUMERICAL-specific fields
    numericalAnswer: z.coerce.number().optional(),

    solution: SolutionSchema.optional(),
    tags: z.array(z.string().min(1)).optional().default([]),
    source: z.string().optional().default(""),
    year: z.coerce.number().int().optional(),
    isActive: z.boolean().optional().default(true)
  })
  .superRefine((v, ctx) => {
    if (v.type === "MCQ") {
      const keys = (v.options || []).map((o) => o.key);
      if (!v.options || v.options.length < 2) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "MCQ requires `options` with at least 2 items." });
      if (!v.correctOptionKey || !keys.includes(v.correctOptionKey)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "`correctOptionKey` must match one of the option keys." });
      }
    }
    if (v.type === "NUMERICAL") {
      if (v.numericalAnswer == null || !Number.isFinite(Number(v.numericalAnswer))) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "NUMERICAL requires `numericalAnswer` as a number." });
      }
    }
  });

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

function examMatchFilter(exam) {
  const value = String(exam || "").trim();
  if (!value) return undefined;
  if (value.toUpperCase().includes("MHT-CET")) {
    return { $in: ["MHT-CET", "MHT-CET (PCM)", "MHT-CET (PCB)"] };
  }
  if (value.toUpperCase().includes("JEE MAIN")) {
    return { $in: ["JEE Main", "JEE Main (PCM)"] };
  }
  return value;
}

function subjectMatchFilter(subject) {
  const raw = String(subject || "").trim();
  const key = raw.toLowerCase();
  if (key === "mathematics" || key === "math") return /^(mathematics|math)$/i;
  return { $regex: `^${raw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" };
}

function chapterMatchFilter(chapter) {
  const raw = String(chapter || "").trim();
  return { $regex: `^${raw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" };
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
    if (q.exam) filter.exam = examMatchFilter(q.exam);
    if (q.subject) filter.subject = subjectMatchFilter(q.subject);
    if (q.chapter) filter.chapter = chapterMatchFilter(q.chapter);
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
    const created = await createOneAdminQuestion(req.body);

    res.status(201).json({ ok: true, id: created._id.toString() });
  } catch (e) {
    if (e?.code === 11000) return next(badRequest("Duplicate question", "DUPLICATE_QUESTION"));
    next(e);
  }
}

async function createOneAdminQuestion(rawBody) {
  const body = AdminQuestionCreateSchema.parse(rawBody);
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

  return Question.create({
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
}

export async function adminBulkCreateQuestions(req, res, next) {
  try {
    const body = z
      .object({
        questions: z.array(z.unknown()).min(1).max(100)
      })
      .parse(req.body);

    const createdIds = [];
    const failures = [];

    for (let i = 0; i < body.questions.length; i += 1) {
      try {
        const created = await createOneAdminQuestion(body.questions[i]);
        createdIds.push(created._id.toString());
      } catch (err) {
        failures.push({
          index: i,
          message: err?.message || "Failed to create question",
          code: err?.code || err?.statusCode || "CREATE_FAILED"
        });
      }
    }

    res.status(failures.length ? 207 : 201).json({
      ok: failures.length === 0,
      total: body.questions.length,
      createdCount: createdIds.length,
      failedCount: failures.length,
      createdIds,
      failures
    });
  } catch (e) {
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

