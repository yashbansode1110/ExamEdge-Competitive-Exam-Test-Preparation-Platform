import mongoose from "mongoose";
import { z } from "zod";
import { Test } from "../models/Test.js";
import { Question } from "../models/Question.js";
import { badRequest, notFound } from "../middleware/errorHandler.js";

const MarkingSchema = z
  .object({
    mode: z.enum(["UNIFORM_NEGATIVE", "SUBJECT_WEIGHTS", "CUSTOM"]).default("UNIFORM_NEGATIVE"),
    correct: z.number().int().min(0).default(1),
    wrong: z.number().int().min(0).default(0),
    unanswered: z.number().int().min(0).default(0),
    weights: z.record(z.string().min(1), z.unknown()).default({}),
    scorerKey: z.string().optional().default("")
  })
  .passthrough();

const SectionInputSchema = z
  .object({
    sectionId: z.string().min(1),
    name: z.string().min(1),
    order: z.number().int().min(0),

    // Accept either `durationMs` or `durationMinutes`.
    durationMs: z.number().int().min(60_000).optional(),
    durationMinutes: z.number().int().min(1).optional(),

    subjects: z.array(z.string().min(1)).min(1),
    questionCountBySubject: z.record(z.string().min(1), z.coerce.number().int().min(1)).default({}),

    allowedQuestionTypes: z.array(z.enum(["MCQ", "NUMERICAL"])).optional().default(["MCQ"]),
    hardWindowEnforced: z.boolean().optional().default(true),

    /** Optional pool filters (smart test generation). */
    chapter: z.string().optional().default(""),
    topic: z.string().optional().default(""),
    difficulty: z
      .union([z.coerce.number().int().min(1).max(5), z.literal(""), z.null()])
      .optional()
      .transform((v) => (v === "" || v == null ? undefined : v))
  })
  .superRefine((v, ctx) => {
    if (v.durationMs == null && v.durationMinutes == null) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Section duration is required (durationMs or durationMinutes)." });
      return;
    }
    if (v.durationMs != null && v.durationMinutes != null) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Provide either durationMs or durationMinutes, not both." });
    }

    const totalCounts = Object.values(v.questionCountBySubject || {}).reduce((sum, n) => sum + Number(n || 0), 0);
    if (totalCounts <= 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Each section must have questionCountBySubject with at least one positive count." });
    }
  });

function normalizeSection(section) {
  const durationMs = section.durationMs != null ? section.durationMs : section.durationMinutes * 60_000;
  return {
    sectionId: section.sectionId,
    name: section.name,
    order: section.order,
    durationMs,
    subjects: section.subjects,
    questionCountBySubject: section.questionCountBySubject || {},
    allowedQuestionTypes: section.allowedQuestionTypes || ["MCQ"],
    hardWindowEnforced: section.hardWindowEnforced,
    chapter: section.chapter ? String(section.chapter).trim() : "",
    topic: section.topic ? String(section.topic).trim() : "",
    difficulty: section.difficulty != null ? section.difficulty : undefined
  };
}

function aggregateSubjectQuestionCounts(sections) {
  const out = {};
  for (const s of sections) {
    for (const [subject, count] of Object.entries(s.questionCountBySubject || {})) {
      out[subject] = (out[subject] || 0) + Number(count || 0);
    }
  }
  return out;
}

function normalizeSubjectKey(subject) {
  const raw = String(subject || "").trim();
  const key = raw.toLowerCase();
  if (key === "math" || key === "mathematics") return "mathematics";
  return key;
}

function subjectRegex(subject) {
  const key = normalizeSubjectKey(subject);
  if (key === "mathematics") return /^(mathematics|math)$/i;
  return new RegExp(`^${String(subject || "").trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");
}

function buildExamMatchFilter(exam) {
  const value = String(exam || "").trim();
  if (value.toUpperCase().includes("MHT-CET")) {
    return { $in: ["MHT-CET", "MHT-CET (PCM)", "MHT-CET (PCB)"] };
  }
  if (value.toUpperCase().includes("JEE MAIN")) {
    return { $in: ["JEE Main", "JEE Main (PCM)"] };
  }
  return { $regex: `^${value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" };
}

function regexExactCI(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  return { $regex: `^${raw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" };
}

async function sampleQuestionIdsForSection({
  exam,
  subject,
  count,
  chapter,
  topic,
  difficulty,
  difficultyBalance,
  allowedTypes = ["MCQ"]
}) {
  const countN = Number(count || 0);
  if (countN <= 0) return [];

  const examFilter = buildExamMatchFilter(exam);
  const matchBase = {
    isActive: true,
    exam: examFilter,
    subject: subjectRegex(subject),
    type: allowedTypes.length === 1 ? allowedTypes[0] : { $in: allowedTypes }
  };

  const ch = regexExactCI(chapter);
  if (ch) matchBase.chapter = ch;
  const tp = regexExactCI(topic);
  if (tp) matchBase.topic = tp;

  const useBalance = difficultyBalance && difficulty == null;

  if (!useBalance) {
    const m = { ...matchBase };
    if (difficulty != null) m.difficulty = difficulty;
    const avail = await Question.countDocuments(m);
    if (avail < countN) {
      throw badRequest(`Not enough questions for ${subject}${chapter ? ` / ${chapter}` : ""}`, "INSUFFICIENT_QUESTIONS");
    }
    const rows = await Question.aggregate([{ $match: m }, { $sample: { size: countN } }, { $project: { _id: 1 } }]);
    if (rows.length < countN) {
      throw badRequest(`Not enough questions for ${subject}`, "INSUFFICIENT_QUESTIONS");
    }
    return rows.map((r) => r._id.toString());
  }

  const picked = [];
  const pickedSet = new Set();
  const per = Math.floor(countN / 5);
  let rem = countN % 5;

  for (let i = 0; i < 5; i += 1) {
    const need = per + (i < rem ? 1 : 0);
    if (need <= 0) continue;
    const d = i + 1;
    const m = { ...matchBase, difficulty: d };
    const rows = await Question.aggregate([{ $match: m }, { $sample: { size: need } }, { $project: { _id: 1 } }]);
    for (const r of rows) {
      const id = r._id.toString();
      if (!pickedSet.has(id)) {
        picked.push(id);
        pickedSet.add(id);
      }
    }
  }

  let shortfall = countN - picked.length;
  if (shortfall > 0) {
    const nin = picked.map((id) => new mongoose.Types.ObjectId(id));
    const m = { ...matchBase, _id: { $nin: nin } };
    const avail = await Question.countDocuments(m);
    const take = Math.min(shortfall, avail);
    if (take > 0) {
      const rows = await Question.aggregate([{ $match: m }, { $sample: { size: take } }, { $project: { _id: 1 } }]);
      for (const r of rows) {
        const id = r._id.toString();
        if (!pickedSet.has(id)) {
          picked.push(id);
          pickedSet.add(id);
        }
      }
    }
    shortfall = countN - picked.length;
  }

  if (picked.length < countN) {
    throw badRequest(`Not enough questions for balanced difficulty pick (${subject})`, "INSUFFICIENT_QUESTIONS");
  }

  return picked.slice(0, countN);
}

/**
 * Picks questions per section (preserves section-scoped chapter/topic/difficulty filters).
 */
async function validateAndPickQuestions({ exam, sections, difficultyBalance }) {
  const selectedIdsBySubject = {};
  const selectedQuestionIds = [];

  for (const section of sections) {
    const counts = section.questionCountBySubject || {};
    const types = section.allowedQuestionTypes || ["MCQ"];
    for (const [subject, countRaw] of Object.entries(counts)) {
      const count = Number(countRaw || 0);
      if (count <= 0) continue;

      const useBalance = !!difficultyBalance && section.difficulty == null;
      const ids = await sampleQuestionIdsForSection({
        exam,
        subject,
        count,
        chapter: section.chapter,
        topic: section.topic,
        difficulty: section.difficulty,
        difficultyBalance: useBalance,
        allowedTypes: types
      });

      if (!selectedIdsBySubject[subject]) selectedIdsBySubject[subject] = [];
      selectedIdsBySubject[subject].push(...ids);
      selectedQuestionIds.push(...ids);
    }
  }

  return { selectedQuestionIds, selectedIdsBySubject };
}

export async function adminCreateTest(req, res, next) {
  try {
    const body = z
      .object({
        exam: z.string().min(1),
        name: z.string().min(1),
        version: z.number().int().min(1).optional().default(1),
        isOfficial: z.boolean().optional().default(false),
        isActive: z.boolean().optional().default(true),
        totalQuestions: z.number().int().min(1).optional(),

        // Accept either `durationMs` or `durationMinutes`, but we ultimately compute duration from sections.
        durationMs: z.number().int().min(60_000).optional(),
        durationMinutes: z.number().int().min(1).optional(),

        sections: z.array(SectionInputSchema).min(1),
        marking: MarkingSchema.optional().default(undefined),
        blueprint: z
          .object({
            subjectQuestionCounts: z.record(z.string().min(1), z.coerce.number().int().min(1)).optional(),
            difficultyDistribution: z.record(z.string().min(1), z.unknown()).optional(),
            topicFilters: z.record(z.string().min(1), z.unknown()).optional()
          })
          .optional(),

        /** When true, samples roughly equal counts from difficulties 1–5 per subject bucket (section must not pin difficulty). */
        difficultyBalance: z.boolean().optional().default(false)
      })
      .parse(req.body);

    const sections = body.sections.map(normalizeSection).sort((a, b) => a.order - b.order);
    const subjectCounts = aggregateSubjectQuestionCounts(sections);
    const totalQuestionsComputed = Object.values(subjectCounts).reduce((sum, n) => sum + Number(n || 0), 0);
    if (totalQuestionsComputed < 1) throw badRequest("Test must include question counts", "NO_BLUEPRINT");

    const durationMsComputed = sections.reduce((sum, s) => sum + s.durationMs, 0);
    if (!durationMsComputed || durationMsComputed < 60_000) throw badRequest("Invalid computed test duration", "INVALID_DURATION");

    const marking = body.marking ?? { mode: "UNIFORM_NEGATIVE", correct: 1, wrong: 0, unanswered: 0, weights: {} };
    const autoSelection = await validateAndPickQuestions({
      exam: body.exam,
      sections,
      difficultyBalance: body.difficultyBalance
    });
    const blueprint = {
      subjectQuestionCounts: body.blueprint?.subjectQuestionCounts && Object.keys(body.blueprint.subjectQuestionCounts).length ? body.blueprint.subjectQuestionCounts : subjectCounts,
      difficultyDistribution: body.blueprint?.difficultyDistribution ?? {},
      topicFilters: {
        ...(body.blueprint?.topicFilters ?? {}),
        __preselectedQuestionIds: autoSelection.selectedQuestionIds,
        __preselectedQuestionIdsBySubject: autoSelection.selectedIdsBySubject
      }
    };

    const test = await Test.create({
      exam: body.exam,
      name: body.name,
      version: body.version,
      isOfficial: body.isOfficial,
      isActive: body.isActive,
      totalQuestions: body.totalQuestions ?? totalQuestionsComputed,
      durationMs: durationMsComputed,
      sections,
      marking,
      blueprint,
      createdBy: mongoose.Types.ObjectId.isValid(req.user.id) ? req.user.id : undefined
    });

    res.status(201).json({ ok: true, id: test._id.toString() });
  } catch (e) {
    next(e);
  }
}

export async function adminUpdateTest(req, res, next) {
  try {
    const id = req.params.id;
    if (!mongoose.isValidObjectId(id)) throw badRequest("Invalid test id", "INVALID_ID");

    const body = z
      .object({
        exam: z.string().min(1),
        name: z.string().min(1),
        version: z.number().int().min(1).optional(),
        isOfficial: z.boolean().optional(),
        isActive: z.boolean().optional(),
        sections: z.array(SectionInputSchema).min(1),
        marking: MarkingSchema.optional(),
        blueprint: z
          .object({
            subjectQuestionCounts: z.record(z.string().min(1), z.coerce.number().int().min(1)).optional(),
            difficultyDistribution: z.record(z.string().min(1), z.unknown()).optional(),
            topicFilters: z.record(z.string().min(1), z.unknown()).optional()
          })
          .optional(),

        difficultyBalance: z.boolean().optional().default(false)
      })
      .parse(req.body);

    const sections = body.sections.map(normalizeSection).sort((a, b) => a.order - b.order);
    const subjectCounts = aggregateSubjectQuestionCounts(sections);
    const totalQuestionsComputed = Object.values(subjectCounts).reduce((sum, n) => sum + Number(n || 0), 0);
    const durationMsComputed = sections.reduce((sum, s) => sum + s.durationMs, 0);
    if (totalQuestionsComputed < 1) throw badRequest("Test must include question counts", "NO_BLUEPRINT");

    const marking = body.marking ?? { mode: "UNIFORM_NEGATIVE", correct: 1, wrong: 0, unanswered: 0, weights: {} };
    const autoSelection = await validateAndPickQuestions({
      exam: body.exam,
      sections,
      difficultyBalance: body.difficultyBalance
    });
    const blueprint = {
      subjectQuestionCounts: body.blueprint?.subjectQuestionCounts && Object.keys(body.blueprint.subjectQuestionCounts).length ? body.blueprint.subjectQuestionCounts : subjectCounts,
      difficultyDistribution: body.blueprint?.difficultyDistribution ?? {},
      topicFilters: {
        ...(body.blueprint?.topicFilters ?? {}),
        __preselectedQuestionIds: autoSelection.selectedQuestionIds,
        __preselectedQuestionIdsBySubject: autoSelection.selectedIdsBySubject
      }
    };

    const hit = await Test.findByIdAndUpdate(
      id,
      {
        $set: {
          exam: body.exam,
          name: body.name,
          version: body.version,
          isOfficial: body.isOfficial,
          isActive: body.isActive,
          totalQuestions: totalQuestionsComputed,
          durationMs: durationMsComputed,
          sections,
          marking,
          blueprint
        }
      },
      { new: true }
    );

    if (!hit) throw notFound("Test not found");
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
}

export async function adminDeleteTest(req, res, next) {
  try {
    const id = req.params.id;
    if (!mongoose.isValidObjectId(id)) throw badRequest("Invalid test id", "INVALID_ID");

    const hit = await Test.findByIdAndUpdate(id, { $set: { isActive: false } }, { new: true }).select("_id isActive");
    if (!hit) throw notFound("Test not found");

    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
}

