import { prisma } from "../db/prisma";

export async function mergeFlags(person: { id: string; roles: { roleId: string }[]; schools: { schoolId: string }[]; flags: { flag: { dataId: string; label: string } }[] }) {
  const own = person.flags.map(f => f.flag.dataId);
  const groups = await prisma.groupFlag.findMany({ include: { flag: true } });
  const roleIds = new Set(person.roles.map(r => r.roleId));
  const schoolIds = new Set(person.schools.map(s => s.schoolId));
  const extra: string[] = [];
  for (const g of groups) {
    const roleMatch = !g.roleId || roleIds.has(g.roleId);
    const schoolMatch = !g.schoolId || schoolIds.has(g.schoolId);
    if (roleMatch && schoolMatch && !own.includes(g.flag.dataId)) extra.push(g.flag.dataId);
  }
  return [...own, ...extra];
}