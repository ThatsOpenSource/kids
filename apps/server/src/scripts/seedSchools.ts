import { prisma } from "../db/prisma";

async function main() {
  const sid = "23045";
  const existing = await prisma.school.findUnique({ where: { sid } });
  if (!existing) {
    await prisma.school.create({
      data: {
        sid, sgid: "50267", soid: "45", name: "Gymnasium Georg-Samuel-Dörffel Weida", typeId: "23",
        config: { mdmEmailDomain: "schulen-greiz.de", mdmEmailPattern: "{username}@{soid}.{domain}", appleIdDomain: "appleid.ds-greiz.de" },
      },
    });
  }
  const roles = [
    { vceType: 411, dataId: "Lehrer", label: "Lehrer", aliases: ["LuL", "Teacher", "l"] },
    { vceType: 431, dataId: "Schueler", label: "Schüler", aliases: ["SuS", "Student", "s"] },
    { vceType: 421, dataId: "Sonstige", label: "Sonstige", aliases: ["Other"] },
  ];
  for (const r of roles) {
    await prisma.roleDefinition.upsert({ where: { vceType: r.vceType }, update: r, create: r });
  }
  const types = [
    { prefix: "21", label: "Grundschule" },
    { prefix: "22", label: "Regelschule" },
    { prefix: "23", label: "Gymnasium" },
    { prefix: "24", label: "Berufsschule" },
    { prefix: "27", label: "Förderschule" },
  ];
  for (const t of types) {
    await prisma.schoolTypeConfig.upsert({ where: { prefix: t.prefix }, update: t, create: t });
  }
  const flags = [
    { dataId: "dvv", label: "Datenverarbeiterungsvertrag", requires: [] },
    { dataId: "mdm", label: "MDM", requires: ["dvv"] },
    { dataId: "cloud", label: "Nextcloud", requires: ["dvv"] },
    { dataId: "print", label: "PaperCut", requires: ["dvv"] },
    { dataId: "iot", label: "Zentrale Dienste", requires: ["dvv"] },
  ];
  for (const f of flags) {
    await prisma.flagDefinition.upsert({ where: { dataId: f.dataId }, update: f, create: f });
  }
  console.log("Seeded school, roles, flags");
}
main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });