import OpenAI from "openai";
import { z } from "zod";
import { badRequest } from "../middleware/errorHandler.js";

// IMPORTANT:
// Do not create OpenAI client at module import-time.
// If OPENAI_API_KEY is missing, it would crash the whole backend on startup,
// breaking manual question creation and all other routes.
let openaiClient = null;

const OpenAiMcqQuestionSchema = z.object({
  question: z.string().min(1),
  options: z.array(z.string().min(1)).length(4),
  // Must match exactly one of the option letters.
  correctAnswer: z.enum(["A", "B", "C", "D"])
});

const OpenAiMcqQuestionsResponseSchema = z
  .array(OpenAiMcqQuestionSchema)
  .refine((arr) => arr.length >= 1, { message: "At least 1 question is required" });

function difficultyLabelToNumber(difficulty) {
  if (difficulty === "Easy") return 2;
  if (difficulty === "Medium") return 3;
  return 5; // Hard
}

function extractFirstJsonArray(text) {
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start < 0 || end <= start) throw new Error("AI response did not contain a JSON array");
  const candidate = text.slice(start, end + 1);
  return JSON.parse(candidate);
}

export async function generateMcqQuestions({ subject, topic, difficulty, count }) {
  if (!process.env.OPENAI_API_KEY) throw badRequest("Missing OPENAI_API_KEY", "OPENAI_NOT_CONFIGURED");

  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  const difficultyNumber = difficultyLabelToNumber(difficulty);

  const system = [
    "You are an expert competitive-exam MCQ generator.",
    "Generate exam-style, unambiguous multiple-choice questions.",
    "Return JSON only. No markdown, no commentary."
  ].join("\n");

  const user = [
    `Generate ${count} MCQ questions for subject: ${subject}.`,
    `Topic: ${topic}`,
    `Difficulty: ${difficulty} (numericDifficulty: ${difficultyNumber})`,
    "Rules:",
    "- Return STRICT JSON array in this exact shape:",
    "[{ \"question\": \"...\", \"options\": [\"...\",\"...\",\"...\",\"...\"], \"correctAnswer\": \"A|B|C|D\" }]",
    "- options must contain exactly 4 strings in the order A,B,C,D.",
    "- correctAnswer must be one of: A,B,C,D and must correspond to the correct option text.",
    "- Ensure each question is distinct.",
    "- Do not include explanations; only question text + options + correctAnswer."
  ].join("\n");

  let content;
  try {
    const completion = await openaiClient.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user }
      ],
      temperature: 0.6
    });
    content = completion?.choices?.[0]?.message?.content || "";
  } catch (e) {
    // Surface the underlying OpenAI error message (does not include secrets).
    const msg =
      e?.error?.message ||
      e?.response?.data?.error?.message ||
      e?.response?.data?.message ||
      e?.message ||
      (typeof e === "string" ? e : undefined) ||
      String(e) ||
      "OpenAI generation failed";
    throw badRequest(msg, "OPENAI_GENERATION_FAILED");
  }

  let parsed;
  try {
    parsed = extractFirstJsonArray(content);
  } catch (_e) {
    throw badRequest("AI returned invalid JSON", "AI_INVALID_JSON");
  }

  const validated = OpenAiMcqQuestionsResponseSchema.safeParse(parsed);
  if (!validated.success) {
    throw badRequest("AI returned questions in unexpected format", "AI_INVALID_FORMAT");
  }

  if (validated.data.length !== count) {
    throw badRequest(`AI returned ${validated.data.length} questions, expected ${count}`, "AI_COUNT_MISMATCH");
  }

  // Normalize shape for the frontend.
  return {
    difficultyNumber,
    questions: validated.data.map((q) => ({
      question: q.question,
      options: q.options,
      correctAnswer: q.correctAnswer
    }))
  };
}

