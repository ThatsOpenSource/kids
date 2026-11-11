import crypto from "crypto";

const MASTER_KEY = Buffer.from(process.env.ENCRYPTION_MASTER_KEY || "", "hex");
if (MASTER_KEY.length !== 32) {
  console.warn("ENCRYPTION_MASTER_KEY must be 32 bytes hex. Using fallback for dev only.");
}

export interface Envelope {
  ciphertext: string; // base64
  iv: string;         // base64
  authTag: string;    // base64
  wrappedDek: string; // base64 (DEK encrypted with master)
  version: number;
}

function getMaster(): Buffer {
  if (MASTER_KEY.length === 32) return MASTER_KEY;
  return crypto.createHash("sha256").update("dev-fallback-key").digest();
}

export function encryptEnvelope(plaintext: string, version = 1): Envelope {
  const dek = crypto.randomBytes(32);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", dek, iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  // wrap DEK with master
  const wrapIv = crypto.randomBytes(12);
  const wrapCipher = crypto.createCipheriv("aes-256-gcm", getMaster(), wrapIv);
  const wrapped = Buffer.concat([wrapCipher.update(dek), wrapCipher.final()]);
  const wrapTag = wrapCipher.getAuthTag();
  const wrappedDek = Buffer.concat([wrapIv, wrapTag, wrapped]).toString("base64");

  return {
    ciphertext: ct.toString("base64"),
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64"),
    wrappedDek,
    version,
  };
}

export function decryptEnvelope(env: Envelope): string {
  const wrappedBuf = Buffer.from(env.wrappedDek, "base64");
  const wrapIv = wrappedBuf.subarray(0, 12);
  const wrapTag = wrappedBuf.subarray(12, 28);
  const wrappedCt = wrappedBuf.subarray(28);
  const unwrap = crypto.createDecipheriv("aes-256-gcm", getMaster(), wrapIv);
  unwrap.setAuthTag(wrapTag);
  const dek = Buffer.concat([unwrap.update(wrappedCt), unwrap.final()]);

  const decipher = crypto.createDecipheriv("aes-256-gcm", dek, Buffer.from(env.iv, "base64"));
  decipher.setAuthTag(Buffer.from(env.authTag, "base64"));
  const pt = Buffer.concat([decipher.update(Buffer.from(env.ciphertext, "base64")), decipher.final()]);
  return pt.toString("utf8");
}

export function serializeEnvelope(env: Envelope): string {
  return JSON.stringify(env);
}

export function parseEnvelope(s: string): Envelope {
  return JSON.parse(s);
}

export function encryptField(plaintext: string | null | undefined): string | null {
  if (!plaintext) return null;
  return serializeEnvelope(encryptEnvelope(plaintext));
}

export function decryptField(stored: string | null | undefined): string | null {
  if (!stored) return null;
  try {
    return decryptEnvelope(parseEnvelope(stored));
  } catch {
    return null;
  }
}