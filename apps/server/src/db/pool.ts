/**
 * @deprecated Use `prisma` from `./prisma` instead.
 * Kept only for emergency raw SQL if needed.
 */
import pg from 'pg';
import { env } from '../config/env';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 5,
});

export async function query(text: string, params?: unknown[]) {
  return pool.query(text, params);
}
