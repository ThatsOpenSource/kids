import type { PasswordPolicyConfig } from '../types/school';
import { DEFAULT_PASSWORD_POLICY } from '../constants';
import { normalizeUmlauts } from './username';

const LOWER = 'abcdefghijkmnopqrstuvwxyz';
const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const DIGITS = '23456789';
const SPECIAL_DEFAULT = '!@#$%&*';

function strengthDefaults(s?: string): Partial<PasswordPolicyConfig> {
  if (s === 'weak') return { length: 8, includeUpper: true, includeLower: true, includeDigits: true, includeSpecial: false };
  if (s === 'strong') return { length: 16, includeUpper: true, includeLower: true, includeDigits: true, includeSpecial: true };
  return { length: 12, includeUpper: true, includeLower: true, includeDigits: true, includeSpecial: false };
}

function sanitizeWordPool(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(/[\s,;]+/)
    .map((w) => w.replace(/[^a-zA-ZäöüÄÖÜß0-9\-]/g, '').trim())
    .filter((w) => w.length >= 2 && w.length <= 24)
    .slice(0, 500);
}

function pick(pool: string): string {
  return pool[Math.floor(Math.random() * pool.length)]!;
}

function shuffle(chars: string[]): string[] {
  for (let i = chars.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [chars[i], chars[j]] = [chars[j]!, chars[i]!];
  }
  return chars;
}

/** Random password from policy (character classes / word pool) */
export function generatePassword(policy: PasswordPolicyConfig = {}): string {
  const base = { ...DEFAULT_PASSWORD_POLICY, ...strengthDefaults(policy.strength), ...policy };
  const words = sanitizeWordPool(base.wordPool);

  if (words.length > 0) {
    const n = Math.min(Math.max(base.wordCount || 2, 1), 6);
    const parts: string[] = [];
    for (let i = 0; i < n; i++) parts.push(words[Math.floor(Math.random() * words.length)]!);
    let pwd = parts.join('-');
    if (base.includeDigits !== false) {
      const d = String(Math.floor(10 + Math.random() * 90));
      pwd += d;
    }
    if (base.includeSpecial) {
      const special = base.specialChars || SPECIAL_DEFAULT;
      pwd += pick(special);
    }
    if (base.prefix) pwd = sanitizePrefix(base.prefix) + pwd;
    return pwd.slice(0, 64);
  }

  let pool = '';
  if (base.includeLower !== false) pool += LOWER;
  if (base.includeUpper !== false) pool += UPPER;
  if (base.includeDigits !== false) pool += DIGITS;
  if (base.includeSpecial) pool += base.specialChars || SPECIAL_DEFAULT;
  if (!pool) pool = LOWER + UPPER + DIGITS;

  const len = Math.min(Math.max(base.length || 12, 8), 64);
  const chars: string[] = [];
  if (base.includeLower !== false) chars.push(pick(LOWER));
  if (base.includeUpper !== false) chars.push(pick(UPPER));
  if (base.includeDigits !== false) chars.push(pick(DIGITS));
  if (base.includeSpecial) chars.push(pick(base.specialChars || SPECIAL_DEFAULT));
  while (chars.length < len) chars.push(pick(pool));
  let pwd = shuffle(chars).join('');
  if (base.prefix) pwd = sanitizePrefix(base.prefix) + pwd.slice(0, len);
  return pwd.slice(0, 64);
}

function sanitizePrefix(p: string): string {
  return p.replace(/[^a-zA-Z0-9\-_.]/g, '').slice(0, 16);
}

export interface DeriveContext {
  vorname: string;
  nachname: string;
  klasse?: string | null;
  stufe?: string | null;
  lkid?: string | null;
  umlautMode?: 'ae' | 'strip';
}

/**
 * Build password from pattern tokens + optional random digits.
 * Tokens: {vorname} {vorname3} {nachname} {nachname3} {klasse} {stufe} {lkid} {digit}
 */
export function derivePassword(
  pattern: string,
  ctx: DeriveContext,
  policy: PasswordPolicyConfig = {}
): string {
  const mode = ctx.umlautMode || 'ae';
  const v = normalizeUmlauts(ctx.vorname || '', mode).toLowerCase().replace(/[^a-z0-9]/g, '');
  const n = normalizeUmlauts(ctx.nachname || '', mode).toLowerCase().replace(/[^a-z0-9]/g, '');
  const digitCount = Math.min(Math.max(policy.deriveDigitCount ?? 2, 0), 6);
  let digits = '';
  for (let i = 0; i < digitCount; i++) digits += String(Math.floor(Math.random() * 10));

  const safe = (s: string) => s.replace(/[^a-zA-Z0-9\-_.]/g, '').slice(0, 32);

  let out = pattern
    .replace(/\{vorname3\}/gi, v.slice(0, 3))
    .replace(/\{nachname3\}/gi, n.slice(0, 3))
    .replace(/\{vorname\}/gi, v.slice(0, 12))
    .replace(/\{nachname\}/gi, n.slice(0, 12))
    .replace(/\{klasse\}/gi, safe(ctx.klasse || ''))
    .replace(/\{stufe\}/gi, safe(ctx.stufe || ''))
    .replace(/\{lkid\}/gi, safe((ctx.lkid || '').slice(-6)))
    .replace(/\{digit\}/gi, digits);

  out = out.replace(/[^a-zA-Z0-9\-_.!@#$%&*]/g, '');
  if (out.length < 6) out = generatePassword(policy);
  if (policy.prefix) out = sanitizePrefix(policy.prefix) + out;
  return out.slice(0, 64);
}

/** Resolve final password: derivePattern if set, else random generatePassword */
export function resolvePassword(
  policy: PasswordPolicyConfig | undefined,
  ctx: DeriveContext
): string {
  const p = policy || {};
  if (p.derivePattern && p.derivePattern.trim()) {
    return derivePassword(p.derivePattern.trim(), ctx, p);
  }
  return generatePassword(p);
}
