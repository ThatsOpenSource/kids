/** Canonical person roles in KIDS */
export const PERSON_ROLES = {
  SCHUELER: 'schueler',
  LEHRER: 'lehrer',
  SONSTIGE: 'sonstige',
  KLASSENLEHRER: 'klassenlehrer',
} as const;

export type PersonRole = (typeof PERSON_ROLES)[keyof typeof PERSON_ROLES];

/** vceTyp / Kontotyp mapping from legacy system */
export const ACCOUNT_TYPES = {
  LEHRER: 411,
  SONSTIGE: 421,
  SCHUELER: 431,
} as const;

/**
 * Application entitlements (proper names – not misused form flags).
 * sp-prt replaces the legacy column "sg-prt" from Step CSVs.
 */
export const APP_FLAGS = {
  MDM: 'sg-mdm',
  NEXTCLOUD: 'sg-cloud',
  PAPERCUT: 'sp-prt',
  IOT: 'sp-iot',
} as const;

export type AppFlag = (typeof APP_FLAGS)[keyof typeof APP_FLAGS];

export const APP_FLAG_LABELS: Record<AppFlag, string> = {
  [APP_FLAGS.MDM]: 'MDM (Geräteverwaltung)',
  [APP_FLAGS.NEXTCLOUD]: 'Nextcloud',
  [APP_FLAGS.PAPERCUT]: 'PaperCut Druck',
  [APP_FLAGS.IOT]: 'Zentrale Dienste (IoT)',
};

/** School type prefixes used in ID conventions */
export const SCHOOL_TYPE_PREFIX = {
  GRUNDSCHULE: 1,
  REGELSCHULE: 2,
  GYMNASIUM: 6,
} as const;

export const REQUIRED_PERSON_FIELDS = [
  'lkid',
  'nachname',
  'vorname',
  'geburtsdatum',
  'schulId',
  'klasse',
  'iot',
  'aktiverBesuch',
  'terminiert',
] as const;

export const USERNAME_FORBIDDEN = /[äöüÄÖÜß§$%&/()=?{ }[\]\\#+*,.;:!<>|@€]/g;

export const DEFAULT_PASSWORD_POLICY = {
  length: 12,
  includeUpper: true,
  includeLower: true,
  includeDigits: true,
  includeSpecial: false,
  specialChars: '!@#$%&*',
} as const;

/** Default Apple ID domain pattern – override per school */
export const DEFAULT_APPLE_ID_DOMAIN = 'appleid.ds-greiz.de';

/** AMS CSV column sets (Apple School Manager Managed Apple IDs template) */
export const AMS_STUDENT_HEADERS = [
  'person_id',
  'person_number',
  'first_name',
  'middle_name',
  'last_name',
  'grade_level',
  'email_address',
  'sis_username',
  'password_policy',
  'location_id',
] as const;

export const AMS_STAFF_HEADERS = [
  'person_id',
  'person_number',
  'first_name',
  'middle_name',
  'last_name',
  'email_address',
  'sis_username',
  'location_id',
] as const;

export const AMS_CLASS_HEADERS = [
  'class_id',
  'class_number',
  'course_id',
  'instructor_id',
  'instructor_id_2',
  'instructor_id_3',
  'location_id',
] as const;

export const AMS_COURSE_HEADERS = [
  'course_id',
  'course_number',
  'course_name',
  'location_id',
] as const;

export const AMS_LOCATION_HEADERS = ['location_id', 'location_name'] as const;

export const AMS_ROSTER_HEADERS = ['roster_id', 'class_id', 'student_id'] as const;


/** Incoming role/role-like strings → canonical PersonRole */
export const ROLE_ALIASES: Record<string, PersonRole> = {
  schueler: PERSON_ROLES.SCHUELER,
  schüler: PERSON_ROLES.SCHUELER,
  student: PERSON_ROLES.SCHUELER,
  pupil: PERSON_ROLES.SCHUELER,
  s: PERSON_ROLES.SCHUELER,
  '431': PERSON_ROLES.SCHUELER,
  lehrer: PERSON_ROLES.LEHRER,
  teacher: PERSON_ROLES.LEHRER,
  lehrkraft: PERSON_ROLES.LEHRER,
  l: PERSON_ROLES.LEHRER,
  '411': PERSON_ROLES.LEHRER,
  sonstige: PERSON_ROLES.SONSTIGE,
  other: PERSON_ROLES.SONSTIGE,
  mitarbeiter: PERSON_ROLES.SONSTIGE,
  '421': PERSON_ROLES.SONSTIGE,
  klassenlehrer: PERSON_ROLES.KLASSENLEHRER,
  klassenleitung: PERSON_ROLES.KLASSENLEHRER,
};

export const PERSON_ROLE_LABELS: Record<PersonRole, string> = {
  [PERSON_ROLES.SCHUELER]: 'Schüler',
  [PERSON_ROLES.LEHRER]: 'Lehrer',
  [PERSON_ROLES.SONSTIGE]: 'Sonstige',
  [PERSON_ROLES.KLASSENLEHRER]: 'Klassenlehrer',
};

export const ACCOUNT_TYPE_LABELS: Record<number, string> = {
  [ACCOUNT_TYPES.LEHRER]: 'Lehrer (411)',
  [ACCOUNT_TYPES.SONSTIGE]: 'Sonstige (421)',
  [ACCOUNT_TYPES.SCHUELER]: 'Schüler (431)',
};

export function normalizeRole(raw: string): PersonRole | null {
  const key = raw.trim().toLowerCase();
  return ROLE_ALIASES[key] ?? null;
}
