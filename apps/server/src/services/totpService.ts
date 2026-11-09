import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import { prisma } from '../db/prisma';
import { encryptField, decryptField } from '../utils/crypto';
import { logger } from '../utils/logger';

authenticator.options = { window: 1, step: 30 };

const ISSUER = 'KIDS';

export async function beginTotpSetup(userId: string, email: string) {
  const secret = authenticator.generateSecret();
  const otpauth = authenticator.keyuri(email, ISSUER, secret);
  const qrDataUrl = await QRCode.toDataURL(otpauth, { margin: 2, width: 256 });

  await prisma.appUser.update({
    where: { id: userId },
    data: {
      totpSecret: encryptField(secret),
      totpEnabled: false, // enabled only after first successful verify
      totpVerifiedAt: null,
    },
  });

  logger.audit('TOTP setup started', { userId });
  return { secret, otpauth, qrDataUrl };
}

export async function confirmTotpSetup(userId: string, code: string): Promise<boolean> {
  const user = await prisma.appUser.findUnique({ where: { id: userId } });
  if (!user?.totpSecret) throw new Error('Kein TOTP-Setup aktiv');
  const secret = decryptField(user.totpSecret);
  const ok = authenticator.check(code.replace(/\s/g, ''), secret);
  if (!ok) return false;

  await prisma.appUser.update({
    where: { id: userId },
    data: { totpEnabled: true, totpVerifiedAt: new Date() },
  });
  logger.audit('TOTP enabled', { userId });
  return true;
}

export async function verifyTotp(userId: string, code: string): Promise<boolean> {
  const user = await prisma.appUser.findUnique({ where: { id: userId } });
  if (!user?.totpEnabled || !user.totpSecret) return false;
  const secret = decryptField(user.totpSecret);
  return authenticator.check(code.replace(/\s/g, ''), secret);
}

export async function disableTotp(userId: string, code: string): Promise<boolean> {
  const ok = await verifyTotp(userId, code);
  if (!ok) return false;
  await prisma.appUser.update({
    where: { id: userId },
    data: { totpEnabled: false, totpSecret: null, totpVerifiedAt: null },
  });
  logger.audit('TOTP disabled', { userId });
  return true;
}

export function needsTotpSetup(user: { totpEnabled: boolean; totpSecret: string | null }): boolean {
  return !user.totpEnabled;
}
