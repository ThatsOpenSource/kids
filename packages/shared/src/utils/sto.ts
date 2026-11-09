import { PERSON_ROLES, type PersonRole } from '../constants';

/** German role token used in legacy STO-BN-Gruppe (Step CSV) */
export function roleToStoToken(roles: string[]): string {
  if (roles.includes(PERSON_ROLES.LEHRER) || roles.includes(PERSON_ROLES.KLASSENLEHRER)) {
    return 'Lehrer';
  }
  if (roles.includes(PERSON_ROLES.SCHUELER)) return 'Schueler';
  if (roles.includes(PERSON_ROLES.SONSTIGE)) return 'Sonstige';
  return 'Sonstige';
}

/**
 * STO-BN-Gruppe e.g. "45-Lehrer" / "45-Schueler"
 * Built from school KZ-SNr + role token – not stored per person.
 */
export function buildStoBnGroup(kzSnr: string | null | undefined, roles: string[]): string | null {
  if (!kzSnr || !String(kzSnr).trim()) return null;
  return `${String(kzSnr).trim()}-${roleToStoToken(roles)}`;
}

/**
 * STO-Klasse e.g. "45-5a" when both KZ-SNr and class are set.
 */
export function buildStoClass(
  kzSnr: string | null | undefined,
  className: string | null | undefined
): string | null {
  if (!kzSnr || !String(kzSnr).trim()) return null;
  if (!className || !String(className).trim()) return null;
  return `${String(kzSnr).trim()}-${String(className).trim()}`;
}
