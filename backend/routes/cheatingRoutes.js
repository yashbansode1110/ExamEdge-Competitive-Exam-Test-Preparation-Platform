import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { roleMiddleware } from "../middleware/roleMiddleware.js";
import { adminExportCheatingLogsPdf, adminGetCheatingLogs, logCheatingEvent } from "../controllers/cheatingController.js";

export const cheatingRoutes = Router();
export const adminCheatingRoutes = Router();

cheatingRoutes.post("/log", authMiddleware(), logCheatingEvent);

adminCheatingRoutes.get("/", authMiddleware(), roleMiddleware(["admin"]), adminGetCheatingLogs);
adminCheatingRoutes.get("/export", authMiddleware(), roleMiddleware(["admin"]), adminExportCheatingLogsPdf);
