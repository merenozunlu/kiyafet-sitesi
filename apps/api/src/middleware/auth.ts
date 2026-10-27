import type { RequestHandler } from 'express';
import type { UserRole } from '@shop/shared';
import { AppError } from '../shared/errors';
import { verifyAccessToken } from '../shared/tokens';
import { db } from '../shared/db';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
}

declare module 'express-serve-static-core' {
  interface Request {
    user?: AuthUser;
  }
}

function extractBearer(header: string | undefined): string | null {
  if (!header) return null;
  const [scheme, token] = header.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) return null;
  return token;
}

/** Token varsa doğrular ve req.user'ı doldurur; yoksa misafir olarak devam eder. */
export const optionalAuth: RequestHandler = async (req, _res, next) => {
  const token = extractBearer(req.headers.authorization);
  if (!token) return next();
  const payload = verifyAccessToken(token);
  if (!payload) return next(AppError.unauthorized('Oturum süreniz doldu, lütfen tekrar giriş yapın'));
  const user = await db().users.findById(payload.sub);
  if (!user || !user.isActive) return next(AppError.unauthorized('Hesap bulunamadı veya pasif'));
  req.user = { id: user.id, email: user.email, role: user.role };
  next();
};

export const requireAuth: RequestHandler = async (req, res, next) => {
  const token = extractBearer(req.headers.authorization);
  if (!token) return next(AppError.unauthorized());
  const payload = verifyAccessToken(token);
  if (!payload) return next(AppError.unauthorized('Oturum süreniz doldu, lütfen tekrar giriş yapın'));
  const user = await db().users.findById(payload.sub);
  if (!user || !user.isActive) return next(AppError.unauthorized('Hesap bulunamadı veya pasif'));
  req.user = { id: user.id, email: user.email, role: user.role };
  void res;
  next();
};

export function requireRole(...roles: UserRole[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.user) return next(AppError.unauthorized());
    if (!roles.includes(req.user.role)) return next(AppError.forbidden());
    next();
  };
}
