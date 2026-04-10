import mongoose from "mongoose";

const { Schema } = mongoose;

const AnswerSchema = new Schema(
  {
    questionId: { type: Schema.Types.ObjectId, ref: "Question", required: true },
    type: { type: String, required: true, enum: ["MCQ", "NUMERICAL"] },
    selectedOptionKey: { type: String, default: undefined },
    numericalValue: { type: Number, default: undefined },
    markForReview: { type: Boolean, default: false, index: true },
    timeSpentMs: { type: Number, default: 0, min: 0 },
    savedAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

const CheatEventSchema = new Schema(
  {
    kind: { type: String, required: true },
    ts: { type: Date, default: Date.now },
    meta: { type: Schema.Types.Mixed, default: {} }
  },
  { _id: false }
);

const NetworkEventSchema = new Schema(
  {
    kind: { type: String, required: true, enum: ["OFFLINE", "ONLINE", "AUTOSAVE_FAIL", "AUTOSAVE_OK"] },
    ts: { type: Date, default: Date.now },
    meta: { type: Schema.Types.Mixed, default: {} }
  },
  { _id: false }
);

const SectionStateSchema = new Schema(
  {
    sectionId: { type: String, required: true },
    startedAt: { type: Date, required: true },
    endsAt: { type: Date, required: true },
    timeSpentMs: { type: Number, default: 0, min: 0 },
    completed: { type: Boolean, default: false }
  },
  { _id: false }
);

const EvaluatedResponseSchema = new Schema(
  {
    questionId: { type: Schema.Types.ObjectId, ref: "Question", required: true },
    selectedOption: { type: Schema.Types.Mixed, default: undefined },
    isCorrect: { type: Boolean, required: true },
    marksAwarded: { type: Number, required: true },
    timeTaken: { type: Number, default: 0, min: 0 }
  },
  { _id: false }
);

const SectionStatSchema = new Schema(
  {
    sectionName: { type: String, required: true },
    correct: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    accuracy: { type: Number, default: 0 }
  },
  { _id: false }
);

const TestAttemptSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    exam: { type: String, required: true, index: true },
    sessionId: { type: String, required: true, index: true },
    deviceId: { type: String, default: "", index: true },
    testId: { type: Schema.Types.ObjectId, ref: "Test", index: true },
    status: { type: String, required: true, enum: ["in_progress", "submitted", "expired", "timeout", "abandoned"], index: true },
    startedAt: { type: Date, required: true, index: true },
    endsAt: { type: Date, required: true, index: true },
    submittedAt: { type: Date, default: undefined },
    finalizedAt: { type: Date, default: undefined, index: true },
    submitIdempotencyKey: { type: String, default: undefined },
    revision: { type: Number, default: 0, min: 0 },
    questionIds: [{ type: Schema.Types.ObjectId, ref: "Question", required: true }],
    answers: { type: [AnswerSchema], default: [] },
    lastSavedAt: { type: Date, default: undefined },
    cheatEvents: { type: [CheatEventSchema], default: [] },
    networkEvents: { type: [NetworkEventSchema], default: [] },
    sections: { type: [SectionStateSchema], default: [] },
    currentSectionId: { type: String, default: "" },
    responses: { type: [EvaluatedResponseSchema], default: [] },
    score: { type: Number, default: 0 },
    totalMarks: { type: Number, default: 0 },
    accuracy: { type: Number, default: 0 },
    correctCount: { type: Number, default: 0 },
    wrongCount: { type: Number, default: 0 },
    unattemptedCount: { type: Number, default: 0 },
    sectionStats: { type: [SectionStatSchema], default: [] },
    timeUsed: { type: Number, default: 0, min: 0 },
    rank: { type: Number, default: 0, min: 0 },
    breakdown: { type: Schema.Types.Mixed, default: {} }
  },
  { timestamps: true }
);

TestAttemptSchema.index({ userId: 1, status: 1, startedAt: -1 });
TestAttemptSchema.index({ exam: 1, status: 1, score: -1, submittedAt: -1 });
TestAttemptSchema.index({ testId: 1, status: 1, score: -1, submittedAt: -1 }, { sparse: true });
TestAttemptSchema.index({ userId: 1, exam: 1, status: 1 });
TestAttemptSchema.index(
  { submitIdempotencyKey: 1 },
  { unique: true, sparse: true, partialFilterExpression: { submitIdempotencyKey: { $type: "string" } } }
);

TestAttemptSchema.pre("validate", function attemptValidate() {
  if (!this.sessionId || this.sessionId.length < 8) throw new Error("sessionId is required");
  if (["submitted", "expired", "timeout", "abandoned"].includes(this.status) && !this.finalizedAt) {
    this.finalizedAt = this.submittedAt || new Date();
  }
});

export const TestAttempt = mongoose.model("TestAttempt", TestAttemptSchema);

