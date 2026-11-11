import bcrypt from "bcrypt";
import { prisma } from "../db/prisma";

async function main() {
  const email = "admin@kids.local";
  const existing = await prisma.appUser.findUnique({ where: { email } });
  if (!existing) {
    await prisma.appUser.create({
      data: {
        email,
        passwordHash: await bcrypt.hash("ChangeMeNow!23", 12),
        role: "admin",
      },
    });
    console.log("Admin created: admin@kids.local / ChangeMeNow!23");
  } else {
    console.log("Admin already exists");
  }
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });