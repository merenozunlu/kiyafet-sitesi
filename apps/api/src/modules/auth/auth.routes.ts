import { Router, type Response } from 'express';
import { forgotPasswordSchema, loginSchema, registerSchema, resetPasswordSchema } from '@shop/shared';
import { asyncHandler, getValidated, validate } from '../../middleware/validate';
import { authLimiter, sensitiveLimiter } from '../../middleware/rate-limit';
import { requireAuth } from '../../middleware/auth';
import { REFRESH_COOKIE_NAME, refreshCookieOptions } from '../../shared/tokens';
import { db } from '../../shared/db';
import { toUserDto } from '../../shared/mappers';
import { AppError } from '../../shared/errors';
import { authService, type SessionResult } from './auth.service';

export const authRouter = Router();

function sendSession(res: Response, session: SessionResult, status = 200) {
  res.cookie(REFRESH_COOKIE_NAME, session.refreshToken, refreshCookieOptions(session.refreshExpiresAt));
  res.status(status).json({ data: { user: session.user, accessToken: session.accessToken } });
}

function clearSession(res: Response) {
  res.clearCookie(REFRESH_COOKIE_NAME, refreshCookieOptions());
}

authRouter.post(
  '/register',
  authLimiter,
  validate(registerSchema),
  asyncHandler(async (_req, res) => {
    const input = getValidated(res, registerSchema);
    sendSession(res, await authService.register(input), 201);
  }),
);

authRouter.post(
  '/login',
  authLimiter,
  validate(loginSchema),
  asyncHandler(async (_req, res) => {
    const input = getValidated(res, loginSchema);
    sendSession(res, await authService.login(input));
  }),
);

authRouter.post(
  '/refresh',
  asyncHandler(async (req, res) => {
    const raw = (req.cookies as Record<string, string | undefined>)[REFRESH_COOKIE_NAME];
    try {
      sendSession(res, await authService.refresh(raw));
    } catch (e) {
      clearSession(res);
      throw e;
    }
  }),
);

authRouter.post(
  '/logout',
  asyncHandler(async (req, res) => {
    const raw = (req.cookies as Record<string, string | undefined>)[REFRESH_COOKIE_NAME];
    await authService.logout(raw);
    clearSession(res);
    res.status(204).end();
  }),
);

authRouter.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await db().users.findById(req.user!.id);
    if (!user) throw AppError.unauthorized();
    res.json({ data: toUserDto(user) });
  }),
);

authRouter.post(
  '/forgot-password',
  sensitiveLimiter,
  validate(forgotPasswordSchema),
  asyncHandler(async (_req, res) => {
    const { email } = getValidated(res, forgotPasswordSchema);
    res.json({ data: await authService.forgotPassword(email) });
  }),
);

authRouter.post(
  '/reset-password',
  sensitiveLimiter,
  validate(resetPasswordSchema),
  asyncHandler(async (_req, res) => {
    const { token, password } = getValidated(res, resetPasswordSchema);
    await authService.resetPassword(token, password);
    res.json({ data: { message: 'Şifreniz güncellendi. Yeni şifrenizle giriş yapabilirsiniz.' } });
  }),
);
