import fs from "fs";
import path from "path";

const LOG_DIR = process.env.LOG_DIR || "./logs";
if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });

type Level = "info" | "warn" | "error" | "audit" | "security";

function write(level: Level, msg: string, meta?: any) {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    msg,
    ...(meta ? { meta } : {}),
  }) + "\n";
  const file = path.join(LOG_DIR, `${level}.log`);
  fs.appendFileSync(file, line);
  const color = level === "error" ? "\x1b[31m" : level === "warn" ? "\x1b[33m" : level === "security" ? "\x1b[35m" : "\x1b[36m";
  console.log(`${color}[${level.toUpperCase()}]\x1b[0m ${msg}${meta ? " " + JSON.stringify(meta) : ""}`);
}

export const logger = {
  info: (msg: string, meta?: any) => write("info", msg, meta),
  warn: (msg: string, meta?: any) => write("warn", msg, meta),
  error: (msg: string, meta?: any) => write("error", msg, meta),
  audit: (msg: string, meta?: any) => write("audit", msg, meta),
  security: (msg: string, meta?: any) => write("security", msg, meta),
};