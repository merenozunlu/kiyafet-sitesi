import rateLimit from 'express-rate-limit';
import { isTest } from '../config/env';

const handler = (_req: unknown, res: { status: (c: number) => { json: (b: unknown) => void } }) => {
  res.status(429).json({
    error: { code: 'RATE_LIMITED', message: 'Çok fazla istek gönderdiniz. Lütfen biraz sonra tekrar deneyin.' },
  });
};

export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: isTest ? 10_000 : 600,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler,
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: isTest ? 10_000 : 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  handler,
});

export const sensitiveLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: isTest ? 10_000 : 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler,
});
