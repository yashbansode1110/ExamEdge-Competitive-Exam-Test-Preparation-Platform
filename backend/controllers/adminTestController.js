import mongoose from "mongoose";
import { z } from "zod";
import crypto from "crypto";
import { Test } from "../models/Test.js";
import { Question } from "../models/Question.js";
import { TestAttempt } from "../models/TestAttempt.js";
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
  if (value.toUpperCase().includes("MHT-CET") || value.toUpperCase().replace(/\s|-/g,"") === "MHTCET") {
    return { $in: ["MHT-CET", "MHT-CET (PCM)", "MHT-CET (PCB)"] };
  }
  if (value.toUpperCase().includes("JEE MAIN") || value.toUpperCase() === "JEE") {
    return { $in: ["JEE Main", "JEE Main (PCM)", "JEE"] };
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
  poolId,
  usedQuestionIds = [],
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
  
  if (poolId && poolId !== "default") matchBase.poolId = poolId;
  if (usedQuestionIds.length > 0) matchBase._id = { $nin: usedQuestionIds };

  const ch = regexExactCI(chapter);
  if (ch) matchBase.chapter = ch;
  const tp = regexExactCI(topic);
  if (tp) matchBase.topic = tp;

  async function fetchWithFallbacks(query, limitCount) {
    let res = await Question.find(query).select("_id").sort({ usageCount: 1, lastUsedAt: 1 }).limit(limitCount * 2).lean();
    if (res.length >= limitCount) return res;

    if (query.difficulty) {
      const q2 = { ...query }; delete q2.difficulty;
      res = await Question.find(q2).select("_id").sort({ usageCount: 1, lastUsedAt: 1 }).limit(limitCount * 2).lean();
      if (res.length >= limitCount) return res;
    }

    if (query._id) {
      const q4 = { ...query }; delete q4.difficulty; delete q4._id;
      res = await Question.find(q4).select("_id").sort({ usageCount: 1, lastUsedAt: 1 }).limit(limitCount * 2).lean();
    }
    return res;
  }

  const useBalance = difficultyBalance && difficulty == null;

  if (!useBalance) {
    const m = { ...matchBase };
    if (difficulty != null) m.difficulty = difficulty;
    
    let rows = await fetchWithFallbacks(m, countN);
    if (rows.length < countN) {
      const errorMsg = topic || chapter ? "Not enough questions for selected topic" : `Not enough questions for ${subject}`;
      throw badRequest(errorMsg, "INSUFFICIENT_QUESTIONS");
    }
    const ids = rows.map((r) => r._id.toString());
    return ids.sort(() => 0.5 - Math.random()).slice(0, countN);
  }

  const picked = [];
  const pickedSet = new Set();
  
  const weights = [0.15, 0.15, 0.40, 0.15, 0.15];
  const dCounts = weights.map(w => Math.floor(countN * w));
  let remaining = countN - dCounts.reduce((a, b) => a + b, 0);
  
  while (remaining > 0) {
    dCounts[this.remIdx = (this.remIdx ?? 2)] += 1;
    this.remIdx = this.remIdx === 2 ? 3 : this.remIdx === 3 ? 1 : this.remIdx === 1 ? 4 : 2;
    remaining -= 1;
  }

  for (let i = 0; i < 5; i += 1) {
    const need = dCounts[i];
    if (need <= 0) continue;
    const d = i + 1;
    const m = { ...matchBase, difficulty: d };
    
    const rows = await fetchWithFallbacks(m, need);
    const shuffled = rows.sort(() => 0.5 - Math.random()).slice(0, need);
    for (const r of shuffled) {
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
    const m = { ...matchBase, _id: { $nin: usedQuestionIds.concat(nin) } };
    const rows = await fetchWithFallbacks(m, shortfall);
    const shuffled = rows.sort(() => 0.5 - Math.random()).slice(0, shortfall);
    for (const r of shuffled) {
      const id = r._id.toString();
      if (!pickedSet.has(id)) {
        picked.push(id);
        pickedSet.add(id);
      }
    }
  }

  if (picked.length < countN) {
    const errorMsg = topic || chapter ? "Not enough questions for selected topic" : `Not enough questions for balanced difficulty pick (${subject})`;
    throw badRequest(errorMsg, "INSUFFICIENT_QUESTIONS");
  }

  return picked.sort(() => 0.5 - Math.random()).slice(0, countN);
}

/**
 * Picks questions per section (preserves section-scoped chapter/topic/difficulty filters).
 */
async function validateAndPickQuestions({ exam, sections, difficultyBalance, poolId, usedQuestionIds }) {
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
        poolId,
        usedQuestionIds,
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
        difficultyBalance: z.boolean().optional().default(false),
        poolId: z.string().optional(),
        userId: z.string().optional()
      })
      .parse(req.body);

    const sections = body.sections.map(normalizeSection).sort((a, b) => a.order - b.order);
    const subjectCounts = aggregateSubjectQuestionCounts(sections);
    const totalQuestionsComputed = Object.values(subjectCounts).reduce((sum, n) => sum + Number(n || 0), 0);
    if (totalQuestionsComputed < 1) throw badRequest("Test must include question counts", "NO_BLUEPRINT");

    const durationMsComputed = sections.reduce((sum, s) => sum + s.durationMs, 0);
    if (!durationMsComputed || durationMsComputed < 60_000) throw badRequest("Invalid computed test duration", "INVALID_DURATION");

    // Fetch user exclusions natively
    let usedQuestionIds = [];
    if (body.userId) {
      const attempts = await TestAttempt.find({ userId: body.userId }).select('questionIds').lean();
      usedQuestionIds = attempts.flatMap(a => a.questionIds || []);
    }

    const marking = body.marking ?? { mode: "UNIFORM_NEGATIVE", correct: 1, wrong: 0, unanswered: 0, weights: {} };
    const autoSelection = await validateAndPickQuestions({
      exam: body.exam,
      sections,
      difficultyBalance: body.difficultyBalance,
      poolId: body.poolId,
      usedQuestionIds
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

    if (autoSelection?.selectedQuestionIds?.length) {
      await Question.updateMany(
        { _id: { $in: autoSelection.selectedQuestionIds } },
        { $inc: { usageCount: 1 }, $set: { lastUsedAt: new Date() } }
      );
    }

    // Attempt creation natively tracks the user
    if (body.userId) {
       await TestAttempt.create({
         userId: body.userId,
         exam: body.exam,
         sessionId: crypto.randomUUID().slice(0, 8),
         status: "in_progress",
         startedAt: new Date(),
         endsAt: new Date(Date.now() + durationMsComputed),
         testId: test._id,
         questionIds: autoSelection.selectedQuestionIds
       });
    }

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

    if (autoSelection?.selectedQuestionIds?.length) {
      await Question.updateMany(
        { _id: { $in: autoSelection.selectedQuestionIds } },
        { $inc: { usageCount: 1 }, $set: { lastUsedAt: new Date() } }
      );
    }

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

