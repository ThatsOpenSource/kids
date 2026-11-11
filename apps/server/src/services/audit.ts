import { prisma } from "../db/prisma";
import { encryptField } from "../encryption/envelope";

export async function log(entityType: string, entityId: string, action: string, userId: string | null, details: any) {
  const enc = await encryptField(JSON.stringify(details));
  await prisma.auditLog.create({ data: { entityType, entityId, action, userId, details: enc } });
}