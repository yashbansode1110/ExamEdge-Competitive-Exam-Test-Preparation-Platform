import mongoose from "mongoose";
import crypto from "crypto";

const { Schema } = mongoose;

const OptionSchema = new Schema(
  {
    key: { type: String, required: true },
    text: { type: String, required: true }
  },
  { _id: false }
);

const ContentBlockSchema = new Schema(
  {
    kind: { type: String, required: true, enum: ["TEXT", "LATEX"] },
    value: { type: String, required: true }
  },
  { _id: false }
);

const SolutionStepSchema = new Schema(
  {
    title: { type: String, default: "" },
    blocks: { type: [ContentBlockSchema], required: true, default: [] }
  },
  { _id: false }
);

const QuestionSchema = new Schema(
  {
    exam: { type: String, required: true, index: true },
    subject: { type: String, required: true, index: true },
    chapter: { type: String, required: true, index: true },
    topic: { type: String, required: true, index: true },
    subtopic: { type: String, default: "", index: true },
    type: { type: String, required: true, enum: ["MCQ", "NUMERICAL"], index: true },
    difficulty: { type: Number, min: 1, max: 5, default: 3, index: true },
    text: { type: String, required: true },
    statement: { type: [ContentBlockSchema], default: [] },
    latex: { type: Boolean, default: false },
    options: { type: [OptionSchema], default: undefined },
    correctOptionKey: { type: String, default: undefined, select: false },
    numericalAnswer: { type: Number, default: undefined, select: false },
    solution: {
      finalAnswerText: { type: String, default: "", select: false },
      steps: { type: [SolutionStepSchema], default: [], select: false }
    },
    tags: { type: [String], default: [], index: true },
    // Tracks where a question came from.
    // New values: "manual" | "ai"
    // Legacy values may exist in existing databases (e.g. "admin-ui" / empty).
    source: { type: String, default: "manual", enum: ["manual", "ai", "admin-ui", "seedDemo", ""] },
    year: { type: Number, default: undefined, index: true },
    isActive: { type: Boolean, default: true, index: true },
    contentHash: { type: String, required: true, index: true }
  },
  { timestamps: true }
);

QuestionSchema.index({ exam: 1, subject: 1, chapter: 1, topic: 1 });
QuestionSchema.index({ exam: 1, subject: 1, difficulty: 1, _id: 1 });
QuestionSchema.index({ exam: 1, difficulty: 1, isActive: 1, _id: 1 });
QuestionSchema.index({ tags: 1, exam: 1, subject: 1 });
QuestionSchema.index({ exam: 1, subject: 1, chapter: 1, topic: 1, type: 1, contentHash: 1 }, { unique: true, name: "uq_question_dedupe" });

QuestionSchema.pre("validate", function questionValidate() {
  if (this.type === "MCQ") {
    if (!Array.isArray(this.options) || this.options.length < 2) throw new Error("MCQ must have at least 2 options");
    if (!this.correctOptionKey) throw new Error("MCQ must have correctOptionKey");
  }
  if (this.type === "NUMERICAL") {
    if (typeof this.numericalAnswer !== "number") throw new Error("NUMERICAL must have numericalAnswer");
    this.options = undefined;
    this.correctOptionKey = undefined;
  }
  if (!this.statement?.length) this.statement = [{ kind: this.latex ? "LATEX" : "TEXT", value: this.text }];

  const normalized = [
    this.exam,
    this.subject,
    this.chapter,
    this.topic,
    this.type,
    (this.text || "").trim().replace(/\s+/g, " "),
    JSON.stringify(this.statement || []),
    JSON.stringify(this.options || []),
    String(this.correctOptionKey || ""),
    typeof this.numericalAnswer === "number" ? String(this.numericalAnswer) : ""
  ].join("|");
  this.contentHash = crypto.createHash("sha1").update(normalized).digest("hex");
});

export const Question = mongoose.model("Question", QuestionSchema);

