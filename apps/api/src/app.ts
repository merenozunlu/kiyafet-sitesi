import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import pinoHttp from 'pino-http';
import path from 'node:path';
import { env, isTest } from './config/env';
import { logger } from './shared/logger';
import { errorHandler, notFoundHandler } from './middleware/error-handler';
import { generalLimiter } from './middleware/rate-limit';
import { db } from './shared/db';
import { productsRouter } from './modules/products/products.routes';
import { categoriesRouter } from './modules/categories/categories.routes';
import { authRouter } from './modules/auth/auth.routes';
import { usersRouter } from './modules/users/users.routes';
import { addressesRouter } from './modules/addresses/addresses.routes';
import { cartRouter } from './modules/cart/cart.routes';
import { favoritesRouter } from './modules/favorites/favorites.routes';
import { newsletterRouter } from './modules/newsletter/newsletter.routes';
import { ordersRouter } from './modules/orders/orders.routes';
import { paymentsRouter } from './modules/payments/payments.routes';
import { adminRouter } from './modules/admin/admin.routes';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );
  app.use(
    cors({
      origin: env.CORS_ORIGIN.split(',').map((o) => o.trim()),
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key', 'X-Requested-With'],
    }),
  );
  app.use(cookieParser());
  // Webhook ham gövdeye ihtiyaç duyar; JSON parser'ı raw body saklayacak şekilde yapılandır
  app.use(
    express.json({
      limit: '1mb',
      verify: (req, _res, buf) => {
        (req as express.Request & { rawBody?: Buffer }).rawBody = buf;
      },
    }),
  );
  if (!isTest) {
    app.use(
      pinoHttp({
        logger,
        autoLogging: { ignore: (req) => req.url?.includes('/health') ?? false },
        customLogLevel: (_req, res, err) => (err || res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info'),
      }),
    );
  }

  const api = express.Router();
  api.use(generalLimiter);

  api.get('/health', (_req, res) => {
    res.json({ data: { status: 'ok', dataSource: db().kind, time: new Date().toISOString() } });
  });

  api.use('/products', productsRouter);
  api.use('/categories', categoriesRouter);
  api.use('/auth', authRouter);
  api.use('/users', usersRouter);
  api.use('/addresses', addressesRouter);
  api.use('/cart', cartRouter);
  api.use('/favorites', favoritesRouter);
  api.use('/newsletter', newsletterRouter);
  api.use('/orders', ordersRouter);
  api.use('/payments', paymentsRouter);
  api.use('/admin', adminRouter);

  app.use(env.API_BASE_PATH, api);
  app.use('/uploads', express.static(path.resolve(env.UPLOAD_DIR)));

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
