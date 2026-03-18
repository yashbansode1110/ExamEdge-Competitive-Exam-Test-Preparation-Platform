import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { getStudentAnalytics } from "../controllers/analyticsController.js";
import mongoose from "mongoose";
import { User } from "../models/User.js";
import { badRequest, forbidden, notFound } from "../middleware/errorHandler.js";

export const analyticsRoutes = Router();

function canViewStudentAnalytics() {
  return async (req, _res, next) => {
    try {
      const studentId = req.params.id;
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

analyticsRoutes.get("/student/:id", authMiddleware(), canViewStudentAnalytics(), getStudentAnalytics);

