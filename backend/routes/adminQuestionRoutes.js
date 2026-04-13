import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { roleMiddleware } from "../middleware/roleMiddleware.js";
import { uploadMemory } from "../middleware/uploadMemory.js";
import {
  adminBulkCreateQuestions,
  adminBulkUploadQuestions,
  adminCreateQuestion,
  adminDeleteQuestion,
  adminUpdateQuestion
} from "../controllers/questionController.js";

/**
 * All admin question endpoints (single mount point for /admin/questions and /api/admin/questions).
 * Keep /bulk-upload before /:id for clarity (POST paths do not collide with :id).
 */
export const adminQuestionRoutes = Router();

const guard = [authMiddleware(), roleMiddleware(["admin"])];

adminQuestionRoutes.post("/", ...guard, adminCreateQuestion);
adminQuestionRoutes.post("/bulk", ...guard, adminBulkCreateQuestions);
adminQuestionRoutes.post("/bulk-upload", ...guard, uploadMemory.single("file"), adminBulkUploadQuestions);
adminQuestionRoutes.put("/:id", ...guard, adminUpdateQuestion);
adminQuestionRoutes.delete("/:id", ...guard, adminDeleteQuestion);
