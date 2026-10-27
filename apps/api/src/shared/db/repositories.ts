import type { OrderStatus, PaymentStatus, ProductStatus } from '@shop/shared';
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
} from './entities';

export type CreateInput<T, K extends keyof T = never> = Omit<T, 'id' | 'createdAt' | 'updatedAt' | K> &
  Partial<Pick<T, Extract<K, keyof T>>>;

export interface UserRepository {
  findById(id: string): Promise<UserEntity | null>;
  findByEmail(email: string): Promise<UserEntity | null>;
  create(data: Omit<UserEntity, 'id' | 'createdAt' | 'updatedAt'>): Promise<UserEntity>;
  update(id: string, data: Partial<Omit<UserEntity, 'id' | 'createdAt'>>): Promise<UserEntity>;
  list(params: { q?: string; role?: UserEntity['role']; page: number; pageSize: number }): Promise<{
    items: UserEntity[];
    total: number;
  }>;
  count(params?: { role?: UserEntity['role'] }): Promise<number>;
}

export interface RefreshTokenRepository {
  create(data: Omit<RefreshTokenEntity, 'id' | 'createdAt'>): Promise<RefreshTokenEntity>;
  findByHash(tokenHash: string): Promise<RefreshTokenEntity | null>;
  revoke(id: string): Promise<void>;
  revokeAllForUser(userId: string): Promise<void>;
  deleteExpired(now: Date): Promise<number>;
}

export interface PasswordResetTokenRepository {
  create(data: Omit<PasswordResetTokenEntity, 'id' | 'createdAt'>): Promise<PasswordResetTokenEntity>;
  findByHash(tokenHash: string): Promise<PasswordResetTokenEntity | null>;
  markUsed(id: string): Promise<void>;
  invalidateAllForUser(userId: string): Promise<void>;
}

export interface AddressRepository {
  listByUser(userId: string): Promise<AddressEntity[]>;
  findById(id: string): Promise<AddressEntity | null>;
  create(data: Omit<AddressEntity, 'id' | 'createdAt' | 'updatedAt'>): Promise<AddressEntity>;
  update(id: string, data: Partial<Omit<AddressEntity, 'id' | 'userId' | 'createdAt'>>): Promise<AddressEntity>;
  delete(id: string): Promise<void>;
  clearDefault(userId: string): Promise<void>;
}

export interface CategoryRepository {
  list(params?: { onlyActive?: boolean }): Promise<CategoryEntity[]>;
  findById(id: string): Promise<CategoryEntity | null>;
  findBySlug(slug: string): Promise<CategoryEntity | null>;
  create(data: Omit<CategoryEntity, 'id' | 'createdAt' | 'updatedAt'>): Promise<CategoryEntity>;
  update(id: string, data: Partial<Omit<CategoryEntity, 'id' | 'createdAt'>>): Promise<CategoryEntity>;
  delete(id: string): Promise<void>;
  countProducts(categoryId: string): Promise<number>;
}

export interface ProductQuery {
  q?: string;
  categoryId?: string;
  categoryIds?: string[];
  minPriceCents?: number;
  maxPriceCents?: number;
  sizes?: string[];
  colors?: string[];
  inStock?: boolean;
  onSale?: boolean;
  isNew?: boolean;
  isFeatured?: boolean;
  statuses?: ProductStatus[];
  includeDeleted?: boolean;
  excludeIds?: string[];
  ids?: string[];
  sort: 'recommended' | 'newest' | 'price_asc' | 'price_desc' | 'discount' | 'bestselling';
  page: number;
  pageSize: number;
}

export interface ProductWithRelations extends ProductEntity {
  images: ProductImageEntity[];
  variants: ProductVariantEntity[];
}

export interface ProductRepository {
  query(params: ProductQuery): Promise<{ items: ProductWithRelations[]; total: number }>;
  findById(id: string, opts?: { includeDeleted?: boolean }): Promise<ProductWithRelations | null>;
  findBySlug(slug: string, opts?: { includeDeleted?: boolean }): Promise<ProductWithRelations | null>;
  findManyByIds(ids: string[]): Promise<ProductWithRelations[]>;
  create(
    data: Omit<ProductEntity, 'id' | 'createdAt' | 'updatedAt' | 'salesCount' | 'deletedAt'>,
    images: Omit<ProductImageEntity, 'id' | 'productId'>[],
    variants: Omit<ProductVariantEntity, 'id' | 'productId' | 'createdAt' | 'updatedAt'>[],
  ): Promise<ProductWithRelations>;
  update(id: string, data: Partial<Omit<ProductEntity, 'id' | 'createdAt'>>): Promise<ProductWithRelations>;
  replaceImages(productId: string, images: Omit<ProductImageEntity, 'id' | 'productId'>[]): Promise<void>;
  syncVariants(
    productId: string,
    variants: (Omit<ProductVariantEntity, 'productId' | 'createdAt' | 'updatedAt' | 'id'> & { id?: string })[],
  ): Promise<void>;
  softDelete(id: string): Promise<void>;
  count(params?: { statuses?: ProductStatus[] }): Promise<number>;
  incrementSales(productId: string, qty: number): Promise<void>;
  /** Facet hesaplaması için: filtrelenmemiş aktif ürünlerin boyut/renk/fiyat özetleri */
  facets(params: { categoryIds?: string[] }): Promise<{
    sizes: string[];
    colors: { name: string; hex: string | null }[];
    minCents: number;
    maxCents: number;
  }>;
}

export interface VariantRepository {
  findById(id: string): Promise<ProductVariantEntity | null>;
  findManyByIds(ids: string[]): Promise<ProductVariantEntity[]>;
  findBySku(sku: string): Promise<ProductVariantEntity | null>;
  /** Stoğu atomik olarak düşer; yetersizse false döner. */
  decrementStock(id: string, qty: number): Promise<boolean>;
  incrementStock(id: string, qty: number): Promise<void>;
  listLowStock(threshold: number, limit: number): Promise<ProductVariantEntity[]>;
  countLowStock(threshold: number): Promise<number>;
}

export interface CartWithItems extends CartEntity {
  items: CartItemEntity[];
}

export interface CartRepository {
  getOrCreateByUser(userId: string): Promise<CartWithItems>;
  findByUser(userId: string): Promise<CartWithItems | null>;
  findItem(cartId: string, itemId: string): Promise<CartItemEntity | null>;
  findItemByVariant(cartId: string, variantId: string): Promise<CartItemEntity | null>;
  addItem(cartId: string, data: { productId: string; variantId: string; quantity: number }): Promise<CartItemEntity>;
  updateItemQuantity(itemId: string, quantity: number): Promise<CartItemEntity>;
  removeItem(itemId: string): Promise<void>;
  clear(cartId: string): Promise<void>;
}

export interface FavoriteRepository {
  listByUser(userId: string): Promise<FavoriteEntity[]>;
  exists(userId: string, productId: string): Promise<boolean>;
  add(userId: string, productId: string): Promise<FavoriteEntity>;
  remove(userId: string, productId: string): Promise<void>;
}

export interface OrderWithRelations extends OrderEntity {
  items: OrderItemEntity[];
  statusHistory: OrderStatusHistoryEntity[];
  payment: PaymentEntity | null;
}

export interface OrderQuery {
  userId?: string;
  q?: string;
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  page: number;
  pageSize: number;
}

export interface OrderRepository {
  create(
    order: Omit<OrderEntity, 'id' | 'createdAt' | 'updatedAt'>,
    items: Omit<OrderItemEntity, 'id' | 'orderId'>[],
    initialHistory: Omit<OrderStatusHistoryEntity, 'id' | 'orderId' | 'createdAt'>,
  ): Promise<OrderWithRelations>;
  findById(id: string): Promise<OrderWithRelations | null>;
  findByOrderNumber(orderNumber: string): Promise<OrderWithRelations | null>;
  query(params: OrderQuery): Promise<{ items: OrderWithRelations[]; total: number }>;
  update(id: string, data: Partial<Omit<OrderEntity, 'id' | 'createdAt'>>): Promise<OrderWithRelations>;
  addStatusHistory(data: Omit<OrderStatusHistoryEntity, 'id' | 'createdAt'>): Promise<OrderStatusHistoryEntity>;
  stats(): Promise<{
    total: number;
    pending: number;
    completed: number;
    revenueCents: number;
    salesByDay: { date: string; revenueCents: number; orders: number }[];
  }>;
  customerStats(userIds: string[]): Promise<Map<string, { orderCount: number; totalSpentCents: number; lastOrderAt: Date | null }>>;
  orderNumberExists(orderNumber: string): Promise<boolean>;
}

export interface PaymentRepository {
  create(data: Omit<PaymentEntity, 'id' | 'createdAt' | 'updatedAt'>): Promise<PaymentEntity>;
  findById(id: string): Promise<PaymentEntity | null>;
  findByOrderId(orderId: string): Promise<PaymentEntity | null>;
  findByProviderPaymentId(providerPaymentId: string): Promise<PaymentEntity | null>;
  update(id: string, data: Partial<Omit<PaymentEntity, 'id' | 'createdAt'>>): Promise<PaymentEntity>;
}

export interface AuditLogRepository {
  create(data: Omit<AuditLogEntity, 'id' | 'createdAt'>): Promise<AuditLogEntity>;
  list(params: { page: number; pageSize: number }): Promise<{ items: AuditLogEntity[]; total: number }>;
}

export interface IdempotencyRepository {
  find(scope: string, key: string): Promise<IdempotencyRecordEntity | null>;
  save(record: Omit<IdempotencyRecordEntity, 'createdAt'>): Promise<void>;
}

export interface Database {
  readonly kind: 'memory' | 'prisma';
  users: UserRepository;
  refreshTokens: RefreshTokenRepository;
  passwordResetTokens: PasswordResetTokenRepository;
  addresses: AddressRepository;
  categories: CategoryRepository;
  products: ProductRepository;
  variants: VariantRepository;
  carts: CartRepository;
  favorites: FavoriteRepository;
  orders: OrderRepository;
  payments: PaymentRepository;
  auditLogs: AuditLogRepository;
  idempotency: IdempotencyRepository;
  /**
   * Yazma işlemlerini serileştirir / transaction içinde çalıştırır.
   * Memory: global mutex. Prisma: $transaction.
   */
  transaction<T>(fn: (tx: Database) => Promise<T>): Promise<T>;
  /** Yalnızca testler için: veriyi seed durumuna döndürür. */
  reset(): Promise<void>;
}
