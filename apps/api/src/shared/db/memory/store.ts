import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type {
  AddressEntity,
  AuditLogEntity,
  CartEntity,
  CartItemEntity,
  CategoryEntity,
  FavoriteEntity,
  IdempotencyRecordEntity,
  OrderEntity,
  OrderItemEntity,
  OrderStatusHistoryEntity,
  PasswordResetTokenEntity,
  PaymentEntity,
  ProductEntity,
  ProductImageEntity,
  ProductVariantEntity,
  RefreshTokenEntity,
  UserEntity,
} from '../entities';

export interface StoreData {
  users: UserEntity[];
  refreshTokens: RefreshTokenEntity[];
  passwordResetTokens: PasswordResetTokenEntity[];
  addresses: AddressEntity[];
  categories: CategoryEntity[];
  products: ProductEntity[];
  productImages: ProductImageEntity[];
  productVariants: ProductVariantEntity[];
  carts: CartEntity[];
  cartItems: CartItemEntity[];
  favorites: FavoriteEntity[];
  orders: OrderEntity[];
  orderItems: OrderItemEntity[];
  orderStatusHistory: OrderStatusHistoryEntity[];
  payments: PaymentEntity[];
  auditLogs: AuditLogEntity[];
  idempotency: IdempotencyRecordEntity[];
}

export function emptyStoreData(): StoreData {
  return {
    users: [],
    refreshTokens: [],
    passwordResetTokens: [],
    addresses: [],
    categories: [],
    products: [],
    productImages: [],
    productVariants: [],
    carts: [],
    cartItems: [],
    favorites: [],
    orders: [],
    orderItems: [],
    orderStatusHistory: [],
    payments: [],
    auditLogs: [],
    idempotency: [],
  };
}

/** Basit asenkron mutex: yazma işlemlerini serileştirir. */
export class Mutex {
  private queue: Promise<void> = Promise.resolve();

  runExclusive<T>(fn: () => Promise<T>): Promise<T> {
    const run = this.queue.then(fn, fn);
    this.queue = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }
}

const DATE_KEYS = new Set([
  'createdAt',
  'updatedAt',
  'expiresAt',
  'revokedAt',
  'usedAt',
  'deletedAt',
]);

function reviveDates(_key: string, value: unknown): unknown {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const obj = value as Record<string, unknown>;
    for (const k of Object.keys(obj)) {
      if (DATE_KEYS.has(k) && typeof obj[k] === 'string') obj[k] = new Date(obj[k] as string);
    }
  }
  return value;
}

export class MemoryStore {
  data: StoreData;
  readonly mutex = new Mutex();
  private persistFile: string | null;
  private persistTimer: NodeJS.Timeout | null = null;

  constructor(persistFile?: string | null) {
    this.persistFile = persistFile ? path.resolve(persistFile) : null;
    this.data = emptyStoreData();
  }

  id(): string {
    return randomUUID();
  }

  /** Dosyadan yükler; başarılıysa true döner. */
  loadFromDisk(): boolean {
    if (!this.persistFile || !fs.existsSync(this.persistFile)) return false;
    try {
      const raw = fs.readFileSync(this.persistFile, 'utf8');
      const parsed = JSON.parse(raw, reviveDates) as Partial<StoreData>;
      this.data = { ...emptyStoreData(), ...parsed };
      return true;
    } catch {
      return false;
    }
  }

  /** Yazma sonrası çağrılır; kısa bir gecikmeyle diske yazar. */
  touch(): void {
    if (!this.persistFile) return;
    if (this.persistTimer) clearTimeout(this.persistTimer);
    this.persistTimer = setTimeout(() => this.flush(), 150);
    this.persistTimer.unref?.();
  }

  flush(): void {
    if (!this.persistFile) return;
    try {
      fs.mkdirSync(path.dirname(this.persistFile), { recursive: true });
      const tmp = `${this.persistFile}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify(this.data), 'utf8');
      fs.renameSync(tmp, this.persistFile);
    } catch {
      // Kalıcılık opsiyoneldir; hata uygulamayı durdurmaz.
    }
  }

  replace(data: StoreData): void {
    this.data = data;
    this.touch();
  }
}
