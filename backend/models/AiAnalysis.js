import mongoose from "mongoose";

const AiAnalysisSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    testId: { type: mongoose.Schema.Types.ObjectId, ref: "Test", default: null }, // made it optional
    summary: { type: String },
    recommendations: { type: [String] },
    studyPlan: { type: [String] },
    strengths: { type: [String] },
    weaknesses: { type: [String] }
  },
  { timestamps: true }
);

export const AiAnalysis = mongoose.model("AiAnalysis", AiAnalysisSchema);
