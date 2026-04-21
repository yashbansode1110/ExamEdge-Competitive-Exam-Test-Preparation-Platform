import jwt from "jsonwebtoken";
import { User } from "../models/User.js";
import { unauthorized, forbidden } from "./errorHandler.js";

export function authMiddleware() {
  return async (req, _res, next) => {
    try {
      const header = req.headers.authorization || "";
      const token = header.startsWith("Bearer ") ? header.slice(7) : "";
      if (!token) throw unauthorized("Missing access token");

      const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
      const user = await User.findById(payload.sub).select("_id email name role banned isPremium testsAttempted");
      if (!user) throw unauthorized("User not found");
      if (user.banned) throw forbidden("User is banned", "BANNED");
      req.user = { id: user._id.toString(), email: user.email, name: user.name, role: user.role, isPremium: user.isPremium, testsAttempted: user.testsAttempted };
      next();
    } catch {
      next(unauthorized("Invalid access token"));
    }
  };
}

