/**
 * Seed known schools + role definitions.
 * Run: cd apps/server && bun src/scripts/seedSchools.ts
 */
import { prisma } from '../db/prisma';

async function main() {
  await prisma.school.upsert({
    where: { id: '50267' },
    create: {
      id: '50267',
      code: 'gym-gsdg',
      kzSnr: '45',
      name: 'Georg-Samuel-Dörffel-Gymnasium - Staatliches Gymnasium Weida',
      type: 'gymnasium',
      location: 'Weida',
      config: {
        umlautMode: 'ae',
        assignAllTeachersToClasses: true,
        appleIdDomain: 'appleid.ds-greiz.de',
        defaultFlags: ['sp-prt'],
      },
    },
    update: {
      code: 'gym-gsdg',
      name: 'Georg-Samuel-Dörffel-Gymnasium - Staatliches Gymnasium Weida',
      type: 'gymnasium',
      location: 'Weida',
    },
  });
  console.log('School 50267 seeded');

  const roles = [
    {
      id: 'schueler',
      name: 'Schüler',
      canonical: 'schueler',
      aliases: ['schueler', 'schüler', 'student', 'pupil'],
      accountType: 431,
      defaultFlags: ['sp-iot'],
    },
    {
      id: 'lehrer',
      name: 'Lehrer',
      canonical: 'lehrer',
      aliases: ['lehrer', 'lehrerin', 'teacher'],
      accountType: 411,
      defaultFlags: ['sp-prt', 'sg-mdm'],
    },
    {
      id: 'sonstige',
      name: 'Sonstige',
      canonical: 'sonstige',
      aliases: ['sonstige', 'other'],
      accountType: 421,
      defaultFlags: [] as string[],
    },
  ];

  for (const r of roles) {
    await prisma.roleDefinition.upsert({
      where: { id: r.id },
      create: r,
      update: {
        name: r.name,
        aliases: r.aliases,
        accountType: r.kontentyp,
        defaultFlags: r.defaultFlags,
      },
    });
  }
  console.log('Roles seeded');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
