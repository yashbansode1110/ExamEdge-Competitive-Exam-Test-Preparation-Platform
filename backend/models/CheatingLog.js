import mongoose from "mongoose";

const { Schema } = mongoose;

const CheatingLogSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    testAttemptId: { type: Schema.Types.ObjectId, ref: "TestAttempt", required: true, index: true },
    examType: { type: String, required: true, index: true },
    eventType: { type: String, required: true, index: true },
    timestamp: { type: Date, required: true, default: Date.now, index: true },
    details: { type: Schema.Types.Mixed, default: {} },
    fingerprint: { type: String, required: true, unique: true, index: true }
  },
  { timestamps: true }
);

CheatingLogSchema.index({ userId: 1, timestamp: -1 });
CheatingLogSchema.index({ testAttemptId: 1, timestamp: -1 });
CheatingLogSchema.index({ timestamp: -1 });
CheatingLogSchema.index({ examType: 1, timestamp: -1 });
CheatingLogSchema.index({ userId: 1, testAttemptId: 1, eventType: 1, timestamp: -1 });

export const CheatingLog = mongoose.model("CheatingLog", CheatingLogSchema);
