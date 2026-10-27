import pino from 'pino';
import { env, isProd, isTest } from '../config/env';

export const logger = pino({
  level: isTest ? 'silent' : isProd ? 'info' : 'debug',
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'res.headers["set-cookie"]',
      '*.password',
      '*.passwordHash',
      '*.card',
      '*.card.number',
      '*.card.cvc',
      '*.accessToken',
      '*.refreshToken',
    ],
    censor: '[GİZLİ]',
  },
  transport: isProd || isTest ? undefined : { target: 'pino-pretty', options: { colorize: true } },
  base: { service: 'shop-api', env: env.NODE_ENV },
});
