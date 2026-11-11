import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const h = req.headers.authorization;
  if (!h?.startsWith("Bearer ")) return res.status(401).json({ error: "Nicht angemeldet" });
  try {
    const payload = jwt.verify(h.slice(7), process.env.JWT_ACCESS_SECRET || "dev-access") as any;
    (req as any).userId = payload.sub;
    (req as any).role = payload.role;
    next();
  } catch {
    res.status(401).json({ error: "Token ungültig" });
  }
}