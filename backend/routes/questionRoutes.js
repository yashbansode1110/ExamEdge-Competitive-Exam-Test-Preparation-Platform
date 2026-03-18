import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { listQuestions, filterQuestions, getByIds } from "../controllers/questionController.js";

export const questionRoutes = Router();

questionRoutes.get("/", authMiddleware(), listQuestions);
questionRoutes.get("/filter", authMiddleware(), filterQuestions);
questionRoutes.post("/byIds", authMiddleware(), getByIds);

