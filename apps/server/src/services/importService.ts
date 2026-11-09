import { prisma } from '../db/prisma';
import { parseSchoolXml, assertSingleXml } from './xmlParser';
import { blindHash, encryptField, encryptJson } from '../utils/crypto';
import {
  buildPersonCreateData,
  decryptPersonRow,
  toApiPerson,
} from './personMapper';
import { generateUsername } from '@kids/shared';
import { logger } from '../utils/logger';
import type { Person, ImportPreview, PersonDiff } from '@kids/shared';

function asDateIso(d: Date | string | null | undefined): string | null {
  if (!d) return null;
  if (d instanceof Date) return d.toISOString().slice(0, 10);
  return String(d).slice(0, 10);
}

async function usernameTaken(username: string, excludeLkidHash?: string): Promise<boolean> {
  const h = blindHash(username);
  const found = await prisma.person.findFirst({
    where: {
      usernameHash: h,
      ...(excludeLkidHash ? { NOT: { lkidHash: excludeLkidHash } } : {}),
    },
    select: { id: true },
  });
  return !!found;
}

async function generateUniqueUsername(vorname: string, nachname: string, umlautMode: 'ae' | 'strip') {
  let base = generateUsername(vorname, nachname, umlautMode);
  let candidate = base;
  let n = 2;
  while (await usernameTaken(candidate)) {
    candidate = `${base}${n}`;
    n++;
    if (n > 9999) throw new Error('Kein freier Benutzername');
  }
  return candidate;
}

export async function previewImport(
  xmlContent: string,
  filename: string
): Promise<ImportPreview> {
  assertSingleXml(xmlContent);
  const parsed = parseSchoolXml(xmlContent);
  const schoolId = parsed.schoolId;

  await prisma.school.upsert({
    where: { id: schoolId },
    create: {
      id: schoolId,
      code: schoolId,
      name: `Schule ${schoolId}`,
      type: 'sonstige',
    },
    update: {},
  });

  const school = await prisma.school.findUnique({ where: { id: schoolId } });
  const umlautMode = ((school?.config as any)?.umlautMode || 'ae') as 'ae' | 'strip';

  const diffs: PersonDiff[] = [];
  const finalPersons: Person[] = [];

  for (const raw of parsed.persons) {
    const lkid = raw.lkid!;
    const existing = await prisma.person.findUnique({ where: { lkidHash: blindHash(lkid) } });
    const ex = existing ? decryptPersonRow(existing) : null;

    let username = ex?.username || raw.benutzername;
    if (!ex && raw.vorname && raw.nachname) {
      username = await generateUniqueUsername(raw.vorname, raw.nachname, umlautMode);
    }

    const person: Person = {
      lkid,
      schulId: schoolId,
      nachname: raw.nachname || ex?.lastName || '',
      vorname: raw.vorname || ex?.firstName || '',
      geburtsdatum: raw.geburtsdatum ? asDateIso(raw.geburtsdatum as any) : ex?.dateOfBirth,
      schoolEntryDate: (raw as any).schoolEntryDate ? asDateIso((raw as any).schoolEntryDate) : ex?.schoolEntryDate,
      schoolEndDate: (raw as any).schoolEndDate ? asDateIso((raw as any).schoolEndDate) : ex?.schoolEndDate,
      geschlecht: (raw.geschlecht as any) || ex?.gender || null,
      email: raw.email ?? ex?.email ?? null,
      benutzername: username || null,
      appleId: ex?.appleId || raw.appleId || null,
      rollen: (raw.rollen as any) || ex?.roles || [],
      klasse: raw.klasse ?? ex?.className ?? null,
      stufe: raw.stufe ?? ex?.grade ?? null,
      anwendungen: (raw.anwendungen as any) || ex?.applications || [],
      aktiverBesuch: raw.aktiverBesuch ?? ex?.activeAttendance ?? true,
      terminiert: raw.terminiert ?? ex?.terminated ?? false,
      kontentyp: raw.kontentyp ?? null,
      sourceGuid: raw.sourceGuid || null,
      version: ex?.version || 1,
    };

    if (!ex) {
      diffs.push({ lkid, status: 'new' });
    } else {
      const changes: PersonDiff['changes'] = {};
      if ((ex.className || '') !== (person.klasse || '')) {
        changes.klasse = { from: ex.className, to: person.klasse };
      }
      if (ex.schoolId !== person.schulId) {
        changes.schulId = { from: ex.schoolId, to: person.schulId };
      }
      const rolesChanged =
        JSON.stringify([...ex.roles].sort()) !== JSON.stringify([...(person.rollen || [])].sort());
      if (rolesChanged) changes.rollen = { from: ex.roles, to: person.rollen };
      diffs.push({
        lkid,
        status: Object.keys(changes).length ? 'changed' : 'unchanged',
        changes: Object.keys(changes).length ? changes : undefined,
      });
    }
    finalPersons.push(person);
  }

  return {
    schoolId,
    persons: finalPersons,
    diffs,
    warnings: parsed.warnings,
    totalStudents: finalPersons.filter((p) => p.rollen?.includes('schueler')).length,
    totalTeachers: finalPersons.filter((p) => p.rollen?.includes('lehrer')).length,
    missingRequired: [],
  };
}

export async function commitImport(
  userId: string,
  persons: Person[],
  generatePasswords = true
) {
  let inserted = 0;
  let updated = 0;
  let skippedUnchanged = 0;
  const generatedPasswords: Array<{ lkid: string; password: string; benutzername?: string }> = [];

  for (const p of persons) {
    const lkidHash = blindHash(p.lkid);
    const existing = await prisma.person.findUnique({ where: { lkidHash } });

    if (existing) {
      const ex = decryptPersonRow(existing);
      const data: Record<string, unknown> = {
        updatedById: userId,
        version: { increment: 1 },
      };
      let changed = false;

      if (ex.schoolId !== p.schulId) {
        data.schoolId = encryptField(p.schulId);
        data.schoolIdHash = blindHash(p.schulId);
        changed = true;
      }
      if ((ex.className || '') !== (p.klasse || '')) {
        data.className = p.klasse ? encryptField(p.klasse) : null;
        data.classNameHash = p.klasse ? blindHash(p.klasse) : blindHash('');
        changed = true;
      }
      if ((ex.grade || '') !== (p.stufe || '')) {
        data.grade = p.stufe ? encryptField(p.stufe) : null;
        data.gradeHash = p.stufe ? blindHash(p.stufe) : blindHash('');
        changed = true;
      }
      if (JSON.stringify([...ex.roles].sort()) !== JSON.stringify([...(p.rollen || [])].sort())) {
        data.roles = encryptJson(p.rollen || []);
        changed = true;
      }
      if (
        JSON.stringify([...(ex.applications || [])].sort()) !==
        JSON.stringify([...(p.anwendungen || [])].sort())
      ) {
        data.applications = encryptJson(p.anwendungen || []);
        changed = true;
      }
      if (ex.activeAttendance !== !!p.aktiverBesuch) {
        data.activeAttendance = !!p.aktiverBesuch;
        changed = true;
      }
      if (ex.terminated !== !!p.terminiert) {
        data.terminated = !!p.terminiert;
        changed = true;
      }

      if (!changed) {
        skippedUnchanged++;
        continue;
      }

      await prisma.person.update({ where: { id: existing.id }, data });
      updated++;
    } else {
      let password: string | undefined;
      if (generatePasswords) {
        password = Math.random().toString(36).slice(2, 10) + 'A1';
      }
      const create = buildPersonCreateData({
        lkid: p.lkid,
        schoolId: p.schulId,
        lastName: p.nachname,
        firstName: p.vorname,
        dateOfBirth: asDateIso(p.geburtsdatum as any),
        schoolEntryDate: asDateIso((p as any).schoolEntryDate),
        schoolEndDate: asDateIso((p as any).schoolEndDate),
        gender: p.geschlecht || null,
        email: p.email || null,
        username: p.benutzername || null,
        appleId: p.appleId || null,
        password: password || null,
        roles: p.rollen || [],
        className: p.klasse || null,
        grade: p.stufe || null,
        applications: p.anwendungen || [],
        activeAttendance: p.aktiverBesuch ?? true,
        terminated: p.terminiert ?? false,
        sourceId: p.sourceGuid || null,
        createdById: userId,
      });
      await prisma.person.create({ data: create as any });
      inserted++;
      if (password) {
        generatedPasswords.push({
          lkid: p.lkid,
          password,
          benutzername: p.benutzername || undefined,
        });
      }
    }
  }

  logger.audit('Import committed', { userId, inserted, updated, skippedUnchanged });
  return { inserted, updated, skippedUnchanged, generatedPasswords };
}


/** @deprecated name kept for routes – same as previewImport (userId unused in preview) */
export async function processXmlImport(xmlContent: string, filename: string, _userId?: string) {
  return previewImport(xmlContent, filename);
}
