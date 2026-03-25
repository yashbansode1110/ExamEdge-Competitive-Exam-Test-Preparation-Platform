import mongoose from "mongoose";
import { z } from "zod";
import { Test } from "../models/Test.js";
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
    hardWindowEnforced: z.boolean().optional().default(true)
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
    hardWindowEnforced: section.hardWindowEnforced
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
          .optional()
      })
      .parse(req.body);

    const sections = body.sections.map(normalizeSection).sort((a, b) => a.order - b.order);
    const subjectCounts = aggregateSubjectQuestionCounts(sections);
    const totalQuestionsComputed = Object.values(subjectCounts).reduce((sum, n) => sum + Number(n || 0), 0);
    if (totalQuestionsComputed < 1) throw badRequest("Test must include question counts", "NO_BLUEPRINT");

    const durationMsComputed = sections.reduce((sum, s) => sum + s.durationMs, 0);
    if (!durationMsComputed || durationMsComputed < 60_000) throw badRequest("Invalid computed test duration", "INVALID_DURATION");

    const marking = body.marking ?? { mode: "UNIFORM_NEGATIVE", correct: 1, wrong: 0, unanswered: 0, weights: {} };
    const blueprint = {
      subjectQuestionCounts: body.blueprint?.subjectQuestionCounts && Object.keys(body.blueprint.subjectQuestionCounts).length ? body.blueprint.subjectQuestionCounts : subjectCounts,
      difficultyDistribution: body.blueprint?.difficultyDistribution ?? {},
      topicFilters: body.blueprint?.topicFilters ?? {}
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
          .optional()
      })
      .parse(req.body);

    const sections = body.sections.map(normalizeSection).sort((a, b) => a.order - b.order);
    const subjectCounts = aggregateSubjectQuestionCounts(sections);
    const totalQuestionsComputed = Object.values(subjectCounts).reduce((sum, n) => sum + Number(n || 0), 0);
    const durationMsComputed = sections.reduce((sum, s) => sum + s.durationMs, 0);
    if (totalQuestionsComputed < 1) throw badRequest("Test must include question counts", "NO_BLUEPRINT");

    const marking = body.marking ?? { mode: "UNIFORM_NEGATIVE", correct: 1, wrong: 0, unanswered: 0, weights: {} };
    const blueprint = {
      subjectQuestionCounts: body.blueprint?.subjectQuestionCounts && Object.keys(body.blueprint.subjectQuestionCounts).length ? body.blueprint.subjectQuestionCounts : subjectCounts,
      difficultyDistribution: body.blueprint?.difficultyDistribution ?? {},
      topicFilters: body.blueprint?.topicFilters ?? {}
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

