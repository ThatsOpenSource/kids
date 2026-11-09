import { prisma } from '../db/prisma';
import { encryptField, decryptField, blindHash } from '../utils/crypto';
import { decryptPersonRow } from './personMapper';
import { generatePassword, type PasswordPolicy } from '@kids/shared';
import { logger } from '../utils/logger';

export type PasswordScopeRequest = {
  scope: 'person' | 'class' | 'school' | 'role' | 'all';
  ref?: string;
  schoolId?: string;
  force?: boolean;
};

async function resolveWhere(req: PasswordScopeRequest) {
  if (req.scope === 'person' && req.ref) {
    return { lkidHash: blindHash(req.ref) };
  }
  if (req.scope === 'school' && req.schoolId) {
    return { schoolIdHash: blindHash(req.schoolId) };
  }
  if (req.scope === 'class' && req.ref && req.schoolId) {
    return { schoolIdHash: blindHash(req.schoolId), classNameHash: blindHash(req.ref) };
  }
  if (req.scope === 'all') return {};
  // role scope: filter after decrypt
  if (req.schoolId) return { schoolIdHash: blindHash(req.schoolId) };
  return {};
}

export async function generatePasswordsForScope(userId: string, req: PasswordScopeRequest) {
  const where = await resolveWhere(req);
  let rows = await prisma.person.findMany({ where, take: 5000 });
  if (req.scope === 'role' && req.ref) {
    rows = rows.filter((r) => {
      const d = decryptPersonRow(r);
      return d.roles.includes(req.ref as any);
    });
  }

  const policy: PasswordPolicy = {
    length: 12,
    includeUpper: true,
    includeLower: true,
    includeDigits: true,
    includeSpecial: false,
  };

  const out: any[] = [];
  for (const r of rows) {
    if (r.password && !req.force) continue;
    const d = decryptPersonRow(r);
    const password = generatePassword(policy);
    await prisma.person.update({
      where: { id: r.id },
      data: { password: encryptField(password) },
    });
    out.push({
      lkid: d.lkid,
      benutzername: d.username,
      nachname: d.lastName,
      vorname: d.firstName,
      klasse: d.className,
      password,
    });
  }

  await prisma.passwordRevealLog.create({
    data: {
      userId,
      scope: req.scope,
      scopeRef: req.ref || req.schoolId || null,
      count: out.length,
    },
  });
  logger.audit('Passwords generated', { userId, count: out.length, scope: req.scope });
  return { count: out.length, passwords: out };
}

export async function revealPasswordsForScope(userId: string, req: PasswordScopeRequest) {
  const where = await resolveWhere(req);
  let rows = await prisma.person.findMany({ where, take: 5000 });
  if (req.scope === 'role' && req.ref) {
    rows = rows.filter((r) => decryptPersonRow(r).roles.includes(req.ref as any));
  }

  const out: any[] = [];
  for (const r of rows) {
    if (!r.password) continue;
    const d = decryptPersonRow(r);
    out.push({
      lkid: d.lkid,
      benutzername: d.username,
      nachname: d.lastName,
      vorname: d.firstName,
      klasse: d.className,
      password: decryptField(r.password),
    });
  }

  await prisma.passwordRevealLog.create({
    data: {
      userId,
      scope: `reveal:${req.scope}`,
      scopeRef: req.ref || req.schoolId || null,
      count: out.length,
    },
  });
  logger.audit('Passwords revealed', { userId, count: out.length, scope: req.scope });
  return { count: out.length, passwords: out };
}
