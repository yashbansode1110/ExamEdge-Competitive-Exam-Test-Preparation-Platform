import mongoose from "mongoose";

const { Schema } = mongoose;

const RefreshTokenSchema = new Schema(
  {
    tokenHash: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true }
  },
  { _id: false }
);

const WeakTopicSchema = new Schema(
  {
    exam: { type: String, required: true, index: true },
    subject: { type: String, required: true, index: true },
    topic: { type: String, required: true, index: true },
    score: { type: Number, required: true, min: 0, max: 1 },
    lastUpdatedAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

const PracticeHistorySchema = new Schema(
  {
    kind: { type: String, required: true, enum: ["PRACTICE_SET", "TEST_ATTEMPT", "QUESTION"], index: true },
    refId: { type: Schema.Types.ObjectId, required: false, index: true },
    exam: { type: String, required: true, index: true },
    subject: { type: String, required: false, index: true },
    topic: { type: String, required: false, index: true },
    startedAt: { type: Date, required: true },
    endedAt: { type: Date, required: false },
    durationMs: { type: Number, required: false, min: 0 },
    correct: { type: Boolean, required: false },
    meta: { type: Schema.Types.Mixed, default: {} }
  },
  { _id: false }
);

const StudentProfileSchema = new Schema(
  {
    targetExam: { type: String, required: true, index: true },
    class: { type: String, required: true, enum: ["9", "10", "11", "12", "dropper"] },
    streak: { type: Number, default: 0, min: 0, index: true },
    xpPoints: { type: Number, default: 0, min: 0, index: true },
    weakTopics: { type: [WeakTopicSchema], default: [] },
    practiceHistory: { type: [PracticeHistorySchema], default: [] }
  },
  { _id: false }
);

const UserSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, index: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    name: { type: String, required: true, trim: true },
    role: { type: String, required: true, enum: ["student", "parent", "admin"], index: true },
    parentOf: [{ type: Schema.Types.ObjectId, ref: "User", index: true }],
    childOf: { type: Schema.Types.ObjectId, ref: "User", index: true },
    banned: { type: Boolean, default: false, index: true },
    refreshTokens: { type: [RefreshTokenSchema], default: [] },
    student: { type: StudentProfileSchema, default: undefined },
    failedLoginCount: { type: Number, default: 0, min: 0 },
    lockUntil: { type: Date, default: undefined, index: true }
  },
  { timestamps: true }
);

UserSchema.index({ role: 1, createdAt: -1 });
UserSchema.index({ "student.targetExam": 1, "student.xpPoints": -1, createdAt: -1 }, { sparse: true });

UserSchema.pre("validate", function userValidate() {
  if (this.role === "student") {
    if (this.student && (!this.student?.targetExam || !this.student?.class)) {
      throw new Error("student.targetExam and student.class are required for role=student");
    }
  } else {
    this.student = undefined;
  }
});

export const User = mongoose.model("User", UserSchema);

