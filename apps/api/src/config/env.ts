import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { z } from 'zod';

const here = path.dirname(fileURLToPath(import.meta.url));
// Kök .env dosyasını yükle (apps/api/src/config -> kök = 4 seviye yukarı)
dotenv.config({ path: path.resolve(here, '../../../../.env') });
dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  API_BASE_PATH: z.string().default('/api/v1'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  DATA_SOURCE: z.enum(['memory', 'prisma']).default('prisma'),
  DATA_PERSIST_FILE: z.string().optional(),
  DATABASE_URL: z.string().default('file:./dev.db'),
  JWT_ACCESS_SECRET: z.string().min(16, 'JWT_ACCESS_SECRET en az 16 karakter olmalıdır').default('dev-access-secret-change-me-please-32chars'),
  JWT_REFRESH_SECRET: z.string().min(16, 'JWT_REFRESH_SECRET en az 16 karakter olmalıdır').default('dev-refresh-secret-change-me-please-32chars'),
  ACCESS_TOKEN_TTL: z.string().default('15m'),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(7),
  COOKIE_SECURE: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
  ADMIN_EMAIL: z.string().email().default('admin@example.com'),
  ADMIN_PASSWORD: z.string().min(8).default('Admin12345'),
  DEMO_CUSTOMER_EMAIL: z.string().email().default('musteri@example.com'),
  DEMO_CUSTOMER_PASSWORD: z.string().min(8).default('Musteri12345'),
  PAYMENT_PROVIDER: z.enum(['mock', 'iyzico']).default('mock'),
  MOCK_WEBHOOK_SECRET: z.string().default('mock-webhook-secret'),
  IYZICO_API_KEY: z.string().optional(),
  IYZICO_SECRET_KEY: z.string().optional(),
  IYZICO_BASE_URL: z.string().default('https://sandbox-api.iyzipay.com'),
  UPLOAD_DIR: z.string().default('./uploads'),
  PUBLIC_API_URL: z.string().default('http://localhost:4000'),
});

const parsed = envSchema.safeParse({
  ...process.env,
  // Test ortamında gizli anahtar yoksa güvenli varsayılan ver
  JWT_ACCESS_SECRET:
    process.env.JWT_ACCESS_SECRET ??
    (process.env.NODE_ENV === 'test' ? 'test-access-secret-0123456789' : undefined),
  JWT_REFRESH_SECRET:
    process.env.JWT_REFRESH_SECRET ??
    (process.env.NODE_ENV === 'test' ? 'test-refresh-secret-0123456789' : undefined),
});

if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('\n');
  throw new Error(`Ortam değişkenleri geçersiz:\n${issues}\n.env.example dosyasını .env olarak kopyalayın.`);
}

export const env = parsed.data;
export const isProd = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';
