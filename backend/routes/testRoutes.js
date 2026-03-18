import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { getTest, getTests, start, autosave, submit } from "../controllers/testController.js";

export const testRoutes = Router();

testRoutes.get("/", authMiddleware(), getTests);
testRoutes.get("/:id", authMiddleware(), getTest);
testRoutes.post("/start", authMiddleware(), start);
testRoutes.post("/autosave", authMiddleware(), autosave);
testRoutes.post("/submit", authMiddleware(), submit);

