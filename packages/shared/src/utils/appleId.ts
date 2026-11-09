import { DEFAULT_APPLE_ID_DOMAIN } from '../constants';
import { normalizeUmlauts } from './username';

/**
 * Generate a Managed Apple ID.
 * Default pattern: {benutzername}@{domain}
 * Domain and pattern are overridable per school config.
 */
export function generateAppleId(
  benutzername: string | null | undefined,
  vorname: string,
  nachname: string,
  opts?: {
    domain?: string;
    pattern?: string;
    umlautMode?: 'ae' | 'strip';
  }
): string {
  const domain = opts?.domain || DEFAULT_APPLE_ID_DOMAIN;
  const mode = opts?.umlautMode || 'ae';
  const user =
    benutzername ||
    normalizeUmlauts((vorname.slice(0, 3) + nachname.slice(0, 3)).toLowerCase(), mode).replace(
      /[^a-z0-9]/g,
      ''
    );

  if (opts?.pattern) {
    return opts.pattern
      .replace('{username}', user)
      .replace('{vorname}', normalizeUmlauts(vorname.toLowerCase(), mode))
      .replace('{nachname}', normalizeUmlauts(nachname.toLowerCase(), mode))
      .replace('{domain}', domain);
  }
  return `${user}@${domain}`;
}
