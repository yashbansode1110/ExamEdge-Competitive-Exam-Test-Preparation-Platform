import { forbidden, unauthorized } from "./errorHandler.js";

export function roleMiddleware(roles) {
  const allowed = Array.isArray(roles) ? roles : [roles];
  return (req, _res, next) => {
    if (!req.user) return next(unauthorized());
    if (!allowed.includes(req.user.role)) return next(forbidden("Admin privileges required", "ADMIN_ONLY"));
    next();
  };
}

