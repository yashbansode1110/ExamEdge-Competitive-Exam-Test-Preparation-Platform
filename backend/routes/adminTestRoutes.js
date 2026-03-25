import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { roleMiddleware } from "../middleware/roleMiddleware.js";
import { adminCreateTest, adminDeleteTest, adminUpdateTest } from "../controllers/adminTestController.js";

export const adminTestRoutes = Router();

adminTestRoutes.post("/", authMiddleware(), roleMiddleware(["admin"]), adminCreateTest);
adminTestRoutes.put("/:id", authMiddleware(), roleMiddleware(["admin"]), adminUpdateTest);
adminTestRoutes.delete("/:id", authMiddleware(), roleMiddleware(["admin"]), adminDeleteTest);

