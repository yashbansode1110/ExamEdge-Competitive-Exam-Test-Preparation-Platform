import mongoose from "mongoose";

const { Schema } = mongoose;

const MarkingRuleSchema = new Schema(
  {
    mode: { type: String, required: true, enum: ["UNIFORM_NEGATIVE", "SUBJECT_WEIGHTS", "CUSTOM"] },
    correct: { type: Number, default: 1 },
    wrong: { type: Number, default: 0 },
    unanswered: { type: Number, default: 0 },
    weights: { type: Schema.Types.Mixed, default: {} },
    scorerKey: { type: String, default: "" }
  },
  { _id: false }
);

const SectionSchema = new Schema(
  {
    sectionId: { type: String, required: true },
    name: { type: String, required: true },
    order: { type: Number, required: true, min: 0 },
    durationMs: { type: Number, required: true, min: 60_000 },
    subjects: { type: [String], required: true, default: [] },
    questionCountBySubject: { type: Schema.Types.Mixed, default: {} },
    allowedQuestionTypes: { type: [String], required: true, default: ["MCQ"] },
    hardWindowEnforced: { type: Boolean, default: true },
    /** Optional filters used when building this section’s question pool (admin test generator). */
    chapter: { type: String, default: "" },
    topic: { type: String, default: "" },
    difficulty: { type: Number, min: 1, max: 5, required: false }
  },
  { _id: false }
);

const TestSchema = new Schema(
  {
    exam: { type: String, required: true, index: true },
    name: { type: String, required: true, trim: true },
    version: { type: Number, default: 1, min: 1 },
    isOfficial: { type: Boolean, default: false, index: true },
    totalQuestions: { type: Number, required: true, min: 1, max: 300 },
    durationMs: { type: Number, required: true, min: 60_000 },
    sections: { type: [SectionSchema], required: true, default: [] },
    marking: { type: MarkingRuleSchema, required: true },
    blueprint: {
      subjectQuestionCounts: { type: Schema.Types.Mixed, default: {} },
      difficultyDistribution: { type: Schema.Types.Mixed, default: {} },
      topicFilters: { type: Schema.Types.Mixed, default: {} }
    },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", index: true },
    isActive: { type: Boolean, default: true, index: true }
  },
  { timestamps: true }
);

TestSchema.index({ exam: 1, isOfficial: -1, version: -1, createdAt: -1 });
TestSchema.index({ createdBy: 1, createdAt: -1 }, { sparse: true });

TestSchema.pre("validate", function testValidate() {
  if (!Array.isArray(this.sections) || this.sections.length < 1) throw new Error("tests.sections must have at least one section");
  const ids = new Set();
  let sum = 0;
  for (const s of this.sections) {
    if (ids.has(s.sectionId)) throw new Error("Duplicate sectionId");
    ids.add(s.sectionId);
    sum += s.durationMs;
  }
  if (Math.abs(sum - this.durationMs) > 5000) throw new Error("Sum(sections.durationMs) must equal durationMs");
});

export const Test = mongoose.model("Test", TestSchema);

