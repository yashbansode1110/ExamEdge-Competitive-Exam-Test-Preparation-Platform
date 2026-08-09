import { Router } from "express";
import mongoose from "mongoose";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { getAnalytics } from "../controllers/analyticsController.js";
import { User } from "../models/User.js";
import { badRequest, forbidden, notFound } from "../middleware/errorHandler.js";

function canViewStudentAnalytics(paramName) {
  return async (req, _res, next) => {
    try {
      const studentId = req.params[paramName];
      if (!mongoose.isValidObjectId(studentId)) throw badRequest("Invalid student id", "INVALID_ID");
      if (req.user.id === studentId) return next();
      if (req.user.role === "admin") return next();
      if (req.user.role === "parent") {
        const parent = await User.findById(req.user.id).select("parentOf").lean();
        if (!parent) throw notFound("User not found");
        const ok = (parent.parentOf || []).some((x) => x.toString() === studentId);
        if (!ok) throw forbidden("Not allowed", "NOT_ALLOWED");
        return next();
      }
      throw forbidden("Not allowed", "NOT_ALLOWED");
    } catch (e) {
      next(e);
    }
  };
}

/**
 * Mount at: app.use("/api", analyticsApiRoutes)
 * → GET /api/analytics/:userId
 * → GET /api/analytics/student/:id
 */
export const analyticsApiRoutes = Router();
analyticsApiRoutes.get(
  "/analytics/student/:id",
  authMiddleware(),
  canViewStudentAnalytics("id"),
  getAnalytics
);
analyticsApiRoutes.get(
  "/analytics/:userId",
  authMiddleware(),
  canViewStudentAnalytics("userId"),
  getAnalytics
);

/**
 * Mount at: app.use("/api/analytics", analyticsShallowRoutes) and app.use("/analytics", analyticsShallowRoutes)
 * → GET /api/analytics/:userId, GET /analytics/:userId
 */
export const analyticsShallowRoutes = Router();
analyticsShallowRoutes.get("/student/:id", authMiddleware(), canViewStudentAnalytics("id"), getAnalytics);
analyticsShallowRoutes.get("/:userId", authMiddleware(), canViewStudentAnalytics("userId"), getAnalytics);
