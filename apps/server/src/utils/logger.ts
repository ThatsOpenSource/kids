import fs from 'fs';
import path from 'path';
import { env } from '../config/env';

type LogLevel = 'info' | 'warn' | 'error' | 'audit' | 'security';

const logDir = path.resolve(env.LOG_DIR);
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

function write(level: LogLevel, message: string, meta?: Record<string, unknown>) {
  const entry = {
    ts: new Date().toISOString(),
    level,
    message,
    ...meta,
  };
  const line = JSON.stringify(entry) + '\n';
  const file = path.join(logDir, `${level}.log`);
  fs.appendFileSync(file, line, 'utf8');
  if (env.NODE_ENV !== 'production' || level === 'error' || level === 'security') {
    const color = { info: '\x1b[36m', warn: '\x1b[33m', error: '\x1b[31m', audit: '\x1b[35m', security: '\x1b[31m' }[level];
    console.log(`${color}[${level.toUpperCase()}]\x1b[0m ${message}`, meta ?? '');
  }
}

export const logger = {
  info: (msg: string, meta?: Record<string, unknown>) => write('info', msg, meta),
  warn: (msg: string, meta?: Record<string, unknown>) => write('warn', msg, meta),
  error: (msg: string, meta?: Record<string, unknown>) => write('error', msg, meta),
  audit: (msg: string, meta?: Record<string, unknown>) => write('audit', msg, meta),
  security: (msg: string, meta?: Record<string, unknown>) => write('security', msg, meta),
};
