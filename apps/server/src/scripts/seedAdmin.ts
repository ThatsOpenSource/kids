/**
 * Seed initial admin user.
 * Run: cd apps/server && bun src/scripts/seedAdmin.ts
 */
import { prisma } from '../db/prisma';
import { hashPassword } from '../utils/crypto';

async function main() {
  const email = (process.env.ADMIN_EMAIL || 'admin@kids.local').toLowerCase();
  const password = process.env.ADMIN_PASSWORD || 'ChangeMeNow!23';
  const passwordHash = await hashPassword(password);

  const user = await prisma.appUser.upsert({
    where: { email },
    create: {
      email,
      passwordHash,
      displayName: 'KIDS Admin',
      role: 'admin',
    },
    update: {
      passwordHash,
      active: true,
      role: 'admin',
    },
  });
  console.log('Admin ready:', { id: user.id, email: user.email, role: user.role });
  console.log('Login with:', email, '/', password);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
