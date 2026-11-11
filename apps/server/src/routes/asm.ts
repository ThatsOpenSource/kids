import { Router } from "express";
import { prisma } from "../db/prisma";
import { decryptField } from "../encryption/envelope";
import { logger } from "../services/logger";
import { mergeFlags } from "../services/groupFlags";

const router = Router();

function toAnsi(text: string): Buffer {
  // Windows-1252 / ANSI: map common German chars, fall back to latin1
  const map: Record<string, number> = {
    "€": 0x80, "‚": 0x82, "ƒ": 0x83, "„": 0x84, "…": 0x85, "†": 0x86, "‡": 0x87,
    "ˆ": 0x88, "‰": 0x89, "Š": 0x8A, "‹": 0x8B, "Œ": 0x8C, "Ž": 0x8E,
    "‘": 0x91, "’": 0x92, "“": 0x93, "”": 0x94, "•": 0x95, "–": 0x96, "—": 0x97,
    "˜": 0x98, "™": 0x99, "š": 0x9A, "›": 0x9B, "œ": 0x9C, "ž": 0x9E, "Ÿ": 0x9F,
  };
  const bytes: number[] = [];
  for (const ch of text) {
    const code = ch.charCodeAt(0);
    if (code < 128) bytes.push(code);
    else if (map[ch] !== undefined) bytes.push(map[ch]);
    else if (code <= 255) bytes.push(code);
    else bytes.push(0x3F); // ?
  }
  return Buffer.from(bytes);
}

router.post("/export", async (req, res) => {
  const { schoolId } = req.body;
  const where = schoolId ? { schools: { some: { schoolId } } } : {};

  const persons = await prisma.person.findMany({
    where,
    include: {
      schools: { include: { school: true } },
      roles: { include: { role: true } },
      classes: true,
    },
  });

  const schools = await prisma.school.findMany();
  const locations = schools.map(s => ({ location_id: s.amsLocationId, location_name: s.name }));

  const students: any[] = [];
  const staff: any[] = [];
  const classesSet = new Map<string, any>();
  const rosters: any[] = [];

  for (const p of persons) {
    const name = decryptField(p.nameEnc) || "";
    const first = decryptField(p.firstNameEnc) || "";
    const isStudent = p.roles.some(r => r.role.dataId === "Schueler");
    const primarySchool = p.schools[0]?.school;
    if (!primarySchool) continue;

    const soid = primarySchool.soid;
    const roleStr = p.roles.map(r => `${soid}-${r.role.dataId}`).join(",");
    const isTeacher = p.roles.some(r => r.role.dataId === "Lehrer");

    let classList: string[] = [];
    if (isTeacher) {
      const schoolClasses = await prisma.schoolClass.findMany({ where: { schoolId: primarySchool.id, active: true } });
      classList = schoolClasses.map(sc => `${soid}-${sc.name}`);
    } else {
      classList = p.classes.map(c => {
        const name = c.classKey.includes("-") ? c.classKey.split("-").slice(1).join("-") : c.classKey;
        return `${soid}-${name}`;
      });
    }

    const base = {
      person_id: p.amsId,
      person_number: p.lkid,
      first_name: first,
      last_name: name,
      email_address: p.systemEmail || "",
      location_id: primarySchool.amsLocationId,
      role: roleStr,
      classes: classList.join(","),
    };

    if (isStudent) {
      students.push({ ...base, grade_level: p.stufe || "", sis_username: p.username });
    } else {
      staff.push({ ...base, sis_username: p.username });
    }

    for (const cls of classList) {
      const clean = cls.split("-").slice(1).join("-");
      if (!classesSet.has(cls)) {
        classesSet.set(cls, {
          class_id: cls,
          class_number: clean,
          course_id: cls,
          location_id: primarySchool.amsLocationId,
          instructor_id: isTeacher ? p.amsId : "",
        });
      }
      if (isStudent) rosters.push({ roster_id: crypto.randomUUID(), class_id: cls, student_id: p.amsId });
    }
  }

  const classes = Array.from(classesSet.values());
  const courses = classes.map(c => ({ course_id: c.course_id, course_number: c.class_number, course_name: c.class_number, location_id: c.location_id }));

  const toCsv = (rows: any[], headers: string[]) => {
    const lines = [headers.join(",")];
    for (const r of rows) lines.push(headers.map(h => `"${(r[h] ?? "").toString().replace(/"/g, '""')}"`).join(","));
    return lines.join("\r\n");
  };

  const files: Record<string, string> = {
    "locations.csv": toCsv(locations, ["location_id", "location_name"]),
    "students.csv": toCsv(students, ["person_id", "person_number", "first_name", "last_name", "email_address", "sis_username", "location_id", "grade_level"]),
    "staff.csv": toCsv(staff, ["person_id", "person_number", "first_name", "last_name", "email_address", "sis_username", "location_id"]),
    "classes.csv": toCsv(classes, ["class_id", "class_number", "course_id", "location_id", "instructor_id"]),
    "courses.csv": toCsv(courses, ["course_id", "course_number", "course_name", "location_id"]),
    "rosters.csv": toCsv(rosters, ["roster_id", "class_id", "student_id"]),
  };

  const encoded: Record<string, string> = {};
  for (const [name, content] of Object.entries(files)) {
    encoded[name] = toAnsi(content).toString("base64");
  }

  logger.audit("ASM export", { persons: persons.length, students: students.length, staff: staff.length });
  res.json({
    files: encoded,
    encoding: "windows-1252",
    stats: { persons: persons.length, students: students.length, staff: staff.length, classes: classes.length },
  });
});

export default router;