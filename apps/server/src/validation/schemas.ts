import { z } from 'zod';
import { PERSON_ROLES, APP_FLAGS, ACCOUNT_TYPES } from '@kids/shared';

export const loginSchema = z.object({
  email: z.string().email('Ungültige E-Mail').max(254).transform((s) => s.toLowerCase().trim()),
  password: z.string().min(8, 'Passwort min. 8 Zeichen').max(128),
  deviceFingerprint: z.string().max(256).optional(),
  totpCode: z.string().min(6).max(8).optional(),
});

export const registerUserSchema = z.object({
  email: z.string().email().max(254).transform((s) => s.toLowerCase().trim()),
  password: z
    .string()
    .min(10)
    .max(128)
    .regex(/[A-Z]/, 'Großbuchstabe erforderlich')
    .regex(/[a-z]/, 'Kleinbuchstabe erforderlich')
    .regex(/[0-9]/, 'Ziffer erforderlich'),
  displayName: z.string().min(2).max(120).trim(),
  role: z.enum(['admin', 'operator', 'viewer']).default('operator'),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(20),
  deviceFingerprint: z.string().max(256).optional(),
});

export const personRoleSchema = z.enum([
  PERSON_ROLES.SCHUELER,
  PERSON_ROLES.LEHRER,
  PERSON_ROLES.SONSTIGE,
  PERSON_ROLES.KLASSENLEHRER,
]);

export const appFlagSchema = z.enum([
  APP_FLAGS.MDM,
  APP_FLAGS.NEXTCLOUD,
  APP_FLAGS.PAPERCUT,
  APP_FLAGS.IOT,
]);

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Datum muss YYYY-MM-DD sein')
  .nullable()
  .optional();

export const personCommitSchema = z.object({
  id: z.string().uuid().optional(),
  amsId: z.string().uuid().optional(),
  lkid: z
    .string()
    .min(5)
    .max(64)
    .regex(/^[A-Za-z0-9\-]+$/, 'LKID: nur alphanumerisch und Bindestrich'),
  schulId: z.string().min(1).max(16),
  schulKz: z.string().max(32).optional().nullable(),
  nachname: z.string().min(1).max(120).trim(),
  vorname: z.string().min(1).max(120).trim(),
  geburtsdatum: isoDate,
  geschlecht: z.enum(['m', 'w', 'd']).nullable().optional(),
  email: z
    .union([z.string().email().max(254), z.literal(''), z.null()])
    .optional()
    .transform((v) => (v === '' ? null : v)),
  benutzername: z
    .string()
    .max(64)
    .regex(/^[a-z0-9][a-z0-9\-_.]*$/i, 'Benutzername: a-z, 0-9, -_.')
    .nullable()
    .optional(),
  appleId: z.string().max(128).nullable().optional(),
  rollen: z.array(personRoleSchema).min(1),
  klasse: z.string().max(64).nullable().optional(),
  stufe: z.string().max(16).nullable().optional(),
  anwendungen: z.array(appFlagSchema).default([]),
  aktiverBesuch: z.boolean().default(true),
  terminiert: z.boolean().default(false),
  entityType: z.enum(['s', 'l']).nullable().optional(),
  kontentyp: z
    .number()
    .int()
    .refine((n) => Object.values(ACCOUNT_TYPES).includes(n as any), 'Ungültiger Kontentyp')
    .optional()
    .nullable(),
  anmerkung: z.string().max(500).nullable().optional(),
  importId: z.string().max(64).nullable().optional(),
  sourceGuid: z.string().max(128).nullable().optional(),
  version: z.number().int().min(1).optional(),
});

export const importXmlPayloadSchema = z.object({
  filename: z.string().min(1).max(255),
  contentBase64: z.string().min(10).max(20_000_000),
  schoolHint: z.string().max(16).optional(),
});

export const importCommitSchema = z.object({
  persons: z.array(personCommitSchema).min(1).max(5000),
  generatePasswords: z.boolean().default(true),
});

/** Password policy – sanitised for storage in school config */
export const passwordPolicySchema = z.object({
  length: z.number().int().min(8).max(64).optional(),
  includeUpper: z.boolean().optional(),
  includeLower: z.boolean().optional(),
  includeDigits: z.boolean().optional(),
  includeSpecial: z.boolean().optional(),
  specialChars: z
    .string()
    .max(32)
    .regex(/^[!@#$%&*_+=?\-]+$/, 'Nur erlaubte Sonderzeichen')
    .optional(),
  prefix: z
    .string()
    .max(16)
    .regex(/^[a-zA-Z0-9\-_.]*$/, 'Prefix: alphanumerisch')
    .optional(),
  strength: z.enum(['weak', 'medium', 'strong']).optional(),
  wordPool: z
    .string()
    .max(8000)
    .optional()
    .transform((s) =>
      s
        ? s
            .split(/[\s,;]+/)
            .map((w) => w.replace(/[^a-zA-ZäöüÄÖÜß0-9\-]/g, ''))
            .filter((w) => w.length >= 2 && w.length <= 24)
            .slice(0, 500)
            .join(' ')
        : s
    ),
  wordCount: z.number().int().min(1).max(6).optional(),
  derivePattern: z
    .string()
    .max(120)
    .regex(/^[{}a-zA-Z0-9\-_.]*$/, 'Nur Tokens und sichere Zeichen')
    .optional(),
  deriveDigitCount: z.number().int().min(0).max(6).optional(),
});

export const schoolConfigSchema = z.object({
  umlautMode: z.enum(['ae', 'strip']).optional(),
  assignAllTeachersToClasses: z.boolean().optional(),
  appleIdDomain: z
    .string()
    .max(120)
    .regex(/^[a-z0-9.-]+$/i)
    .optional(),
  appleIdPattern: z.string().max(120).optional(),
  usernamePattern: z.string().max(80).optional(),
  defaultFlags: z.array(appFlagSchema).optional(),
  passwordPolicy: passwordPolicySchema.optional(),
});

export const createSchoolSchema = z.object({
  id: z.string().min(1).max(16).regex(/^[0-9A-Za-z\-]+$/),
  kz: z.string().min(1).max(32).regex(/^[a-z0-9\-]+$/i),
  name: z.string().min(2).max(200).trim(),
  type: z.enum(['grundschule', 'regelschule', 'gymnasium', 'sonstige']),
  location: z.string().max(120).optional(),
  config: schoolConfigSchema.optional(),
});

export const updateSchoolConfigSchema = z.object({
  config: schoolConfigSchema,
});

export const amsExportSchema = z.object({
  schoolId: z.string().max(16).optional(),
  ensureAppleIdsFirst: z.boolean().default(true),
});

export const appleIdsSchema = z.object({
  schoolId: z.string().max(16).optional(),
});

export const personsQuerySchema = z.object({
  schulId: z.string().max(16).optional(),
  schoolId: z.string().max(16).optional(),
  q: z.string().max(200).optional(),
  klasse: z.string().max(64).optional(),
  rolle: z.string().max(32).optional(),
  kontentyp: z.string().regex(/^\d+$/).optional(),
});

export const passwordScopeSchema = z.object({
  scope: z.enum(['person', 'class', 'school', 'role', 'all']),
  ref: z.string().max(64).optional(),
  schoolId: z.string().max(16).optional(),
  force: z.boolean().default(false),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterUserInput = z.infer<typeof registerUserSchema>;
export type PersonCommitInput = z.infer<typeof personCommitSchema>;
export type ImportCommitInput = z.infer<typeof importCommitSchema>;
export type CreateSchoolInput = z.infer<typeof createSchoolSchema>;
export type SchoolConfigInput = z.infer<typeof schoolConfigSchema>;
export type PasswordScopeInput = z.infer<typeof passwordScopeSchema>;


export const loginWithTotpSchema = z.object({
  preAuthToken: z.string().min(20),
  totpCode: z.string().min(6).max(8).regex(/^\d{6,8}$/, '6-stelliger Code'),
  deviceFingerprint: z.string().max(256).optional(),
});

export const totpCodeSchema = z.object({
  totpCode: z.string().min(6).max(8).regex(/^\d{6,8}$/),
});

export const csvExportSchema = z.object({
  schoolId: z.string().min(1).max(16),
  klasse: z.string().max(64).optional(),
  includeHeaders: z.boolean().default(true),
  columns: z.array(z.string().max(32)).max(30).optional(),
  confirmPassword: z.string().min(8).max(128),
  totpCode: z.string().min(6).max(8).optional(),
});
