import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { z } from "zod";
import { User } from "../models/User.js";
import { badRequest, forbidden, unauthorized } from "../middleware/errorHandler.js";

const MAX_FAILED_LOGINS = 5;
const LOCK_MINUTES = 15;

function sha256(input) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function signAccessToken(payload) {
  return jwt.sign(payload, process.env.JWT_ACCESS_SECRET, { expiresIn: Number(process.env.JWT_ACCESS_TTL_SEC || 900) });
}

function signRefreshToken(payload) {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, { expiresIn: Number(process.env.JWT_REFRESH_TTL_SEC || 2_592_000) });
}

function verifyRefreshToken(token) {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
}

function isLocked(user) {
  return user.lockUntil && user.lockUntil > new Date();
}

function lockUser(user) {
  user.lockUntil = new Date(Date.now() + LOCK_MINUTES * 60_000);
}

async function linkParentChild({ parent, child }) {
  const parentId = parent._id.toString();
  const childId = child._id.toString();
  if (child.childOf && child.childOf.toString() !== parentId) {
    throw forbidden("Child already linked to a parent", "CHILD_ALREADY_LINKED");
  }
  child.childOf = parent._id;
  if (!parent.parentOf.some((x) => x.toString() === childId)) parent.parentOf.push(child._id);
  await Promise.all([parent.save(), child.save()]);
}

export async function register(req, res, next) {
  try {
    const body = z
      .object({
        email: z.string().email(),
        password: z.string().min(8).max(200),
        name: z.string().min(1).max(100),
        role: z.enum(["student", "parent"]).default("student"),
        targetExam: z.string().optional(),
        class: z.enum(["9", "10", "11", "12", "dropper"]).optional(),
        parentEmail: z.string().email().optional(),
        childEmail: z.string().email().optional()
      })
      .parse(req.body);

    const email = body.email.toLowerCase();
    const exists = await User.findOne({ email }).select("_id");
    if (exists) throw badRequest("Email already registered", "EMAIL_TAKEN");

    const passwordHash = await bcrypt.hash(body.password, 12);
    const doc = { email, passwordHash, name: body.name, role: body.role, parentOf: [], refreshTokens: [] };

    if (body.role === "student") {
      if (!body.targetExam || !body.class) throw badRequest("targetExam and class are required for students", "STUDENT_PROFILE_REQUIRED");
      doc.student = { targetExam: body.targetExam, class: body.class, streak: 0, xpPoints: 0, weakTopics: [], practiceHistory: [] };
    }

    const user = await User.create(doc);

    if (body.parentEmail && user.role === "student") {
      const parent = await User.findOne({ email: body.parentEmail.toLowerCase(), role: "parent" });
      if (!parent) throw badRequest("Parent not found", "PARENT_NOT_FOUND");
      await linkParentChild({ parent, child: user });
    }
    if (body.childEmail && user.role === "parent") {
      const child = await User.findOne({ email: body.childEmail.toLowerCase(), role: "student" });
      if (!child) throw badRequest("Child not found", "CHILD_NOT_FOUND");
      await linkParentChild({ parent: user, child });
    }

    const accessToken = signAccessToken({ sub: user._id.toString(), role: user.role });
    const refreshToken = signRefreshToken({ sub: user._id.toString(), role: user.role });

    user.refreshTokens.push({ tokenHash: sha256(refreshToken), expiresAt: new Date(Date.now() + Number(process.env.JWT_REFRESH_TTL_SEC || 2_592_000) * 1000) });
    await user.save();

    res.status(201).json({ ok: true, user: { id: user._id.toString(), email: user.email, name: user.name, role: user.role, isPremium: user.isPremium, testsAttempted: user.testsAttempted }, accessToken, refreshToken });
  } catch (e) {
    next(e);
  }
}

export async function login(req, res, next) {
  try {
    const body = z.object({ email: z.string().email(), password: z.string().min(1) }).parse(req.body);
    const email = body.email.toLowerCase();

    const user = await User.findOne({ email }).select("+passwordHash email name role banned refreshTokens failedLoginCount lockUntil parentOf childOf isPremium testsAttempted");
    if (!user) throw unauthorized("Invalid credentials");
    if (user.banned) throw forbidden("Account disabled", "BANNED");
    if (isLocked(user)) throw forbidden("Account locked. Try later.", "ACCOUNT_LOCKED");

    const ok = await bcrypt.compare(body.password, user.passwordHash);
    if (!ok) {
      user.failedLoginCount = (user.failedLoginCount || 0) + 1;
      if (user.failedLoginCount >= MAX_FAILED_LOGINS) {
        lockUser(user);
        user.failedLoginCount = 0;
      }
      await user.save();
      throw unauthorized("Invalid credentials");
    }

    user.failedLoginCount = 0;
    user.lockUntil = undefined;

    const accessToken = signAccessToken({ sub: user._id.toString(), role: user.role });
    const refreshToken = signRefreshToken({ sub: user._id.toString(), role: user.role });

    user.refreshTokens.push({ tokenHash: sha256(refreshToken), expiresAt: new Date(Date.now() + Number(process.env.JWT_REFRESH_TTL_SEC || 2_592_000) * 1000) });
    if (user.refreshTokens.length > 10) user.refreshTokens = user.refreshTokens.slice(-10);
    await user.save();

    res.json({ ok: true, user: { id: user._id.toString(), email: user.email, name: user.name, role: user.role, isPremium: user.isPremium, testsAttempted: user.testsAttempted }, accessToken, refreshToken });
  } catch (e) {
    next(e);
  }
}

export async function refresh(req, res, next) {
  try {
    const body = z.object({ refreshToken: z.string().min(1) }).parse(req.body);
    const payload = verifyRefreshToken(body.refreshToken);

    const user = await User.findById(payload.sub).select("email name role banned refreshTokens");
    if (!user) throw unauthorized("Invalid refresh token");
    if (user.banned) throw forbidden("Account disabled", "BANNED");

    const tokenHash = sha256(body.refreshToken);
    const now = new Date();
    const idx = user.refreshTokens.findIndex((t) => t.tokenHash === tokenHash);
    if (idx < 0) throw unauthorized("Invalid refresh token");
    if (user.refreshTokens[idx].expiresAt <= now) {
      user.refreshTokens.splice(idx, 1);
      await user.save();
      throw unauthorized("Refresh token expired", "REFRESH_EXPIRED");
    }

    user.refreshTokens.splice(idx, 1);
    const newRefreshToken = signRefreshToken({ sub: user._id.toString(), role: user.role });
    user.refreshTokens.push({ tokenHash: sha256(newRefreshToken), expiresAt: new Date(Date.now() + Number(process.env.JWT_REFRESH_TTL_SEC || 2_592_000) * 1000) });
    if (user.refreshTokens.length > 10) user.refreshTokens = user.refreshTokens.slice(-10);
    await user.save();

    const accessToken = signAccessToken({ sub: user._id.toString(), role: user.role });
    res.json({ ok: true, accessToken, refreshToken: newRefreshToken });
  } catch {
    next(unauthorized("Invalid refresh token"));
  }
}

export async function me(req, res) {
  res.json({ ok: true, user: req.user });
}

export async function logout(req, res) {
  try {
    const body = z.object({ refreshToken: z.string().min(1) }).parse(req.body);
    const payload = verifyRefreshToken(body.refreshToken);
    const user = await User.findById(payload.sub).select("refreshTokens banned");
    if (!user || user.banned) return res.json({ ok: true });
    const tokenHash = sha256(body.refreshToken);
    user.refreshTokens = user.refreshTokens.filter((t) => t.tokenHash !== tokenHash);
    await user.save();
    res.json({ ok: true });
  } catch {
    res.json({ ok: true });
  }
}

