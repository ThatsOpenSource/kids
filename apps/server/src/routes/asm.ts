import { Router } from "express";
import { prisma } from "../db/prisma";
import { decryptField } from "../encryption/envelope";
import { mergeFlags } from "../services/groupFlags";
import { ok } from "../lib/respond";

const router = Router();

function toAnsi(text: string): Buffer {
  const bytes: number[] = [];
  for (const ch of text) {
    const code = ch.charCodeAt(0);
    bytes.push(code < 128 ? code : code <= 255 ? code : 0x3F);
  }
  return Buffer.from(bytes);
}

router.post("/export", async (req, res) => {
  const persons = await prisma.person.findMany({
    include: { schools: { include: { school: true } }, roles: { include: { role: true } }, classes: true },
  });
  const students: any[] = [], staff: any[] = [];
  for (const p of persons) {
    const primary = p.schools[0]?.school;
    if (!primary) continue;
    const soid = primary.soid;
    const roleStr = p.roles.map(r => `${soid}-${r.role.dataId}`).join(",");
    const isTeacher = p.roles.some(r => r.role.dataId === "Lehrer");
    const isStudent = p.roles.some(r => r.role.dataId === "Schueler");
    let classList: string[] = [];
    if (isTeacher) {
      const schoolIds = p.schools.map(s => s.schoolId);
      const classes = await prisma.personClass.findMany({ where: { person: { schools: { some: { schoolId: { in: schoolIds } } } } }, include: { person: { include: { schools: { include: { school: true } } } } } });
      const seen = new Set<string>();
      for (const c of classes) {
        const school = c.person.schools[0]?.school;
        if (!school) continue;
        const name = c.classKey.includes("-") ? c.classKey.split("-").slice(1).join("-") : c.classKey;
        const key = `${school.soid}-${name}`;
        if (!seen.has(key)) { seen.add(key); classList.push(key); }
      }
    } else {
      classList = p.classes.map(c => {
        const name = c.classKey.includes("-") ? c.classKey.split("-").slice(1).join("-") : c.classKey;
        return `${soid}-${name}`;
      });
    }
    const base = {
      person_id: p.lkid, person_number: p.amsId,
      first_name: await decryptField(p.firstName) || "", last_name: await decryptField(p.name) || "",
      email_address: p.systemEmail || "", location_id: primary.amsLocationId,
      role: roleStr, classes: classList.join(","),
    };
    if (isStudent) students.push({ ...base, grade_level: p.stufe || "", sis_username: p.username });
    else staff.push({ ...base, sis_username: p.username });
  }
  const locations = [...new Map(persons.filter(p => p.schools[0]).map(p => [p.schools[0].school.amsLocationId, { location_id: p.schools[0].school.amsLocationId, location_name: p.schools[0].school.name }])).values()];
  const classesSet = new Map<string, any>();
  const rosters: any[] = [];
  for (const p of persons) {
    const primary = p.schools[0]?.school;
    if (!primary) continue;
    const soid = primary.soid;
    const isStudent = p.roles.some(r => r.role.dataId === "Schueler");
    const isTeacher = p.roles.some(r => r.role.dataId === "Lehrer");
    let classList: string[] = [];
    if (isTeacher) {
      const sc = await prisma.schoolClass.findMany({ where: { schoolId: primary.id, active: true } });
      classList = sc.map(c => `${soid}-${c.name}`);
    } else {
      classList = p.classes.map(c => {
        const name = c.classKey.includes("-") ? c.classKey.split("-").slice(1).join("-") : c.classKey;
        return `${soid}-${name}`;
      });
    }
    for (const cls of classList) {
      const clean = cls.split("-").slice(1).join("-");
      if (!classesSet.has(cls)) classesSet.set(cls, { class_id: cls, class_number: clean, course_id: cls, location_id: primary.amsLocationId, instructor_id: isTeacher ? p.amsId : "" });
      if (isStudent) rosters.push({ roster_id: crypto.randomUUID(), class_id: cls, student_id: p.amsId });
    }
  }
  const classes = Array.from(classesSet.values());
  const courses = classes.map(c => ({ course_id: c.course_id, course_number: c.class_number, course_name: c.class_number, location_id: c.location_id }));

  const toCsv = (rows: any[], headers: string[]) => {
    const lines = [headers.join(",")];
    for (const r of rows) lines.push(headers.map(h => `"${(r[h] ?? "").toString().replace(/"/g, '""')}"`).join(","));
    return "\uFEFF" + lines.join("\r\n");
  };
  const files: Record<string, string> = {
    "locations.csv": toCsv(locations, ["location_id", "location_name"]),
    "students.csv": toCsv(students, ["person_id", "person_number", "first_name", "last_name", "email_address", "sis_username", "location_id", "grade_level", "role", "classes"]),
    "staff.csv": toCsv(staff, ["person_id", "person_number", "first_name", "last_name", "email_address", "sis_username", "location_id", "role", "classes"]),
    "classes.csv": toCsv(classes, ["class_id", "class_number", "course_id", "location_id", "instructor_id"]),
    "courses.csv": toCsv(courses, ["course_id", "course_number", "course_name", "location_id"]),
    "rosters.csv": toCsv(rosters, ["roster_id", "class_id", "student_id"]),
  };
  const encoded: Record<string, string> = {};
  for (const [name, content] of Object.entries(files)) encoded[name] = Buffer.from(content, "utf8").toString("base64");
  ok(res, { files: encoded, encoding: "utf-8", stats: { students: students.length, staff: staff.length, classes: classes.length } });
});

export default router;