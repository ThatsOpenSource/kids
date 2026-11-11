import crypto from "crypto";
import { prisma } from "../db/prisma";

const MASTER = process.env.MASTER_KEY || "dev-master-key-32-bytes-long!!";
const ROTATION_DAYS = 120;

function masterKek(): Buffer {
  return crypto.createHash("sha256").update(MASTER).digest();
}

function wrap(key: Buffer, withKey: Buffer): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", withKey, iv);
  const enc = Buffer.concat([cipher.update(key), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64");
}

function unwrap(wrapped: string, withKey: Buffer): Buffer {
  const buf = Buffer.from(wrapped, "base64");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const data = buf.subarray(28);
  const decipher = crypto.createDecipheriv("aes-256-gcm", withKey, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]);
}

async function loadKeys(): Promise<Map<number, Buffer>> {
  const rows = await prisma.keyVersion.findMany({ orderBy: { version: "asc" } });
  const keys = new Map<number, Buffer>();
  for (const row of rows) {
    keys.set(row.version, unwrap(row.wrappedKey, masterKek()));
  }
  return keys;
}

async function ensureVersion(): Promise<{ version: number; kek: Buffer }> {
  const latest = await prisma.keyVersion.findFirst({ orderBy: { version: "desc" } });
  if (!latest) {
    const kek = crypto.randomBytes(32);
    await prisma.keyVersion.create({ data: { version: 1, wrappedKey: wrap(kek, masterKek()) } });
    return { version: 1, kek };
  }
  const age = (Date.now() - latest.createdAt.getTime()) / 864e5;
  const currentKek = unwrap(latest.wrappedKey, masterKek());
  if (age < ROTATION_DAYS) return { version: latest.version, kek: currentKek };
  const newKek = crypto.randomBytes(32);
  const next = latest.version + 1;
  await prisma.keyVersion.create({
    data: { version: next, wrappedKey: wrap(newKek, masterKek()), wrappedPrev: wrap(currentKek, newKek) },
  });
  console.log(`Key rotated to v${next}`);
  return { version: next, kek: newKek };
}

export async function encryptField(plain: string | null | undefined): Promise<string | null> {
  if (!plain) return null;
  const { version, kek } = await ensureVersion();
  const dek = crypto.randomBytes(32);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", dek, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  const payload = Buffer.concat([iv, tag, enc]).toString("base64");
  return `v${version}:${wrap(dek, kek)}:${payload}`;
}

export async function decryptField(enc: string | null | undefined): Promise<string | null> {
  if (!enc) return null;
  try {
    const keys = await loadKeys();
    if (!enc.startsWith("v")) {
      const kek = keys.get(1);
      if (!kek) return null;
      const buf = Buffer.from(enc, "base64");
      const iv = buf.subarray(0, 12);
      const tag = buf.subarray(12, 28);
      const data = buf.subarray(28);
      const decipher = crypto.createDecipheriv("aes-256-gcm", kek, iv);
      decipher.setAuthTag(tag);
      return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
    }
    const [ver, wrapped, payload] = enc.split(":");
    const kek = keys.get(parseInt(ver.slice(1)));
    if (!kek) return null;
    const dek = unwrap(wrapped, kek);
    const buf = Buffer.from(payload, "base64");
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const data = buf.subarray(28);
    const decipher = crypto.createDecipheriv("aes-256-gcm", dek, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}