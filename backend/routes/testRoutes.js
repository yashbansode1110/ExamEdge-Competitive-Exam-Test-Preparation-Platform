import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { getTest, getTests, start, autosave, submit, submitByTestId, getResult } from "../controllers/testController.js";

export const testRoutes = Router();

testRoutes.get("/", authMiddleware(), getTests);
testRoutes.post("/start", authMiddleware(), start);
testRoutes.post("/autosave", authMiddleware(), autosave);
testRoutes.post("/submit", authMiddleware(), submit);
testRoutes.post("/:testId/submit", authMiddleware(), submitByTestId);
testRoutes.get("/attempts/:attemptId/result", authMiddleware(), getResult);
testRoutes.get("/:id", authMiddleware(), getTest);

