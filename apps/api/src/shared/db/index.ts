import { createPrismaDatabase } from './prisma';
import { logger } from '../logger';
import type { Database } from './repositories';

let instance: Database | null = null;

export async function initDatabase(): Promise<Database> {
  if (instance) return instance;

  instance = await createPrismaDatabase();
  logger.info('Veri kaynağı: prisma (SQLite)');
  return instance;
}

export function db(): Database {
  if (!instance) throw new Error('Veritabanı başlatılmadı. Önce initDatabase() çağırın.');
  return instance;
}

export type { Database } from './repositories';
