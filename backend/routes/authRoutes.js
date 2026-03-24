import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { authLimiter, loginLimiter } from "../middleware/rateLimiter.js";
import { login, logout, me, refresh, register } from "../controllers/authController.js";

export const authRoutes = Router();

authRoutes.post("/register", authLimiter, register);
authRoutes.post("/login", loginLimiter, login);
authRoutes.post("/refresh", authLimiter, refresh);
authRoutes.get("/me", authMiddleware(), me);
authRoutes.post("/logout", authLimiter, logout);

