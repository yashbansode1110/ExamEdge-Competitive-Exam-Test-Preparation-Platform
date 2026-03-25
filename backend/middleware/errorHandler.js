export class HttpError extends Error {
  constructor(statusCode, message, code) {
    super(message);
    this.statusCode = statusCode;
    this.code = code || "HTTP_ERROR";
  }
}

export function badRequest(message, code) {
  return new HttpError(400, message, code || "BAD_REQUEST");
}
export function unauthorized(message, code) {
  return new HttpError(401, message || "Unauthorized", code || "UNAUTHORIZED");
}
export function forbidden(message, code) {
  return new HttpError(403, message || "Forbidden", code || "FORBIDDEN");
}
export function notFound(message, code) {
  return new HttpError(404, message || "Not found", code || "NOT_FOUND");
}

export function errorHandler(err, _req, res, _next) {
  const isZod = err?.name === "ZodError" || err?.constructor?.name === "ZodError";
  const zodMessage =
    Array.isArray(err?.issues) && err.issues.length
      ? err.issues[0]?.message
      : err?.message || "Validation failed";

  const status = isZod ? 400 : err?.statusCode && Number.isInteger(err.statusCode) ? err.statusCode : 500;
  const code = isZod ? "VALIDATION_ERROR" : err?.code || "INTERNAL_ERROR";
  const message = status >= 500 ? "Internal server error" : zodMessage;

  if (status >= 500) {
    // eslint-disable-next-line no-console
    console.error(err);
  }
  res.status(status).json({ ok: false, code, message });
}

