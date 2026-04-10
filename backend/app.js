import express from "express";
import helmet from "helmet";
import cors from "cors";
import compression from "compression";
import morgan from "morgan";
import hpp from "hpp";

import { apiLimiter } from "./middleware/rateLimiter.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { authRoutes } from "./routes/authRoutes.js";
import { questionRoutes } from "./routes/questionRoutes.js";
import { aiGenerationRoutes } from "./routes/aiGenerationRoutes.js";
import { testRoutes } from "./routes/testRoutes.js";
import { analyticsRoutes } from "./routes/analyticsRoutes.js";
import { adminTestRoutes } from "./routes/adminTestRoutes.js";
import { adminCheatingRoutes, cheatingRoutes } from "./routes/cheatingRoutes.js";
import { testSessionRoutes } from "./routes/testSessionRoutes.js";
import { authMiddleware } from "./middleware/authMiddleware.js";
import { roleMiddleware } from "./middleware/roleMiddleware.js";
import { adminBulkCreateQuestions, adminCreateQuestion, adminDeleteQuestion, adminUpdateQuestion } from "./controllers/questionController.js";

export const app = express();

app.disable("x-powered-by");

app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(",") : true,
    credentials: true
  })
);
app.use(compression());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false }));
app.use(hpp());
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
app.use("/api", apiLimiter);

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "backend", ts: new Date().toISOString() });
});

// Public base routes (as required)
app.use("/auth", authRoutes);
app.use("/questions", questionRoutes);
app.post("/admin/questions", authMiddleware(), roleMiddleware(["admin"]), adminCreateQuestion);
app.post("/admin/questions/bulk", authMiddleware(), roleMiddleware(["admin"]), adminBulkCreateQuestions);
app.put("/admin/questions/:id", authMiddleware(), roleMiddleware(["admin"]), adminUpdateQuestion);
app.delete("/admin/questions/:id", authMiddleware(), roleMiddleware(["admin"]), adminDeleteQuestion);
app.use("/tests", testRoutes);
app.use("/analytics", analyticsRoutes);

// Also expose under /api for compatibility
app.use("/api/auth", authRoutes);
app.use("/api/questions", questionRoutes);
app.post("/api/admin/questions", authMiddleware(), roleMiddleware(["admin"]), adminCreateQuestion);
app.post("/api/admin/questions/bulk", authMiddleware(), roleMiddleware(["admin"]), adminBulkCreateQuestions);
app.put("/api/admin/questions/:id", authMiddleware(), roleMiddleware(["admin"]), adminUpdateQuestion);
app.delete("/api/admin/questions/:id", authMiddleware(), roleMiddleware(["admin"]), adminDeleteQuestion);
app.use("/api", aiGenerationRoutes);
app.use("/api/tests", testRoutes);
app.use("/api/test-sessions", testSessionRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/cheating", cheatingRoutes);
app.use("/api/admin/cheating-logs", adminCheatingRoutes);

app.use("/admin/tests", adminTestRoutes);
app.use("/api/admin/tests", adminTestRoutes);


app.use(errorHandler);

