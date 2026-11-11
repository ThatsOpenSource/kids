import { Response } from "express";

export function ok(res: Response, data: any, status = 200) {
  res.status(status).json({
    ok: true,
    status,
    timestamp: new Date().toISOString(),
    data,
  });
}

export function fail(res: Response, status: number, error: string, meta: Record<string, any> = {}) {
  res.status(status).json({
    ok: false,
    status,
    error,
    timestamp: new Date().toISOString(),
    ...meta,
  });
}