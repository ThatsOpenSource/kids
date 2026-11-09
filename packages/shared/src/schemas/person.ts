import { z } from 'zod';
import { PERSON_ROLES, APP_FLAGS, ACCOUNT_TYPES } from '../constants';

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

/** Shared person shape – server re-validates with stricter commit schema on write */
export const personSchema = z.object({
  id: z.string().uuid().optional(),
  amsId: z.string().uuid().optional(),
  lkid: z.string().min(5).max(64),
  schulId: z.string().min(1).max(16),
  schulKz: z.string().max(32).optional().nullable(),
  nachname: z.string().min(1).max(120),
  vorname: z.string().min(1).max(120),
  geburtsdatum: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
  geschlecht: z.enum(['m', 'w', 'd']).nullable().optional(),
  email: z.string().email().nullable().optional().or(z.literal('')),
  benutzername: z.string().max(64).nullable().optional(),
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
    .refine((n) =>
      Object.values(ACCOUNT_TYPES).includes(n as (typeof ACCOUNT_TYPES)[keyof typeof ACCOUNT_TYPES])
    )
    .optional()
    .nullable(),
  anmerkung: z.string().max(500).nullable().optional(),
  importId: z.string().nullable().optional(),
  sourceGuid: z.string().nullable().optional(),
  version: z.number().int().min(1).default(1),
});

export const importXmlPayloadSchema = z.object({
  filename: z.string().min(1).max(255),
  contentBase64: z.string().min(10).max(20_000_000),
  schoolHint: z.string().optional(),
});

export type PersonInput = z.infer<typeof personSchema>;
export type ImportXmlPayload = z.infer<typeof importXmlPayloadSchema>;
