import type { Database } from '../repositories';
import { MemoryStore } from './store';
import { buildSeedData, type SeedOptions } from './seed';
import {
  MemoryAddressRepository,
  MemoryAuditLogRepository,
  MemoryCartRepository,
  MemoryCategoryRepository,
  MemoryFavoriteRepository,
  MemoryIdempotencyRepository,
  MemoryOrderRepository,
  MemoryPasswordResetTokenRepository,
  MemoryPaymentRepository,
  MemoryProductRepository,
  MemoryRefreshTokenRepository,
  MemoryUserRepository,
  MemoryVariantRepository,
} from './repositories';

export interface MemoryDatabaseOptions extends SeedOptions {
  persistFile?: string | null;
}

export function createMemoryDatabase(opts: MemoryDatabaseOptions): Database & { store: MemoryStore } {
  const store = new MemoryStore(opts.persistFile ?? null);
  const loaded = store.loadFromDisk();
  if (!loaded || store.data.products.length === 0) {
    store.replace(buildSeedData(opts));
    store.flush();
  }

  const db: Database & { store: MemoryStore } = {
    kind: 'memory',
    store,
    users: new MemoryUserRepository(store),
    refreshTokens: new MemoryRefreshTokenRepository(store),
    passwordResetTokens: new MemoryPasswordResetTokenRepository(store),
    addresses: new MemoryAddressRepository(store),
    categories: new MemoryCategoryRepository(store),
    products: new MemoryProductRepository(store),
    variants: new MemoryVariantRepository(store),
    carts: new MemoryCartRepository(store),
    favorites: new MemoryFavoriteRepository(store),
    orders: new MemoryOrderRepository(store),
    payments: new MemoryPaymentRepository(store),
    auditLogs: new MemoryAuditLogRepository(store),
    idempotency: new MemoryIdempotencyRepository(store),
    transaction<T>(fn: (tx: Database) => Promise<T>): Promise<T> {
      return store.mutex.runExclusive(() => fn(db));
    },
    async reset() {
      store.replace(buildSeedData(opts));
    },
  };
  return db;
}
