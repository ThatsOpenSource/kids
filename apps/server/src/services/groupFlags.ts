import { prisma } from "../db/prisma";

export async function groupFlagsFor(person: {
  roles: { roleId: string }[];
  schools: { schoolId: string }[];
}): Promise<string[]> {
  const roleIds = person.roles.map(r => r.roleId);
  const schoolIds = person.schools.map(s => s.schoolId);
  if (!roleIds.length && !schoolIds.length) return [];

  const groups = await prisma.groupFlag.findMany({
    where: {
      OR: [
        { roleId: { in: roleIds }, schoolId: null },
        { schoolId: { in: schoolIds }, roleId: null },
        { roleId: { in: roleIds }, schoolId: { in: schoolIds } },
      ],
    },
    include: { flag: true },
  });
  return [...new Set(groups.map(g => g.flag.dataId))];
}

export async function mergeFlags(person: {
  flags: { flag: { dataId: string } }[];
  roles: { roleId: string }[];
  schools: { schoolId: string }[];
}): Promise<string[]> {
  const direct = person.flags.map(f => f.flag.dataId);
  const group = await groupFlagsFor(person);
  return [...new Set([...direct, ...group])];
}