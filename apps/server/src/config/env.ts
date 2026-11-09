import { config } from 'dotenv';
import { z } from 'zod';

config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(7420),
  DATABASE_URL: z.string().default('postgres://kids:kids_secret@localhost:7432/kids'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  REDIS_ENABLED: z
    .string()
    .default('false')
    .transform((v) => v === 'true' || v === '1'),
  JWT_ACCESS_SECRET: z.string().min(32).default('dev-access-secret-change-me-in-production-32chars'),
  JWT_REFRESH_SECRET: z.string().min(32).default('dev-refresh-secret-change-me-in-production-32chars'),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL: z.string().default('7d'),
  ENCRYPTION_MASTER_KEY: z.string().min(32).default('0123456789abcdef0123456789abcdef'), // 32 bytes hex for AES-256
  CORS_ORIGIN: z.string().default('http://localhost:7430'),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60_000),
  RATE_LIMIT_MAX: z.coerce.number().default(120),
  LOG_DIR: z.string().default('./logs'),
});

export const env = envSchema.parse(process.env);
