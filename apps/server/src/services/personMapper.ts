import { ACCOUNT_TYPES, PERSON_ROLES, type PersonRole, buildStoBnGroup, buildStoClass } from '@kids/shared';
import {
  encryptField,
  decryptField,
  tryDecrypt,
  blindHash,
  encryptJson,
  decryptJson,
} from '../utils/crypto';
import { randomUUID } from 'crypto';

export type DecryptedPerson = {
  id: string;
  lkid: string;
  amsId: string;
  schoolId: string;
  sourceId: string | null;
  lastName: string;
  firstName: string;
  dateOfBirth: string | null;
  schoolEntryDate: string | null;
  schoolEndDate: string | null;
  gender: string | null;
  email: string | null;
  emailMdm: string | null;
  username: string | null;
  appleId: string | null;
  roles: PersonRole[];
  /** Derived from roles – not stored */
  accountType: number;
  className: string | null;
  grade: string | null;
  applications: string[];
  activeAttendance: boolean;
  terminated: boolean;
  note: string | null;
  hasPassword: boolean;
  version: number;
  updatedAt: string;
};

/** Map primary role → vceTyp / Kontotyp (411/421/431) */
export function rolesToAccountType(roles: string[]): number {
  if (roles.includes(PERSON_ROLES.SCHUELER)) return ACCOUNT_TYPES.SCHUELER;
  if (roles.includes(PERSON_ROLES.LEHRER) || roles.includes(PERSON_ROLES.KLASSENLEHRER)) {
    return ACCOUNT_TYPES.LEHRER;
  }
  if (roles.includes(PERSON_ROLES.SONSTIGE)) return ACCOUNT_TYPES.SONSTIGE;
  return ACCOUNT_TYPES.SONSTIGE;
}

export function accountTypeToPrimaryRole(accountType: number): PersonRole {
  if (accountType === ACCOUNT_TYPES.SCHUELER) return PERSON_ROLES.SCHUELER;
  if (accountType === ACCOUNT_TYPES.LEHRER) return PERSON_ROLES.LEHRER;
  return PERSON_ROLES.SONSTIGE;
}

export function decryptPersonRow(r: any): DecryptedPerson {
  const roles = decryptJson<string[]>(r.roles) as PersonRole[];
  const applications = r.applications ? decryptJson<string[]>(r.applications) : [];
  return {
    id: r.id,
    lkid: decryptField(r.lkid),
    amsId: decryptField(r.amsId),
    schoolId: decryptField(r.schoolId),
    sourceId: r.sourceId ?? null,
    lastName: decryptField(r.lastName),
    firstName: decryptField(r.firstName),
    dateOfBirth: tryDecrypt(r.dateOfBirth),
    schoolEntryDate: tryDecrypt(r.schoolEntryDate),
    schoolEndDate: tryDecrypt(r.schoolEndDate),
    gender: r.gender,
    email: tryDecrypt(r.email),
    emailMdm: tryDecrypt(r.emailMdm),
    username: tryDecrypt(r.username),
    appleId: tryDecrypt(r.appleId),
    roles,
    accountType: rolesToAccountType(roles),
    className: tryDecrypt(r.className),
    grade: tryDecrypt(r.grade),
    applications,
    activeAttendance: r.activeAttendance,
    terminated: r.terminated,
    note: r.note,
    hasPassword: !!r.password,
    version: r.version,
    updatedAt: r.updatedAt instanceof Date ? r.updatedAt.toISOString() : String(r.updatedAt),
  };
}

/** German-facing DTO (legacy UI keys) + English */
export function toApiPerson(d: DecryptedPerson) {
  return {
    id: d.id,
    lkid: d.lkid,
    amsId: d.amsId,
    schoolId: d.schoolId,
    schulId: d.schoolId,
    lastName: d.lastName,
    firstName: d.firstName,
    nachname: d.lastName,
    vorname: d.firstName,
    dateOfBirth: d.dateOfBirth,
    geburtsdatum: d.dateOfBirth,
    schoolEntryDate: d.schoolEntryDate,
    schulbeginn: d.schoolEntryDate,
    schoolEndDate: d.schoolEndDate,
    schulende: d.schoolEndDate,
    gender: d.gender,
    geschlecht: d.gender,
    email: d.email,
    emailMdm: d.emailMdm,
    username: d.username,
    benutzername: d.username,
    appleId: d.appleId,
    roles: d.roles,
    rollen: d.roles,
    accountType: d.accountType,
    kontentyp: d.accountType,
    className: d.className,
    klasse: d.className,
    grade: d.grade,
    stufe: d.grade,
    applications: d.applications,
    anwendungen: d.applications,
    activeAttendance: d.activeAttendance,
    aktiverBesuch: d.activeAttendance,
    terminated: d.terminated,
    terminiert: d.terminated,
    hasPassword: d.hasPassword,
    version: d.version,
    updatedAt: d.updatedAt,
    // filled by attachSto() when school kzSnr is available
    stoBnGroup: null as string | null,
    stoClass: null as string | null,
  };
}

export function attachSto<T extends ReturnType<typeof toApiPerson>>(
  person: T,
  kzSnr: string | null | undefined
): T {
  return {
    ...person,
    stoBnGroup: buildStoBnGroup(kzSnr, person.roles),
    stoClass: buildStoClass(kzSnr, person.className),
    'STO-BN-Gruppe': buildStoBnGroup(kzSnr, person.roles),
    'STO-Klasse': buildStoClass(kzSnr, person.className),
  };
}


export function buildPersonCreateData(input: {
  lkid: string;
  amsId?: string;
  schoolId: string;
  lastName: string;
  firstName: string;
  dateOfBirth?: string | null;
  schoolEntryDate?: string | null;
  schoolEndDate?: string | null;
  gender?: string | null;
  email?: string | null;
  emailMdm?: string | null;
  username?: string | null;
  appleId?: string | null;
  password?: string | null;
  roles: string[];
  className?: string | null;
  grade?: string | null;
  applications?: string[];
  activeAttendance?: boolean;
  terminated?: boolean;
  note?: string | null;
  importId?: string | null;
  sourceId?: string | null;
  createdById?: string | null;
}) {
  const amsId = input.amsId || randomUUID();
  const className = input.className || null;
  const grade = input.grade || null;
  return {
    lkidHash: blindHash(input.lkid),
    lkid: encryptField(input.lkid),
    amsIdHash: blindHash(amsId),
    amsId: encryptField(amsId),
    schoolIdHash: blindHash(input.schoolId),
    schoolId: encryptField(input.schoolId),
    lastName: encryptField(input.lastName),
    firstName: encryptField(input.firstName),
    dateOfBirth: input.dateOfBirth ? encryptField(input.dateOfBirth) : null,
    schoolEntryDate: input.schoolEntryDate ? encryptField(input.schoolEntryDate) : null,
    schoolEndDate: input.schoolEndDate ? encryptField(input.schoolEndDate) : null,
    gender: input.gender ?? null,
    email: input.email ? encryptField(input.email) : null,
    emailMdm: input.emailMdm ? encryptField(input.emailMdm) : null,
    usernameHash: input.username ? blindHash(input.username) : null,
    username: input.username ? encryptField(input.username) : null,
    appleId: input.appleId ? encryptField(input.appleId) : null,
    password: input.password ? encryptField(input.password) : null,
    roles: encryptJson(input.roles),
    className: className ? encryptField(className) : null,
    classNameHash: className ? blindHash(className) : blindHash(''),
    grade: grade ? encryptField(grade) : null,
    gradeHash: grade ? blindHash(grade) : blindHash(''),
    applications: encryptJson(input.applications || []),
    activeAttendance: input.activeAttendance ?? true,
    terminated: input.terminated ?? false,
    note: input.note ?? null,
    importId: input.importId ?? null,
    sourceId: input.sourceId ?? null,
    createdById: input.createdById ?? null,
  };
}
