import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { ZodTypeAny, z } from 'zod';
import { AppError } from '../shared/errors';

type Source = 'body' | 'query' | 'params';

/**
 * Zod ile istek doğrulama. Doğrulanmış veri `res.locals.validated[source]` içine yazılır.
 */
export function validate<T extends ZodTypeAny>(schema: T, source: Source = 'body'): RequestHandler {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      next(
        AppError.validation(
          'Gönderilen veriler geçersiz',
          result.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
        ),
      );
      return;
    }
    const locals = res.locals as { validated?: Partial<Record<Source, unknown>> };
    locals.validated = { ...(locals.validated ?? {}), [source]: result.data };
    next();
  };
}

export function getValidated<T extends ZodTypeAny>(res: Response, _schema: T, source: Source = 'body'): z.infer<T> {
  const locals = res.locals as { validated?: Partial<Record<Source, unknown>> };
  return locals.validated?.[source] as z.infer<T>;
}

/** Async controller'ları sarmalayarak hataları next'e iletir. */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}
