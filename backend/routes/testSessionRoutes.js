import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import {
  completeSession,
  getSessionBootstrap,
  getUserTestSessions,
  saveSessionTimers,
  startSession
} from "../controllers/testSessionController.js";

export const testSessionRoutes = Router();

testSessionRoutes.post("/start", authMiddleware(), startSession);
testSessionRoutes.get("/user/:userId", authMiddleware(), getUserTestSessions);
testSessionRoutes.get("/:testSessionId", authMiddleware(), getSessionBootstrap);
testSessionRoutes.post("/:testSessionId/timers", authMiddleware(), saveSessionTimers);
testSessionRoutes.post("/:testSessionId/submit", authMiddleware(), completeSession);
