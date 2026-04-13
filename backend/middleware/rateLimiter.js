import rateLimit from "express-rate-limit";

export const apiLimiter = rateLimit({
  windowMs: 60_000,
  limit: 300,
  standardHeaders: "draft-7",
  legacyHeaders: false
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 50,
  standardHeaders: "draft-7",
  legacyHeaders: false
});

export const loginLimiter = rateLimit({
  windowMs: 15 * 60_000,
  // Local dev: repeated demo attempts hit 429 quickly; production stays strict.
  limit: process.env.NODE_ENV === "production" ? 20 : 120,
  standardHeaders: "draft-7",
  legacyHeaders: false
});

