/**
 * Migrates legacy persons table → encrypted English-column model.
 * Run: bun src/scripts/migratePersonSchema.ts
 *
 * Strategy:
 * 1) Rename old table persons → persons_legacy
 * 2) prisma db push creates new persons
 * 3) Copy & re-encrypt from legacy
 * 4) Drop persons_legacy
 *
 * Safe for empty DB (no-op copy). Requires DATABASE_URL + ENCRYPTION_MASTER_KEY.
 */
import { PrismaClient } from '@prisma/client';
import {
  encryptField,
  decryptField,
  blindHash,
  encryptJson,
} from '../utils/crypto';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

async function tableExists(name: string): Promise<boolean> {
  const rows = await prisma.$queryRawUnsafe<{ exists: boolean }[]>(
    `SELECT EXISTS (
      SELECT FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = $1
    ) AS exists`,
    name
  );
  return !!rows[0]?.exists;
}

async function main() {
  console.log('KIDS person schema migration…');

  const hasPersons = await tableExists('persons');
  const hasLegacy = await tableExists('persons_legacy');

  if (hasPersons && !hasLegacy) {
    // Detect legacy by column name
    const cols = await prisma.$queryRawUnsafe<{ column_name: string }[]>(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema='public' AND table_name='persons'`
    );
    const names = cols.map((c) => c.column_name);
    const isLegacy = names.includes('nachname_enc') || names.includes('lkid') && names.includes('schul_id') && !names.includes('lkid_hash');

    if (isLegacy && names.includes('nachname_enc')) {
      console.log('Renaming persons → persons_legacy…');
      await prisma.$executeRawUnsafe(`ALTER TABLE persons RENAME TO persons_legacy`);
      console.log('Run: bunx prisma db push   then re-run this script.');
      return;
    }
  }

  if (!(await tableExists('persons_legacy'))) {
    console.log('No persons_legacy found – ensuring schema via db push only.');
    console.log('Done (nothing to migrate).');
    return;
  }

  if (!(await tableExists('persons'))) {
    console.error('Table persons missing. Run: bunx prisma db push');
    process.exit(1);
  }

  const legacy = await prisma.$queryRawUnsafe<any[]>(`SELECT * FROM persons_legacy`);
  console.log(`Migrating ${legacy.length} rows…`);

  let ok = 0;
  let fail = 0;

  for (const row of legacy) {
    try {
      const lkid = row.lkid as string;
      let lastName = row.nachname_enc ? decryptField(row.nachname_enc) : '';
      let firstName = row.vorname_enc ? decryptField(row.vorname_enc) : '';
      let email = row.email_enc ? decryptField(row.email_enc) : null;
      let emailMdm = row.email_mdm_enc ? decryptField(row.email_mdm_enc) : null;
      let password = row.passwort_enc ? decryptField(row.passwort_enc) : null;
      const schoolId = (row.schul_id || row.school_id) as string;
      const amsId = (row.ams_id as string) || randomUUID();
      const username = (row.benutzername as string) || null;
      const appleId = (row.apple_id as string) || null;
      const roles: string[] = Array.isArray(row.rollen) ? row.rollen : [];
      const applications: string[] = Array.isArray(row.anwendungen) ? row.anwendungen : [];
      const className = (row.klasse as string) || null;
      const grade = (row.stufe as string) || null;
      const dob =
        row.geburtsdatum instanceof Date
          ? row.geburtsdatum.toISOString().slice(0, 10)
          : row.geburtsdatum
            ? String(row.geburtsdatum).slice(0, 10)
            : null;

      await prisma.$executeRawUnsafe(
        `INSERT INTO persons (
          id, lkid_hash, lkid, ams_id_hash, ams_id, school_id_hash, school_id,
          last_name, first_name, date_of_birth, gender, email, email_mdm,
          username_hash, username, apple_id, password, roles,
          class_name, class_name_hash, grade, grade_hash, applications,
          active_attendance, terminated, note, import_id, source_id,
          version, created_at, updated_at, created_by, updated_by
        ) VALUES (
          $1::uuid, $2, $3, $4, $5, $6, $7,
          $8, $9, $10, $11, $12, $13,
          $14, $15, $16, $17, $18,
          $19, $20, $21, $22, $23,
          $24, $25, $26, $27, $28,
          $29, $30, $31, $32::uuid, $33::uuid
        )
        ON CONFLICT (lkid_hash) DO NOTHING`,
        row.id,
        blindHash(lkid),
        encryptField(lkid),
        blindHash(amsId),
        encryptField(amsId),
        blindHash(schoolId),
        encryptField(schoolId),
        encryptField(lastName),
        encryptField(firstName),
        dob ? encryptField(dob) : null,
        row.geschlecht ?? null,
        email ? encryptField(email) : null,
        emailMdm ? encryptField(emailMdm) : null,
        username ? blindHash(username) : null,
        username ? encryptField(username) : null,
        appleId ? encryptField(appleId) : null,
        password ? encryptField(password) : null,
        encryptJson(roles),
        className ? encryptField(className) : null,
        className ? blindHash(className) : blindHash(''),
        grade ? encryptField(grade) : null,
        grade ? blindHash(grade) : blindHash(''),
        encryptJson(applications),
        row.aktiver_besuch ?? true,
        row.terminiert ?? false,
        row.anmerkung ?? null,
        row.import_id ?? null,
        row.source_guid ?? null,
        row.version ?? 1,
        row.created_at ?? new Date(),
        row.updated_at ?? new Date(),
        row.created_by ?? null,
        row.updated_by ?? null
      );
      ok++;
    } catch (e) {
      fail++;
      console.error('Row failed', row.lkid, e);
    }
  }

  console.log(`Migrated ok=${ok} fail=${fail}`);
  console.log('Dropping persons_legacy…');
  await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS persons_legacy CASCADE`);
  // Rename school kz → code if needed
  try {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE schools RENAME COLUMN kz TO code`
    );
    console.log('schools.code → code');
  } catch {
    /* already renamed or missing */
  }
  try {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE app_users RENAME COLUMN totp_secret_enc TO totp_secret`
    );
  } catch {
    /* ignore */
  }
  console.log('Done.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
