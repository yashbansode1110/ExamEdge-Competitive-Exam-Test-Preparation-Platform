import { z } from "zod";
import { badRequest } from "../middleware/errorHandler.js";
import { generateMcqQuestions } from "../services/openaiQuestionGeneratorService.js";

const GenerateQuestionsRequestSchema = z.object({
  exam: z.string().min(1),
  subject: z.string().min(1),
  topic: z.string().min(1),
  difficulty: z.enum(["Easy", "Medium", "Hard"]),
  count: z.coerce.number().int().min(1).max(30)
});

export async function generateQuestions(req, res, next) {
  try {
    const body = GenerateQuestionsRequestSchema.parse(req.body);

    const out = await generateMcqQuestions({
      exam: body.exam,
      subject: body.subject,
      topic: body.topic,
      difficulty: body.difficulty,
      count: body.count
    });

    res.json({ ok: true, ...out });
  } catch (e) {
    // Make sure we always respond with a predictable error shape.
    if (e instanceof z.ZodError) return next(badRequest(e.message, "VALIDATION_ERROR"));
    next(e);
  }
}

