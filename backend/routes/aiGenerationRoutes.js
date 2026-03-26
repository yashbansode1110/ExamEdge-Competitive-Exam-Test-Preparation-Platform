import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { roleMiddleware } from "../middleware/roleMiddleware.js";
import { generateQuestions } from "../controllers/aiQuestionController.js";

export const aiGenerationRoutes = Router();

// POST /api/generate-questions
aiGenerationRoutes.post("/generate-questions", authMiddleware(), roleMiddleware(["admin"]), generateQuestions);

