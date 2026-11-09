import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { prisma } from '../db/prisma';
import { hashPassword, verifyPassword, sha256 } from '../utils/crypto';
import { logger } from '../utils/logger';
import type { JwtPayload } from '@kids/shared';
import type { LoginInput, RegisterUserInput } from '../validation/schemas';
import { verifyTotp, beginTotpSetup, confirmTotpSetup } from './totpService';

function signAccess(user: { id: string; email: string; role: string }, deviceFingerprint?: string) {
  const payload: Omit<JwtPayload, 'iat' | 'exp'> = {
    sub: user.id,
    email: user.email,
    role: user.role,
    deviceFingerprint,
  };
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_TTL,
  } as jwt.SignOptions);
}

function signPurpose(userId: string, purpose: 'totp_pending' | 'totp_setup', minutes = 10) {
  return jwt.sign({ sub: userId, purpose }, env.JWT_ACCESS_SECRET, {
    expiresIn: `${minutes}m`,
  });
}

function verifyPurpose(token: string, purpose: string): string {
  const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as { sub: string; purpose?: string };
  if (decoded.purpose !== purpose) throw new Error('Ungültiger Token');
  return decoded.sub;
}

async function issueTokens(
  user: { id: string; email: string; role: string; displayName: string },
  deviceFingerprint?: string
) {
  const accessToken = signAccess(user, deviceFingerprint);
  const refreshToken = jwt.sign({ sub: user.id }, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_TTL,
  } as jwt.SignOptions);

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: sha256(refreshToken),
      deviceFp: deviceFingerprint ?? null,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.appUser.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  return {
    accessToken,
    refreshToken,
    expiresIn: 15 * 60,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      displayName: user.displayName,
    },
  };
}

export async function registerUser(data: RegisterUserInput) {
  const existing = await prisma.appUser.findUnique({ where: { email: data.email } });
  if (existing) throw new Error('E-Mail bereits registriert');
  const passwordHash = await hashPassword(data.password);
  const user = await prisma.appUser.create({
    data: {
      email: data.email,
      passwordHash,
      displayName: data.displayName,
      role: data.role,
    },
    select: { id: true, email: true, displayName: true, role: true },
  });
  logger.audit('User registered', { userId: user.id, email: user.email, role: user.role });
  return user;
}

/**
 * Password step only. Never issues a full session until 2FA is active + verified.
 */
export async function login(data: LoginInput) {
  const user = await prisma.appUser.findUnique({ where: { email: data.email } });
  if (!user || !user.active) {
    logger.security('Login failed', { email: data.email });
    throw new Error('Ungültige Anmeldedaten');
  }
  const ok = await verifyPassword(data.password, user.passwordHash);
  if (!ok) {
    logger.security('Login failed – bad password', { userId: user.id });
    throw new Error('Ungültige Anmeldedaten');
  }

  if (user.totpEnabled) {
    return {
      requiresTotp: true as const,
      preAuthToken: signPurpose(user.id, 'totp_pending', 5),
      message: '2FA-Code erforderlich',
    };
  }

  // No 2FA yet → force setup inside auth shell; no session tokens
  const setup = await beginTotpSetup(user.id, user.email);
  return {
    requiresTotpSetup: true as const,
    setupToken: signPurpose(user.id, 'totp_setup', 15),
    qrDataUrl: setup.qrDataUrl,
    secret: setup.secret,
    message: '2FA muss vor dem ersten Zugang eingerichtet werden',
  };
}

export async function loginWithTotp(
  preAuthToken: string,
  totpCode: string,
  deviceFingerprint?: string
) {
  const userId = verifyPurpose(preAuthToken, 'totp_pending');
  const user = await prisma.appUser.findFirst({ where: { id: userId, active: true } });
  if (!user) throw new Error('User nicht gefunden');
  if (!user.totpEnabled) throw new Error('2FA nicht aktiv');

  const totpOk = await verifyTotp(user.id, totpCode);
  if (!totpOk) {
    logger.security('Login TOTP failed', { userId: user.id });
    throw new Error('2FA-Code ungültig');
  }

  const tokens = await issueTokens(user, deviceFingerprint);
  logger.audit('User login (2FA)', { userId: user.id });
  return { ...tokens, totpEnabled: true };
}

/**
 * Complete mandatory first-time 2FA setup, then issue session.
 */
export async function completeTotpSetupAndLogin(
  setupToken: string,
  totpCode: string,
  deviceFingerprint?: string
) {
  const userId = verifyPurpose(setupToken, 'totp_setup');
  const user = await prisma.appUser.findFirst({ where: { id: userId, active: true } });
  if (!user) throw new Error('User nicht gefunden');

  const ok = await confirmTotpSetup(userId, totpCode);
  if (!ok) throw new Error('2FA-Code ungültig – QR erneut scannen oder Code prüfen');

  const tokens = await issueTokens(user, deviceFingerprint);
  logger.audit('User login after 2FA setup', { userId: user.id });
  return { ...tokens, totpEnabled: true };
}

export async function refreshAccessToken(refreshToken: string, deviceFingerprint?: string) {
  try {
    const decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as { sub: string };
    const hash = sha256(refreshToken);
    const rt = await prisma.refreshToken.findUnique({ where: { tokenHash: hash } });
    if (!rt || rt.revokedAt || rt.expiresAt < new Date()) throw new Error('Refresh token ungültig');
    if (rt.deviceFp && deviceFingerprint && rt.deviceFp !== deviceFingerprint) {
      throw new Error('Gerätebindung ungültig');
    }
    const user = await prisma.appUser.findFirst({ where: { id: decoded.sub, active: true } });
    if (!user) throw new Error('User nicht gefunden');
    if (!user.totpEnabled) throw new Error('2FA erforderlich – bitte erneut anmelden');

    return { accessToken: signAccess(user, deviceFingerprint), expiresIn: 15 * 60 };
  } catch {
    throw new Error('Refresh fehlgeschlagen');
  }
}

export async function revokeRefreshToken(refreshToken: string) {
  const hash = sha256(refreshToken);
  await prisma.refreshToken.updateMany({
    where: { tokenHash: hash },
    data: { revokedAt: new Date() },
  });
}

export async function getUserTotpStatus(userId: string) {
  return prisma.appUser.findUnique({
    where: { id: userId },
    select: { totpEnabled: true, totpVerifiedAt: true },
  });
}
