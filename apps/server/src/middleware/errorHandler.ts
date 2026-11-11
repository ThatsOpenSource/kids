import { Request, Response, NextFunction } from "express";
import { logger } from "../services/logger";
import { Prisma } from "@prisma/client";

export function errorHandler(err: any, req: Request, res: Response, _next: NextFunction) {
  const requestId = (req as any).requestId || "unknown";
  let status = 500;
  let userMessage = "Ein interner Fehler ist aufgetreten.";
  let code = "INTERNAL";
  let details: any = undefined;

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      status = 409;
      code = "UNIQUE_CONSTRAINT";
      userMessage = `Eintrag existiert bereits (Feld: ${(err.meta?.target as string[])?.join(", ") || "unbekannt"}).`;
      details = { target: err.meta?.target };
    } else if (err.code === "P2025") {
      status = 404;
      code = "NOT_FOUND";
      userMessage = "Datensatz nicht gefunden.";
    } else {
      status = 400;
      code = err.code;
      userMessage = "Datenbankfehler.";
      details = { prismaCode: err.code };
    }
  } else if (err.status) {
    status = err.status;
    userMessage = err.message || userMessage;
    code = err.code || "APP_ERROR";
  } else if (err.message) {
    userMessage = err.message;
  }

  logger.error(userMessage, {
    requestId,
    path: req.path,
    method: req.method,
    code,
    stack: err.stack?.split("\n").slice(0, 5),
  });

  res.status(status).json({
    error: userMessage,
    code,
    requestId,
    details,
    timestamp: new Date().toISOString(),
  });
}

export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}