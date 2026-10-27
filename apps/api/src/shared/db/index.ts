import { env, isTest } from '../../config/env';
import { logger } from '../logger';
import { createMemoryDatabase } from './memory';
import type { Database } from './repositories';

let instance: Database | null = null;

export async function initDatabase(): Promise<Database> {
  if (instance) return instance;

  if (env.DATA_SOURCE === 'prisma') {
    const { createPrismaDatabase } = await import('./prisma');
    instance = await createPrismaDatabase();
    logger.info('Veri kaynağı: prisma (PostgreSQL)');
    return instance;
  }

  instance = createMemoryDatabase({
    adminEmail: env.ADMIN_EMAIL,
    adminPassword: env.ADMIN_PASSWORD,
    demoCustomerEmail: env.DEMO_CUSTOMER_EMAIL,
    demoCustomerPassword: env.DEMO_CUSTOMER_PASSWORD,
    persistFile: isTest ? null : env.DATA_PERSIST_FILE,
  });
  logger.info(
    { persist: isTest ? null : env.DATA_PERSIST_FILE },
    'Veri kaynağı: memory (seed verili, DB gerektirmez)',
  );
  return instance;
}

export function db(): Database {
  if (!instance) throw new Error('Veritabanı başlatılmadı. Önce initDatabase() çağırın.');
  return instance;
}

export type { Database } from './repositories';
