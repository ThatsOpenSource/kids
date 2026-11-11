import fs from "fs";
import path from "path";
import zlib from "zlib";

const LOG_DIR = path.resolve(process.cwd(), "logs");
const isProd = process.env.NODE_ENV === "production";

function today(): string {
  return new Date().toISOString().slice(0, 10).replace(/-/g, "");
}

function logPath(): string {
  return path.join(LOG_DIR, `log-${today()}.log`);
}

function ensureDir() {
  if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
}

export function gzipYesterday() {
  ensureDir();
  const yesterday = new Date(Date.now() - 864e5).toISOString().slice(0, 10).replace(/-/g, "");
  const src = path.join(LOG_DIR, `log-${yesterday}.log`);
  const dest = path.join(LOG_DIR, `log-${yesterday}.log.gz`);
  if (!fs.existsSync(src) || fs.existsSync(dest)) return;
  const stat = fs.statSync(src);
  if (stat.size === 0) { fs.unlinkSync(src); return; }
  const gz = zlib.createGzip();
  fs.createReadStream(src).pipe(gz).pipe(fs.createWriteStream(dest)).on("finish", () => fs.unlinkSync(src));
}

export function writeLog(entry: Record<string, any>) {
  ensureDir();
  const line = JSON.stringify({ ts: new Date().toISOString(), ...entry }) + "\n";
  fs.appendFileSync(logPath(), line);
  if (!isProd) console.log(line.trim());
}

export function logError(err: any, meta: Record<string, any> = {}) {
  writeLog({
    level: "error",
    message: err.message || String(err),
    stack: err.stack || null,
    code: err.code || null,
    ...meta,
  });
}