import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { generateAIAnalysis } from "../services/aiService.js";
import { AiAnalysis } from "../models/AiAnalysis.js";
import { TestAttempt } from "../models/TestAttempt.js";
export const aiRoute = Router();

aiRoute.post("/analysis", authMiddleware(), async (req, res, next) => {
  try {
    const data = req.body;
    const userId = req.user.id;
    
    // Check if there are any TestAttempts for the user
    const lastAttempt = await TestAttempt.findOne({ userId, status: { $in: ["submitted", "timeout", "expired", "in_progress"] } }).sort({ startedAt: -1 }).select("startedAt meta").lean();

    if (lastAttempt) {
      // Check if an analysis exists for this user that is newer than their last attempt
      const existingAnalysis = await AiAnalysis.findOne({
        userId,
        createdAt: { $gte: lastAttempt.startedAt }
      }).sort({ createdAt: -1 }).lean();

      if (existingAnalysis) {
        return res.json(existingAnalysis);
      }
    }

    const result = await generateAIAnalysis(data);
    
    // Save to DB
    const newAnalysis = await AiAnalysis.create({
      userId,
      testId: data.testId || null,
      summary: result.summary,
      recommendations: result.recommendations,
      studyPlan: result.studyPlan || [],
      strengths: result.strengths || [],
      weaknesses: result.weaknesses || []
    });

    res.json(newAnalysis);
  } catch (err) {
    console.error("AI Generation Route Error: ", err);
    res.status(500).json({ 
      error: true,
      message: err.message
    });
  }
});
