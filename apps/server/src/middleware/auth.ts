import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../db/prisma";

export interface AuthRequest extends Request {
  user?: { id: string; role: string; email?: string };
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return res.status(401).json({ error: "Nicht authentifiziert" });
  try {
    const payload = jwt.verify(header.slice(7), process.env.JWT_ACCESS_SECRET!) as any;
    const user = await prisma.appUser.findUnique({ where: { id: payload.sub } });
    if (!user) return res.status(401).json({ error: "Benutzer nicht gefunden" });
    const fp = req.headers["x-device-fingerprint"] as string || "";
    if (user.deviceFingerprint && fp && user.deviceFingerprint !== fp) {
      // soft warning only in development
      if (process.env.NODE_ENV === "production") {
        return res.status(403).json({ error: "Geräte-Fingerprint ungültig" });
      }
    }
    req.user = { id: user.id, role: user.role, email: user.email };
    next();
  } catch {
    res.status(401).json({ error: "Token ungültig oder abgelaufen" });
  }
}

export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) return res.status(403).json({ error: "Keine Berechtigung" });
    next();
  };
}