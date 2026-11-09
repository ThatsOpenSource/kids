import { prisma } from '../db/prisma';
import { blindHash } from '../utils/crypto';
import { decryptPersonRow, attachSto, toApiPerson } from './personMapper';
import { buildStoBnGroup, buildStoClass } from '@kids/shared';
import { logger } from '../utils/logger';

export interface CsvExportRequest {
  schoolId: string;
  klasse?: string;
  includeHeaders?: boolean;
  columns?: string[];
}

const DEFAULT_COLUMNS = [
  'lkid',
  'amsId',
  'lastName',
  'firstName',
  'dateOfBirth',
  'schoolEntryDate',
  'schoolEndDate',
  'gender',
  'email',
  'emailMdm',
  'username',
  'appleId',
  'schoolId',
  'className',
  'grade',
  'roles',
  'accountType',
  'applications',
  'activeAttendance',
  'terminated',
  'stoBnGroup',
  'stoClass',
] as const;

function esc(v: string | number | boolean | null | undefined): string {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (/[";\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function exportPersonsCsv(userId: string, req: CsvExportRequest) {
  if (!req.schoolId) throw new Error('schoolId ist erforderlich');
  const where: Record<string, unknown> = { schoolIdHash: blindHash(req.schoolId) };
  if (req.klasse) where.classNameHash = blindHash(req.klasse);

  const rows = await prisma.person.findMany({ where, take: 10000 });
  const school = await prisma.school.findUnique({ where: { id: req.schoolId } });
  const kzSnr = school?.kzSnr || null;
  const cols = (req.columns?.length ? req.columns : [...DEFAULT_COLUMNS]).filter((c) =>
    (DEFAULT_COLUMNS as readonly string[]).includes(c as any)
  );

  const lines: string[] = [];
  if (req.includeHeaders !== false) lines.push(cols.join(';'));

  for (const r of rows) {
    const d = decryptPersonRow(r);
    const map: Record<string, string> = {
      lkid: d.lkid,
      amsId: d.amsId,
      lastName: d.lastName,
      firstName: d.firstName,
      dateOfBirth: d.dateOfBirth || '',
      schoolEntryDate: d.schoolEntryDate || '',
      schoolEndDate: d.schoolEndDate || '',
      gender: d.gender || '',
      email: d.email || '',
      emailMdm: d.emailMdm || '',
      username: d.username || '',
      appleId: d.appleId || '',
      schoolId: d.schoolId,
      className: d.className || '',
      grade: d.grade || '',
      roles: d.roles.join(','),
      accountType: String(d.accountType),
      applications: d.applications.join(','),
      activeAttendance: d.activeAttendance ? 'j' : 'n',
      terminated: d.terminated ? 'j' : 'n',
      stoBnGroup: buildStoBnGroup(kzSnr, d.roles) || '',
      stoClass: buildStoClass(kzSnr, d.className) || '',
    };
    lines.push(cols.map((c) => esc(map[c])).join(';'));
  }

  const scope = req.klasse ? `${req.schoolId}_${req.klasse}` : req.schoolId;
  const filename = `kids_export_${scope}_${new Date().toISOString().slice(0, 10)}.csv`;
  logger.audit('CSV export', { userId, schoolId: req.schoolId, count: rows.length });
  return { csv: lines.join('\n') + '\n', count: rows.length, filename };
}
