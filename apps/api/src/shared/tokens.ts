import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import type { UserRole } from '@shop/shared';
import { env } from '../config/env';

export interface AccessTokenPayload {
  sub: string;
  role: UserRole;
  email: string;
}

export function signAccessToken(payload: AccessTokenPayload): string {
  const options: jwt.SignOptions = {
    subject: payload.sub,
    expiresIn: env.ACCESS_TOKEN_TTL as jwt.SignOptions['expiresIn'],
    issuer: 'shop-api',
    audience: 'shop-web',
  };
  return jwt.sign({ role: payload.role, email: payload.email }, env.JWT_ACCESS_SECRET, options);
}

export function verifyAccessToken(token: string): AccessTokenPayload | null {
  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET, {
      issuer: 'shop-api',
      audience: 'shop-web',
    }) as jwt.JwtPayload;
    if (!decoded.sub || typeof decoded.role !== 'string') return null;
    return { sub: decoded.sub, role: decoded.role as UserRole, email: String(decoded.email ?? '') };
  } catch {
    return null;
  }
}

/** Rastgele opak token üretir (refresh / parola sıfırlama). */
export function generateOpaqueToken(bytes = 48): string {
  return crypto.randomBytes(bytes).toString('base64url');
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function refreshTokenExpiry(): Date {
  return new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 86_400_000);
}

export const REFRESH_COOKIE_NAME = 'refresh_token';

export function refreshCookieOptions(expires?: Date) {
  return {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: 'lax' as const,
    path: `${env.API_BASE_PATH}/auth`,
    ...(expires ? { expires } : {}),
  };
}
