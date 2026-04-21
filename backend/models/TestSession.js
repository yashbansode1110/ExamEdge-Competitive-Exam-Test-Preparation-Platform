import mongoose from "mongoose";

const { Schema } = mongoose;

const SessionAnswerSchema = new Schema(
  {
    questionId: { type: Schema.Types.ObjectId, ref: "Question", required: true },
    selectedOption: { type: Schema.Types.Mixed, default: undefined },
    isCorrect: { type: Boolean, default: false },
    marksAwarded: { type: Number, default: 0 },
    timeTaken: { type: Number, default: 0, min: 0 }
  },
  { _id: false }
);

const TestSessionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    testId: { type: Schema.Types.ObjectId, ref: "Test", required: true, index: true },
    attemptId: { type: Schema.Types.ObjectId, ref: "TestAttempt", required: true, index: true },
    startTime: { type: Date, required: true, default: Date.now, index: true },
    endTime: { type: Date, required: true, index: true },
    answers: { type: [SessionAnswerSchema], default: [] },
    score: { type: Number, default: 0 },
    totalMarks: { type: Number, default: 0 },
    accuracy: { type: Number, default: 0 },
    timeUsed: { type: Number, default: 0, min: 0 },
    status: { type: String, required: true, enum: ["in-progress", "completed"], default: "in-progress", index: true },
    subjectTimers: {
      physics: { type: Number, default: 0, min: 0 },
      chemistry: { type: Number, default: 0, min: 0 },
      math: { type: Number, default: 0, min: 0 },
      biology: { type: Number, default: 0, min: 0 }
    },
    /** Total test duration in seconds (mirrors test.durationMs / 1000 at session start). */
    durationSeconds: { type: Number, default: 0, min: 0 },
    /** Snapshot at creation; live remaining time is derived from attempt.endsAt in bootstrap. */
    remainingTimeSeconds: { type: Number, default: 0, min: 0 },

    // -----------------------------
    // MHT-CET section flow state
    // -----------------------------
    sectionTimers: {
      pc: { type: Number, default: 0, min: 0 },
      physics: { type: Number, default: 0, min: 0 },
      chemistry: { type: Number, default: 0, min: 0 },
      mathematics: { type: Number, default: 0, min: 0 },
      biology: { type: Number, default: 0, min: 0 }
    },
    sectionStatus: {
      pc: { type: String, default: "not-started", enum: ["not-started", "in-progress", "completed"] },
      physics: { type: String, default: "not-started", enum: ["not-started", "in-progress", "completed"] },
      chemistry: { type: String, default: "not-started", enum: ["not-started", "in-progress", "completed"] },
      mathematics: { type: String, default: "locked", enum: ["locked", "not-started", "in-progress", "completed"] },
      biology: { type: String, default: "locked", enum: ["locked", "not-started", "in-progress", "completed"] }
    },
    activeSection: { type: String, default: "", enum: ["", "pc", "physics", "chemistry", "mathematics", "biology"] }
  },
  { timestamps: true }
);

TestSessionSchema.index({ userId: 1, status: 1, createdAt: -1 });
TestSessionSchema.index({ testId: 1, score: -1, createdAt: -1 });

export const TestSession = mongoose.model("TestSession", TestSessionSchema);
