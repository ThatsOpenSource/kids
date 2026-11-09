import { randomBytes } from 'crypto';
import { prisma } from '../db/prisma';
import { blindHash } from '../utils/crypto';
import { decryptPersonRow } from './personMapper';
import { logger } from '../utils/logger';
import {
  AMS_STUDENT_HEADERS,
  AMS_STAFF_HEADERS,
  AMS_CLASS_HEADERS,
  AMS_COURSE_HEADERS,
  AMS_LOCATION_HEADERS,
  AMS_ROSTER_HEADERS,
  generateAppleId,
  PERSON_ROLES,
  type AmsExportPackage,
  type SchoolConfig,
} from '@kids/shared';

function csvEscape(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toCsv(
  headers: readonly string[],
  rows: Record<string, string | number | null | undefined>[]
): string {
  const lines = [headers.map((h) => csvEscape(h)).join(',')];
  for (const row of rows) {
    lines.push(headers.map((h) => csvEscape(row[h])).join(','));
  }
  return lines.join('\n') + '\n';
}

/**
 * AMS person_number pattern from school export GUID:
 *   {numeric}-{numeric}-{7 uppercase letters}
 * Prefer XML sourceId; otherwise synthesise from schoolId + random parts.
 */
export function buildPersonNumber(
  schoolId: string,
  sourceId: string | null | undefined
): string {
  if (sourceId && /^[A-Za-z0-9]+-[A-Za-z0-9]+-[A-Za-z0-9]+$/.test(sourceId.trim())) {
    return sourceId.trim();
  }
  const mid = String(parseInt(randomBytes(4).toString('hex'), 16) % 1e10);
  const tail = randomBytes(4)
    .toString('hex')
    .toUpperCase()
    .replace(/[0-9]/g, (c) => String.fromCharCode(65 + (Number(c) % 26)))
    .slice(0, 7)
    .padEnd(7, 'X');
  const head = schoolId.replace(/\D/g, '') || '00000';
  return `${head}-${mid}-${tail}`;
}

/** class_id / course_id: {schoolId}-{className} as in classes.csv */
export function buildClassId(schoolId: string, className: string): string {
  return `${schoolId}-${className}`;
}

/** roster_id: {person_id}-{class_id} */
export function buildRosterId(personId: string, classId: string): string {
  return `${personId}-${classId}`;
}

export async function generateAmsExport(
  userId: string,
  schoolId?: string
): Promise<AmsExportPackage> {
  const schools = await prisma.school.findMany({
    where: {
      active: true,
      ...(schoolId ? { id: schoolId } : {}),
    },
    orderBy: { name: 'asc' },
  });

  if (!schools.length) {
    throw new Error(schoolId ? `Schule ${schoolId} nicht gefunden` : 'Keine aktiven Schulen');
  }

  const wherePerson: Record<string, unknown> = {
    terminated: false,
    activeAttendance: true,
  };
  if (schoolId) wherePerson.schoolIdHash = blindHash(schoolId);

  const rows = await prisma.person.findMany({ where: wherePerson, take: 20000 });
  const persons = rows.map((r) => decryptPersonRow(r));

  const studentsCsvRows: Record<string, string>[] = [];
  const staffCsvRows: Record<string, string>[] = [];
  const classCsvRows: Record<string, string>[] = [];
  const courseCsvRows: Record<string, string>[] = [];
  const locationCsvRows: Record<string, string>[] = [];
  const rosterCsvRows: Record<string, string>[] = [];

  for (const s of schools) {
    locationCsvRows.push({
      location_id: s.amsLocationId,
      location_name: s.name,
    });
  }

  const bySchool = new Map<string, typeof persons>();
  for (const p of persons) {
    if (!bySchool.has(p.schoolId)) bySchool.set(p.schoolId, []);
    bySchool.get(p.schoolId)!.push(p);
  }

  for (const school of schools) {
    const cfg = (school.config || {}) as SchoolConfig;
    const assignAll = cfg.assignAllTeachersToClasses !== false;
    const list = bySchool.get(school.id) || [];

    const teachers = list.filter(
      (p) =>
        p.roles.includes(PERSON_ROLES.LEHRER) || p.roles.includes(PERSON_ROLES.KLASSENLEHRER)
    );
    const students = list.filter((p) => p.roles.includes(PERSON_ROLES.SCHUELER));
    const otherStaff = list.filter(
      (p) =>
        !p.roles.includes(PERSON_ROLES.SCHUELER) &&
        !p.roles.includes(PERSON_ROLES.LEHRER) &&
        !p.roles.includes(PERSON_ROLES.KLASSENLEHRER)
    );

    for (const st of students) {
      const personId = st.lkid; // AMS person_id = LKID
      const personNumber = buildPersonNumber(school.id, st.sourceId);
      studentsCsvRows.push({
        person_id: personId,
        person_number: personNumber,
        first_name: st.firstName,
        middle_name: '',
        last_name: st.lastName,
        grade_level: st.grade || '',
        email_address: st.email || '',
        sis_username: st.username || '',
        password_policy: '',
        location_id: school.amsLocationId,
      });
    }

    for (const t of [...teachers, ...otherStaff]) {
      const personId = t.lkid;
      const personNumber = buildPersonNumber(school.id, t.sourceId);
      staffCsvRows.push({
        person_id: personId,
        person_number: personNumber,
        first_name: t.firstName,
        middle_name: '',
        last_name: t.lastName,
        email_address: t.email || '',
        sis_username: t.username || '',
        location_id: school.amsLocationId,
      });
    }

    const instructorIds = teachers.map((t) => t.lkid);
    const classes = new Map<string, typeof students>();
    for (const st of students) {
      const key = st.className || '_ohne_klasse';
      if (!classes.has(key)) classes.set(key, []);
      classes.get(key)!.push(st);
    }

    for (const [klasse, classStudents] of classes) {
      if (klasse === '_ohne_klasse') continue;
      const classId = buildClassId(school.id, klasse);
      const courseId = classId;

      const instr: Record<string, string> = {
        instructor_id: assignAll && instructorIds[0] ? instructorIds[0] : '',
        instructor_id_2: assignAll && instructorIds[1] ? instructorIds[1] : '',
        instructor_id_3: assignAll && instructorIds[2] ? instructorIds[2] : '',
      };

      classCsvRows.push({
        class_id: classId,
        class_number: klasse,
        course_id: courseId,
        ...instr,
        location_id: school.amsLocationId,
      });

      courseCsvRows.push({
        course_id: courseId,
        course_number: '',
        course_name: 'Klasse',
        location_id: school.amsLocationId,
      });

      for (const st of classStudents) {
        const personId = st.lkid;
        rosterCsvRows.push({
          roster_id: buildRosterId(personId, classId),
          class_id: classId,
          student_id: personId,
        });
      }
    }
  }

  const files = {
    students: toCsv(AMS_STUDENT_HEADERS, studentsCsvRows),
    staff: toCsv(AMS_STAFF_HEADERS, staffCsvRows),
    classes: toCsv(AMS_CLASS_HEADERS, classCsvRows),
    courses: toCsv(AMS_COURSE_HEADERS, courseCsvRows),
    locations: toCsv(AMS_LOCATION_HEADERS, locationCsvRows),
    rosters: toCsv(AMS_ROSTER_HEADERS, rosterCsvRows),
  };

  const stats = {
    students: studentsCsvRows.length,
    staff: staffCsvRows.length,
    classes: classCsvRows.length,
    courses: courseCsvRows.length,
    locations: locationCsvRows.length,
    rosters: rosterCsvRows.length,
  };

  await prisma.amsExport.create({
    data: { userId, schoolId: schoolId || null, stats },
  });

  logger.audit('AMS export generated', { userId, schoolId, stats });

  return {
    schoolId: schoolId || 'all',
    generatedAt: new Date().toISOString(),
    files,
    stats,
  };
}

export async function ensureAppleIds(schoolId?: string): Promise<number> {
  const where: Record<string, unknown> = { terminated: false };
  if (schoolId) where.schoolIdHash = blindHash(schoolId);

  const rows = await prisma.person.findMany({ where, take: 20000 });
  const schools = await prisma.school.findMany();
  const schoolById = Object.fromEntries(schools.map((s) => [s.id, s]));

  let count = 0;
  for (const row of rows) {
    const d = decryptPersonRow(row);
    if (d.appleId) continue;
    const school = schoolById[d.schoolId];
    const cfg = (school?.config || {}) as SchoolConfig;
    const appleId = generateAppleId(d.username, d.firstName, d.lastName, {
      domain: cfg.appleIdDomain,
      pattern: cfg.appleIdPattern,
      umlautMode: cfg.umlautMode || 'ae',
    });
    const { encryptField } = await import('../utils/crypto');
    await prisma.person.update({
      where: { id: row.id },
      data: { appleId: encryptField(appleId) },
    });
    count += 1;
  }
  logger.audit('Apple IDs generated', { count, schoolId });
  return count;
}
