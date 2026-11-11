import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const schoolSchema = z.object({
  sid: z.string().regex(/^\d{5}$/),
  sgid: z.string().min(1),
  name: z.string().min(1),
  schoolType: z.string().optional(),
  config: z.object({
    umlautMode: z.enum(["ae", "strip"]).optional(),
    mdmEmailDomain: z.string().optional(),
    mdmEmailPattern: z.string().optional(),
    appleIdDomain: z.string().optional(),
    passwordPolicy: z.object({
      length: z.number().min(8).max(32).optional(),
      upper: z.boolean().optional(),
      lower: z.boolean().optional(),
      digits: z.boolean().optional(),
      special: z.boolean().optional(),
      words: z.array(z.string()).optional(),
      wordCount: z.number().optional(),
    }).optional(),
    assignAllTeachersToClasses: z.boolean().optional(),
  }).optional(),
});

export const roleSchema = z.object({
  vceType: z.number().int(),
  dataId: z.string().min(1),
  label: z.string().min(1),
  aliases: z.array(z.string()).optional(),
});

export const flagSchema = z.object({
  dataId: z.string().min(1),
  label: z.string().min(1),
  requires: z.array(z.string()).optional(),
});

export const personCommitSchema = z.object({
  lkid: z.string().min(5),
  name: z.string().min(1),
  firstName: z.string().min(1),
  dateOfBirth: z.string().optional(),
  sex: z.enum(["m", "w", "d"]).optional(),
  email: z.string().optional(),
  username: z.string().optional(),
  sids: z.array(z.string()),
  roles: z.array(z.string()), // dataIds
  flags: z.array(z.string()),
  classes: z.array(z.string()),
  schoolStart: z.string().optional(),
  schoolEnd: z.string().optional(),
  active: z.boolean().optional(),
});

export const importPreviewSchema = z.object({
  filename: z.string(),
  xmlBase64: z.string().max(20_000_000),
});