import crypto from "crypto";

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

function encrypt(plain: string, kek: Buffer): string {
  const dek = crypto.randomBytes(32);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", dek, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  const payload = Buffer.concat([iv, tag, enc]).toString("base64");
  return `${wrap(dek, kek)}:${payload}`;
}

function decrypt(enc: string, kek: Buffer): string {
  const [wrapped, payload] = enc.split(":");
  const dek = unwrap(wrapped, kek);
  const buf = Buffer.from(payload, "base64");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const data = buf.subarray(28);
  const decipher = crypto.createDecipheriv("aes-256-gcm", dek, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}

const MASTER = crypto.randomBytes(32);
console.log(`MASTER: ${MASTER.toString("hex").slice(0, 16)}…`);

const secret = "test-secret-" + crypto.randomBytes(4).toString("hex");
console.log(`Plaintext: ${secret}\n`);

interface Row { version: number; wrappedKey: string; wrappedPrev: string | null; }
const rows: Row[] = [];

const kek1 = crypto.randomBytes(32);
rows.push({ version: 1, wrappedKey: wrap(kek1, MASTER), wrappedPrev: null });
const enc1 = encrypt(secret, kek1);
console.log(`v1 KEK: ${kek1.toString("hex").slice(0, 16)}…`);
console.log(`v1 ciphertext: ${enc1.slice(0, 40)}…\n`);

let prevKek = kek1;
for (let v = 2; v <= 10; v++) {
  const kek = crypto.randomBytes(32);
  rows.push({ version: v, wrappedKey: wrap(kek, MASTER), wrappedPrev: wrap(prevKek, kek) });
  console.log(`v${v} KEK: ${kek.toString("hex").slice(0, 16)}…  wrappedPrev length: ${rows[v - 1].wrappedPrev!.length}`);
  prevKek = kek;
}

console.log(`\n--- Chain walkback ---`);
const keys = new Map<number, Buffer>();
for (const row of rows) {
  keys.set(row.version, unwrap(row.wrappedKey, MASTER));
}

for (let v = 10; v >= 1; v--) {
  const kek = keys.get(v)!;
  if (v > 1) {
    const prev = unwrap(rows[v - 1].wrappedPrev!, kek);
    const expected = keys.get(v - 1)!;
    const match = prev.equals(expected);
    console.log(`v${v} unwraps v${v - 1}: ${match ? "OK" : "FAIL"}`);
  }
}

const recovered = decrypt(enc1, keys.get(1)!);
console.log(`\nDecrypt v1 ciphertext with recovered KEK₁: ${recovered === secret ? "OK" : "FAIL"}`);
console.log(`Recovered: ${recovered}`);

let chainKek = keys.get(10)!;
for (let v = 9; v >= 1; v--) {
  chainKek = unwrap(rows[v].wrappedPrev!, chainKek);
}
const chainRecovered = decrypt(enc1, chainKek);
console.log(`Decrypt via full chain walk from v10: ${chainRecovered === secret ? "OK" : "FAIL"}`);