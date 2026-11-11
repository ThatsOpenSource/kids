import { Request, Response, NextFunction } from "express";
import { writeLog, logError } from "../lib/logger";

const REDACT_KEYS = ["password", "confirmPassword", "newPassword", "totpCode", "code", "token", "accessToken", "refreshToken", "authorization", "secret", "totpSecret", "passwordHash", "salt", "xmlBase64", "files"];

function meta(obj: any): any {
  if (!obj || typeof obj !== "object") return undefined;
  const out: any = {};
  if (Array.isArray(obj)) return { count: obj.length };
  for (const [k, v] of Object.entries(obj)) {
    if (REDACT_KEYS.includes(k)) { out[k] = "[redacted]"; continue; }
    if (typeof v === "string" && (v.length > 100 || /^[A-Za-z0-9+/=]{20,}$/.test(v))) { out[k] = `[${v.length}b]`; continue; }
    if (Array.isArray(v)) { out[k] = { count: v.length }; continue; }
    if (typeof v === "object" && v) { out[k] = meta(v); continue; }
    if (typeof v === "number" || typeof v === "boolean") out[k] = v;
    else if (typeof v === "string" && v.length <= 50) out[k] = v;
  }
  return out;
}

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  res.on("finish", () => {
    const q = req.query || {};
    writeLog({
      level: res.statusCode >= 400 ? "warn" : "info",
      method: req.method,
      route: req.path,
      status: res.statusCode,
      userId: (req as any).userId || null,
      duration: Date.now() - start,
      page: q.page || null,
      limit: q.limit || null,
      filters: Object.keys(q).filter(k => !["page", "limit"].includes(k)).length,
      requestSize: req.body ? Object.keys(req.body).length : 0,
      requestMeta: meta(req.body),
    });
  });
  next();
}

export function errorHandler(err: any, req: Request, res: Response, _next: NextFunction) {
  logError(err, { method: req.method, route: req.path, userId: (req as any).userId });
  res.status(500).json({ ok: false, error: "Interner Fehler", timestamp: new Date().toISOString() });
}