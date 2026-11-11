import { prisma } from "../db/prisma";

async function main() {
  const sid = "23045";
  const existing = await prisma.school.findUnique({ where: { sid } });
  if (!existing) {
    await prisma.school.create({
      data: {
        sid,
        sgid: "50267",
        soid: "45",
        name: "Gymnasium Georg-Samuel-Dörffel Weida",
        schoolType: "Gymnasium",
        config: {
          umlautMode: "ae",
          passwordPolicy: { length: 12, upper: true, lower: true, digits: true, special: false, words: ["Schule", "Weida", "Greiz"], wordCount: 0 },
          appleIdDomain: "appleid.ds-greiz.de",
          mdmEmailDomain: "schulen-greiz.de",
          mdmEmailPattern: "{username}@{soid}.{domain}",
          assignAllTeachersToClasses: true,
        },
      },
    });
    console.log("Seeded school 23045");
  }

  const roles = [
    { vceType: 411, dataId: "Lehrer", label: "Lehrer", aliases: ["LuL", "Teacher"] },
    { vceType: 431, dataId: "Schueler", label: "Schüler", aliases: ["SuS", "Student"] },
    { vceType: 421, dataId: "Sonstige", label: "Sonstige", aliases: ["Other"] },
  ];
  for (const r of roles) {
    await prisma.roleDefinition.upsert({
      where: { vceType: r.vceType },
      update: { label: r.label, aliases: r.aliases },
      create: r,
    });
  }

  const flags = [
    { dataId: "dvv", label: "Datenverarbeiterungsvertrag", requires: [] },
    { dataId: "mdm", label: "MDM", requires: ["dvv"] },
    { dataId: "cloud", label: "Nextcloud", requires: ["dvv"] },
    { dataId: "print", label: "PaperCut", requires: ["dvv"] },
    { dataId: "iot", label: "Zentrale Dienste", requires: ["dvv"] },
  ];
  for (const f of flags) {
    await prisma.flagDefinition.upsert({
      where: { dataId: f.dataId },
      update: { label: f.label, requires: f.requires },
      create: f,
    });
  }
  console.log("Roles + Flags seeded");
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });