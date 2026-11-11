import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });
dotenv.config({ path: path.resolve(process.cwd(), ".env"), override: true });

import { prisma } from "../db/prisma";
import { hashPassword } from "../services/authService";

async function main() {
  const email = (process.env.ADMIN_EMAIL || "admin@kids.local").toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "ChangeMe123!";
  console.log(`Seeding ${email}`);
  console.log(`  password source: ${process.env.ADMIN_PASSWORD ? ".env" : "default"} (${password.length} chars)`);
  console.log(`  pepper: ${process.env.PASSWORD_PEPPER ? "set" : "missing"}`);
  const { hash, salt } = await hashPassword(password);
  const existing = await prisma.appUser.findUnique({ where: { email } });
  if (!existing) {
    await prisma.appUser.create({
      data: { email, passwordHash: hash, salt, role: "admin", mustChangePassword: true },
    });
    console.log("Created admin:", email);
  } else {
    await prisma.appUser.update({
      where: { email },
      data: { passwordHash: hash, salt, mustChangePassword: true, active: true },
    });
    console.log("Reset admin password:", email);
  }
}
main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });