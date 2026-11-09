import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole, type AuthRequest } from '../middleware/auth';
import { prisma } from '../db/prisma';
import { validate } from '../middleware/validate';
import { personsQuerySchema } from '../validation/schemas';
import { PERSON_ROLES } from '@kids/shared';
import { blindHash, encryptField, encryptJson } from '../utils/crypto';
import { decryptPersonRow, toApiPerson, attachSto } from '../services/personMapper';
import { logger } from '../utils/logger';

const router = Router();

const roleSchema = z.enum([
  PERSON_ROLES.SCHUELER,
  PERSON_ROLES.LEHRER,
  PERSON_ROLES.SONSTIGE,
  PERSON_ROLES.KLASSENLEHRER,
]);

const patchPersonSchema = z.object({
  roles: z.array(roleSchema).min(1).optional(),
  rollen: z.array(roleSchema).min(1).optional(),
  className: z.string().max(64).nullable().optional(),
  klasse: z.string().max(64).nullable().optional(),
  emailMdm: z.string().email().nullable().optional().or(z.literal('')),
  applications: z.array(z.string().max(32)).optional(),
  note: z.string().max(500).nullable().optional(),
});

router.get('/', requireAuth, validate(personsQuerySchema, 'query'), async (req, res) => {
  const { schulId, schoolId, q, klasse, rolle, kontentyp } = req.query as Record<
    string,
    string | undefined
  >;
  const sid = schoolId || schulId;

  const where: Record<string, unknown> = {};
  if (sid) where.schoolIdHash = blindHash(sid);
  if (klasse) where.classNameHash = blindHash(klasse);

  const rows = await prisma.person.findMany({
    where,
    orderBy: [{ updatedAt: 'desc' }],
    take: 5000,
  });

  const schoolIds = [...new Set(rows.map((r) => {
    try { return decryptPersonRow(r).schoolId; } catch { return null; }
  }).filter(Boolean))] as string[];
  const schools = await prisma.school.findMany({ where: { id: { in: schoolIds } } });
  const kzBySchool = Object.fromEntries(schools.map((s) => [s.id, s.kzSnr]));

  let persons = rows.map((r) => {
    const api = toApiPerson(decryptPersonRow(r));
    return attachSto(api, kzBySchool[api.schoolId]);
  });

  if (rolle) {
    persons = persons.filter((p) => p.roles.includes(rolle as any));
  }
  if (kontentyp) {
    const kt = Number(kontentyp);
    persons = persons.filter((p) => p.accountType === kt);
  }
  if (q) {
    const s = q.toLowerCase();
    persons = persons.filter(
      (r) =>
        r.lastName.toLowerCase().includes(s) ||
        r.firstName.toLowerCase().includes(s) ||
        r.lkid.toLowerCase().includes(s) ||
        (r.username || '').toLowerCase().includes(s) ||
        (r.appleId || '').toLowerCase().includes(s) ||
        (r.email || '').toLowerCase().includes(s) ||
        (r.emailMdm || '').toLowerCase().includes(s) ||
        (r.className || '').toLowerCase().includes(s)
    );
  }

  const klassen = [...new Set(persons.map((p) => p.className).filter(Boolean))].sort() as string[];
  const schulIds = [...new Set(persons.map((p) => p.schoolId))].sort();
  const rollen = [...new Set(persons.flatMap((p) => p.roles))].sort();

  res.json({
    persons,
    total: persons.length,
    facets: { klassen, schulIds, rollen },
  });
});

router.patch(
  '/:lkid',
  requireAuth,
  requireRole('admin', 'operator'),
  validate(patchPersonSchema),
  async (req: AuthRequest, res) => {
    const lkidHash = blindHash(req.params.lkid);
    const person = await prisma.person.findUnique({ where: { lkidHash } });
    if (!person) return res.status(404).json({ error: 'Person nicht gefunden' });

    const body = req.body as z.infer<typeof patchPersonSchema>;
    const roles = body.roles || body.rollen;
    const className = body.className !== undefined ? body.className : body.klasse;

    const data: Record<string, unknown> = {
      updatedById: req.user!.sub,
      version: { increment: 1 },
    };
    if (roles) data.roles = encryptJson(roles);
    if (className !== undefined) {
      data.className = className ? encryptField(className) : null;
      data.classNameHash = className ? blindHash(className) : blindHash('');
    }
    if (body.applications) data.applications = encryptJson(body.applications);
    if (body.note !== undefined) data.note = body.note;
    if (body.emailMdm !== undefined) {
      data.emailMdm = body.emailMdm ? encryptField(body.emailMdm) : null;
    }

    const updated = await prisma.person.update({ where: { id: person.id }, data });
    const api = toApiPerson(decryptPersonRow(updated));

    await prisma.personVersion.create({
      data: {
        personId: person.id,
        version: updated.version,
        snapshot: api as any,
        changedById: req.user!.sub,
        changeReason: 'manual-edit',
      },
    });

    logger.audit('Person updated', { lkid: req.params.lkid, userId: req.user!.sub });
    res.json({ person: api });
  }
);

router.get('/:lkid/versions', requireAuth, async (req, res) => {
  const person = await prisma.person.findUnique({ where: { lkidHash: blindHash(req.params.lkid) } });
  if (!person) return res.status(404).json({ error: 'Nicht gefunden' });
  const versions = await prisma.personVersion.findMany({
    where: { personId: person.id },
    orderBy: { version: 'desc' },
  });
  res.json({ versions });
});

export default router;
