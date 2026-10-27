import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';
import type { ApiErrorBody } from '@shop/shared';
import { AppError } from '../shared/errors';
import { logger } from '../shared/logger';
import { isProd } from '../config/env';

export const notFoundHandler: RequestHandler = (_req, res) => {
  const body: ApiErrorBody = { error: { code: 'NOT_FOUND', message: 'Kaynak bulunamadı' } };
  res.status(404).json(body);
};

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof AppError) {
    const body: ApiErrorBody = {
      error: { code: err.code, message: err.message, ...(err.details ? { details: err.details } : {}) },
    };
    res.status(err.status).json(body);
    return;
  }

  if (err instanceof ZodError) {
    const body: ApiErrorBody = {
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Gönderilen veriler geçersiz',
        details: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      },
    };
    res.status(400).json(body);
    return;
  }

  // body-parser JSON hatası
  if (typeof err === 'object' && err && 'type' in err && (err as { type?: string }).type === 'entity.parse.failed') {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Geçersiz JSON gövdesi' } });
    return;
  }

  logger.error({ err, path: req.path, method: req.method }, 'Beklenmeyen hata');
  const body: ApiErrorBody = {
    error: {
      code: 'INTERNAL_ERROR',
      message: isProd ? 'Beklenmeyen bir hata oluştu' : ((err as Error)?.message ?? 'Beklenmeyen bir hata oluştu'),
    },
  };
  res.status(500).json(body);
};
