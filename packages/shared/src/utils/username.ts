import { USERNAME_FORBIDDEN } from '../constants';

export function normalizeUmlauts(input: string, mode: 'ae' | 'strip' = 'ae'): string {
  if (mode === 'ae') {
    return input
      .replace(/ä/g, 'ae')
      .replace(/Ä/g, 'Ae')
      .replace(/ö/g, 'oe')
      .replace(/Ö/g, 'Oe')
      .replace(/ü/g, 'ue')
      .replace(/Ü/g, 'Ue')
      .replace(/ß/g, 'ss');
  }
  return input
    .replace(/[äÄ]/g, 'a')
    .replace(/[öÖ]/g, 'o')
    .replace(/[üÜ]/g, 'u')
    .replace(/ß/g, 's');
}

export function sanitizeNameForDisplay(input: string): string {
  return input.replace(/[^\p{L}\p{N}\- ]/gu, '').trim();
}

/**
 * Base username from name parts (no uniqueness digit yet).
 * Always lowercased, umlauts folded, non-alnum stripped.
 */
export function baseUsername(
  vorname: string,
  nachname: string,
  mode: 'ae' | 'strip' = 'ae'
): string {
  const v = normalizeUmlauts(vorname, mode).toLowerCase().replace(/[^a-z0-9]/g, '');
  const n = normalizeUmlauts(nachname, mode).toLowerCase().replace(/[^a-z0-9]/g, '');
  return (v.slice(0, 3) + n.slice(0, 3)).slice(0, 12) || 'user';
}

/**
 * Generate unique username: base + optional digit suffix.
 * `taken` must include all existing usernames (DB + batch).
 * Always prefers base; then base1, base2, … base9, base10, …
 */
export function generateUniqueUsername(
  vorname: string,
  nachname: string,
  taken: Set<string>,
  mode: 'ae' | 'strip' = 'ae'
): string {
  const base = baseUsername(vorname, nachname, mode);
  if (!taken.has(base.toLowerCase())) return base;
  let i = 1;
  while (i < 10000) {
    const candidate = `${base}${i}`;
    if (!taken.has(candidate.toLowerCase())) return candidate;
    i += 1;
  }
  return `${base}${Date.now().toString(36).slice(-4)}`;
}

/** @deprecated use generateUniqueUsername */
export function generateUsername(
  vorname: string,
  nachname: string,
  mode: 'ae' | 'strip' = 'ae',
  existing?: Set<string>
): string {
  return generateUniqueUsername(vorname, nachname, existing ?? new Set(), mode);
}

export function isValidUsername(name: string): boolean {
  return !USERNAME_FORBIDDEN.test(name) && /^[a-z0-9][a-z0-9\-_.]{1,31}$/i.test(name);
}
