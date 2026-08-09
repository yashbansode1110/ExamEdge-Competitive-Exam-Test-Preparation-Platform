import mongoose from "mongoose";
import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { generateAIAnalysis } from "../services/aiService.js";
import { AiAnalysis } from "../models/AiAnalysis.js";
import { TestAttempt } from "../models/TestAttempt.js";

export const aiRoute = Router();

function mergeClientAnalyticsPayload(doc, data) {
  const base = doc && typeof doc.toObject === "function" ? doc.toObject() : { ...doc };
  return {
    ...base,
    predictedPerformance: data?.predictedPerformance ?? base.predictedPerformance,
    confidenceLevel: data?.confidenceLevel ?? base.confidenceLevel,
    timeManagement:
      typeof data?.timeManagement === "string"
        ? data.timeManagement
        : data?.timeManagement?.summary ?? base.timeManagement,
  };
}

aiRoute.post("/analysis", authMiddleware(), async (req, res, next) => {
  try {
    const data = req.body;
    const userId = req.user.id;
    const userOid = new mongoose.Types.ObjectId(userId);

    const lastAttempt = await TestAttempt.findOne({
      userId: userOid,
      status: { $in: ["submitted", "timeout", "expired"] }
    })
      .sort({ finalizedAt: -1, submittedAt: -1 })
      .select("finalizedAt submittedAt startedAt")
      .lean();

    if (lastAttempt) {
      const lastMarker = lastAttempt.finalizedAt || lastAttempt.submittedAt || lastAttempt.startedAt;
      const existingAnalysis = await AiAnalysis.findOne({
        userId: userOid,
        createdAt: { $gte: lastMarker }
      })
        .sort({ createdAt: -1 })
        .lean();

      if (existingAnalysis) {
        return res.json(mergeClientAnalyticsPayload(existingAnalysis, data));
      }
    }

    const result = await generateAIAnalysis(data);

    const newAnalysis = await AiAnalysis.create({
      userId: userOid,
      testId: data.testId || null,
      summary: result.summary,
      recommendations: result.recommendations,
      studyPlan: result.studyPlan || [],
      strengths: result.strengths || [],
      weaknesses: result.weaknesses || []
    });

    res.json(mergeClientAnalyticsPayload(newAnalysis, result));
  } catch (err) {
    console.error("AI Generation Route Error: ", err);
    res.status(500).json({
      error: true,
      message: err.message
    });
  }
});
