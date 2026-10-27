import type { ProductStatus } from '@shop/shared';
import type {
  AddressEntity,
  AuditLogEntity,
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
import type {
  AddressRepository,
  AuditLogRepository,
  CartRepository,
  CartWithItems,
  CategoryRepository,
  FavoriteRepository,
  IdempotencyRepository,
  OrderQuery,
  OrderRepository,
  OrderWithRelations,
  PasswordResetTokenRepository,
  PaymentRepository,
  ProductQuery,
  ProductRepository,
  ProductWithRelations,
  RefreshTokenRepository,
  UserRepository,
  VariantRepository,
} from '../repositories';
import type { MemoryStore } from './store';

const norm = (s: string) =>
  s
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

function paginate<T>(items: T[], page: number, pageSize: number) {
  const start = (page - 1) * pageSize;
  return { items: items.slice(start, start + pageSize), total: items.length };
}

function notFound(entity: string): never {
  throw new Error(`${entity} bulunamadı`);
}

// ---------------- Users ----------------

export class MemoryUserRepository implements UserRepository {
  constructor(private s: MemoryStore) {}
  async findById(id: string) {
    return this.s.data.users.find((u) => u.id === id) ?? null;
  }
  async findByEmail(email: string) {
    const e = email.toLowerCase();
    return this.s.data.users.find((u) => u.email === e) ?? null;
  }
  async create(data: Omit<UserEntity, 'id' | 'createdAt' | 'updatedAt'>) {
    const now = new Date();
    const user: UserEntity = { ...data, id: this.s.id(), createdAt: now, updatedAt: now };
    this.s.data.users.push(user);
    this.s.touch();
    return user;
  }
  async update(id: string, data: Partial<Omit<UserEntity, 'id' | 'createdAt'>>) {
    const u = this.s.data.users.find((x) => x.id === id) ?? notFound('Kullanıcı');
    Object.assign(u, data, { updatedAt: new Date() });
    this.s.touch();
    return u;
  }
  async list(params: { q?: string; role?: UserEntity['role']; page: number; pageSize: number }) {
    let items = [...this.s.data.users];
    if (params.role) items = items.filter((u) => u.role === params.role);
    if (params.q) {
      const q = norm(params.q);
      items = items.filter((u) =>
        norm(`${u.firstName} ${u.lastName} ${u.email} ${u.phone ?? ''}`).includes(q),
      );
    }
    items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return paginate(items, params.page, params.pageSize);
  }
  async count(params?: { role?: UserEntity['role'] }) {
    return this.s.data.users.filter((u) => !params?.role || u.role === params.role).length;
  }
}

// ---------------- Tokens ----------------

export class MemoryRefreshTokenRepository implements RefreshTokenRepository {
  constructor(private s: MemoryStore) {}
  async create(data: Omit<RefreshTokenEntity, 'id' | 'createdAt'>) {
    const t: RefreshTokenEntity = { ...data, id: this.s.id(), createdAt: new Date() };
    this.s.data.refreshTokens.push(t);
    this.s.touch();
    return t;
  }
  async findByHash(tokenHash: string) {
    return this.s.data.refreshTokens.find((t) => t.tokenHash === tokenHash) ?? null;
  }
  async revoke(id: string) {
    const t = this.s.data.refreshTokens.find((x) => x.id === id);
    if (t && !t.revokedAt) {
      t.revokedAt = new Date();
      this.s.touch();
    }
  }
  async revokeAllForUser(userId: string) {
    const now = new Date();
    for (const t of this.s.data.refreshTokens) if (t.userId === userId && !t.revokedAt) t.revokedAt = now;
    this.s.touch();
  }
  async deleteExpired(now: Date) {
    const before = this.s.data.refreshTokens.length;
    this.s.data.refreshTokens = this.s.data.refreshTokens.filter((t) => t.expiresAt > now);
    this.s.touch();
    return before - this.s.data.refreshTokens.length;
  }
}

export class MemoryPasswordResetTokenRepository implements PasswordResetTokenRepository {
  constructor(private s: MemoryStore) {}
  async create(data: Omit<PasswordResetTokenEntity, 'id' | 'createdAt'>) {
    const t: PasswordResetTokenEntity = { ...data, id: this.s.id(), createdAt: new Date() };
    this.s.data.passwordResetTokens.push(t);
    this.s.touch();
    return t;
  }
  async findByHash(tokenHash: string) {
    return this.s.data.passwordResetTokens.find((t) => t.tokenHash === tokenHash) ?? null;
  }
  async markUsed(id: string) {
    const t = this.s.data.passwordResetTokens.find((x) => x.id === id);
    if (t) t.usedAt = new Date();
    this.s.touch();
  }
  async invalidateAllForUser(userId: string) {
    const now = new Date();
    for (const t of this.s.data.passwordResetTokens) if (t.userId === userId && !t.usedAt) t.usedAt = now;
    this.s.touch();
  }
}

// ---------------- Addresses ----------------

export class MemoryAddressRepository implements AddressRepository {
  constructor(private s: MemoryStore) {}
  async listByUser(userId: string) {
    return this.s.data.addresses
      .filter((a) => a.userId === userId)
      .sort((a, b) => Number(b.isDefault) - Number(a.isDefault) || a.createdAt.getTime() - b.createdAt.getTime());
  }
  async findById(id: string) {
    return this.s.data.addresses.find((a) => a.id === id) ?? null;
  }
  async create(data: Omit<AddressEntity, 'id' | 'createdAt' | 'updatedAt'>) {
    const now = new Date();
    const a: AddressEntity = { ...data, id: this.s.id(), createdAt: now, updatedAt: now };
    this.s.data.addresses.push(a);
    this.s.touch();
    return a;
  }
  async update(id: string, data: Partial<Omit<AddressEntity, 'id' | 'userId' | 'createdAt'>>) {
    const a = this.s.data.addresses.find((x) => x.id === id) ?? notFound('Adres');
    Object.assign(a, data, { updatedAt: new Date() });
    this.s.touch();
    return a;
  }
  async delete(id: string) {
    this.s.data.addresses = this.s.data.addresses.filter((a) => a.id !== id);
    this.s.touch();
  }
  async clearDefault(userId: string) {
    for (const a of this.s.data.addresses) if (a.userId === userId) a.isDefault = false;
    this.s.touch();
  }
}

// ---------------- Categories ----------------

export class MemoryCategoryRepository implements CategoryRepository {
  constructor(private s: MemoryStore) {}
  async list(params?: { onlyActive?: boolean }) {
    return this.s.data.categories
      .filter((c) => !params?.onlyActive || c.isActive)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'tr'));
  }
  async findById(id: string) {
    return this.s.data.categories.find((c) => c.id === id) ?? null;
  }
  async findBySlug(slug: string) {
    return this.s.data.categories.find((c) => c.slug === slug) ?? null;
  }
  async create(data: Omit<CategoryEntity, 'id' | 'createdAt' | 'updatedAt'>) {
    const now = new Date();
    const c: CategoryEntity = { ...data, id: this.s.id(), createdAt: now, updatedAt: now };
    this.s.data.categories.push(c);
    this.s.touch();
    return c;
  }
  async update(id: string, data: Partial<Omit<CategoryEntity, 'id' | 'createdAt'>>) {
    const c = this.s.data.categories.find((x) => x.id === id) ?? notFound('Kategori');
    Object.assign(c, data, { updatedAt: new Date() });
    this.s.touch();
    return c;
  }
  async delete(id: string) {
    this.s.data.categories = this.s.data.categories.filter((c) => c.id !== id);
    this.s.touch();
  }
  async countProducts(categoryId: string) {
    return this.s.data.products.filter((p) => p.categoryId === categoryId && !p.deletedAt).length;
  }
}

// ---------------- Products ----------------

export class MemoryProductRepository implements ProductRepository {
  constructor(private s: MemoryStore) {}

  private withRelations(p: ProductEntity): ProductWithRelations {
    return {
      ...p,
      images: this.s.data.productImages
        .filter((i) => i.productId === p.id)
        .sort((a, b) => a.sortOrder - b.sortOrder),
      variants: this.s.data.productVariants
        .filter((v) => v.productId === p.id)
        .sort((a, b) => a.color.localeCompare(b.color, 'tr') || sizeIndex(a.size) - sizeIndex(b.size)),
    };
  }

  async query(params: ProductQuery) {
    const categories = this.s.data.categories;
    let items = this.s.data.products
      .filter((p) => params.includeDeleted || !p.deletedAt)
      .filter((p) => !params.statuses || params.statuses.includes(p.status))
      .map((p) => this.withRelations(p));

    if (params.categoryId) items = items.filter((p) => p.categoryId === params.categoryId);
    if (params.categoryIds) items = items.filter((p) => params.categoryIds!.includes(p.categoryId));
    if (params.excludeIds?.length) items = items.filter((p) => !params.excludeIds!.includes(p.id));
    if (params.ids) {
      const set = new Set(params.ids);
      items = items.filter((p) => set.has(p.id));
    }
    if (params.q) {
      const q = norm(params.q);
      items = items.filter((p) => {
        const cat = categories.find((c) => c.id === p.categoryId);
        const hay = norm(
          `${p.name} ${p.description} ${cat?.name ?? ''} ${p.variants.map((v) => v.color).join(' ')}`,
        );
        return hay.includes(q);
      });
    }
    if (params.minPriceCents != null) items = items.filter((p) => p.priceCents >= params.minPriceCents!);
    if (params.maxPriceCents != null) items = items.filter((p) => p.priceCents <= params.maxPriceCents!);
    if (params.sizes?.length) {
      const sizes = new Set(params.sizes.map((x) => x.toUpperCase()));
      items = items.filter((p) =>
        p.variants.some((v) => v.isActive && v.stockQuantity > 0 && sizes.has(v.size)),
      );
    }
    if (params.colors?.length) {
      const colors = new Set(params.colors.map(norm));
      items = items.filter((p) => p.variants.some((v) => v.isActive && colors.has(norm(v.color))));
    }
    if (params.inStock) items = items.filter((p) => p.variants.some((v) => v.isActive && v.stockQuantity > 0));
    if (params.onSale)
      items = items.filter((p) => p.compareAtPriceCents != null && p.compareAtPriceCents > p.priceCents);
    if (params.isNew) items = items.filter((p) => p.isNew);
    if (params.isFeatured) items = items.filter((p) => p.isFeatured);

    const disc = (p: ProductEntity) =>
      p.compareAtPriceCents && p.compareAtPriceCents > p.priceCents
        ? (p.compareAtPriceCents - p.priceCents) / p.compareAtPriceCents
        : 0;

    switch (params.sort) {
      case 'newest':
        items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        break;
      case 'price_asc':
        items.sort((a, b) => a.priceCents - b.priceCents);
        break;
      case 'price_desc':
        items.sort((a, b) => b.priceCents - a.priceCents);
        break;
      case 'discount':
        items.sort((a, b) => disc(b) - disc(a));
        break;
      case 'bestselling':
        items.sort((a, b) => b.salesCount - a.salesCount);
        break;
      default:
        items.sort(
          (a, b) =>
            Number(b.isFeatured) - Number(a.isFeatured) ||
            b.salesCount - a.salesCount ||
            b.createdAt.getTime() - a.createdAt.getTime(),
        );
    }
    return paginate(items, params.page, params.pageSize);
  }

  async findById(id: string, opts?: { includeDeleted?: boolean }) {
    const p = this.s.data.products.find((x) => x.id === id && (opts?.includeDeleted || !x.deletedAt));
    return p ? this.withRelations(p) : null;
  }
  async findBySlug(slug: string, opts?: { includeDeleted?: boolean }) {
    const p = this.s.data.products.find((x) => x.slug === slug && (opts?.includeDeleted || !x.deletedAt));
    return p ? this.withRelations(p) : null;
  }
  async findManyByIds(ids: string[]) {
    const set = new Set(ids);
    return this.s.data.products.filter((p) => set.has(p.id)).map((p) => this.withRelations(p));
  }
  async create(
    data: Omit<ProductEntity, 'id' | 'createdAt' | 'updatedAt' | 'salesCount' | 'deletedAt'>,
    images: Omit<ProductImageEntity, 'id' | 'productId'>[],
    variants: Omit<ProductVariantEntity, 'id' | 'productId' | 'createdAt' | 'updatedAt'>[],
  ) {
    const now = new Date();
    const p: ProductEntity = { ...data, id: this.s.id(), salesCount: 0, deletedAt: null, createdAt: now, updatedAt: now };
    this.s.data.products.push(p);
    for (const img of images) this.s.data.productImages.push({ ...img, id: this.s.id(), productId: p.id });
    for (const v of variants)
      this.s.data.productVariants.push({ ...v, id: this.s.id(), productId: p.id, createdAt: now, updatedAt: now });
    this.s.touch();
    return this.withRelations(p);
  }
  async update(id: string, data: Partial<Omit<ProductEntity, 'id' | 'createdAt'>>) {
    const p = this.s.data.products.find((x) => x.id === id) ?? notFound('Ürün');
    Object.assign(p, data, { updatedAt: new Date() });
    this.s.touch();
    return this.withRelations(p);
  }
  async replaceImages(productId: string, images: Omit<ProductImageEntity, 'id' | 'productId'>[]) {
    this.s.data.productImages = this.s.data.productImages.filter((i) => i.productId !== productId);
    for (const img of images) this.s.data.productImages.push({ ...img, id: this.s.id(), productId });
    this.s.touch();
  }
  async syncVariants(
    productId: string,
    variants: (Omit<ProductVariantEntity, 'productId' | 'createdAt' | 'updatedAt' | 'id'> & { id?: string })[],
  ) {
    const now = new Date();
    const existing = this.s.data.productVariants.filter((v) => v.productId === productId);
    const keepIds = new Set<string>();
    for (const input of variants) {
      const match =
        (input.id && existing.find((v) => v.id === input.id)) ||
        existing.find((v) => v.size === input.size && norm(v.color) === norm(input.color));
      if (match) {
        Object.assign(match, { ...input, id: match.id, updatedAt: now });
        keepIds.add(match.id);
      } else {
        const created: ProductVariantEntity = { ...input, id: this.s.id(), productId, createdAt: now, updatedAt: now };
        this.s.data.productVariants.push(created);
        keepIds.add(created.id);
      }
    }
    // Kaldırılan varyantlar: sipariş geçmişi tarihsel kopya taşıdığı için silinebilir;
    // ancak sepetlerdeki referansları temizle.
    const removed = existing.filter((v) => !keepIds.has(v.id)).map((v) => v.id);
    if (removed.length) {
      this.s.data.productVariants = this.s.data.productVariants.filter((v) => !removed.includes(v.id));
      this.s.data.cartItems = this.s.data.cartItems.filter((ci) => !removed.includes(ci.variantId));
    }
    this.s.touch();
  }
  async softDelete(id: string) {
    const p = this.s.data.products.find((x) => x.id === id) ?? notFound('Ürün');
    p.deletedAt = new Date();
    p.status = 'ARCHIVED';
    p.updatedAt = new Date();
    this.s.data.cartItems = this.s.data.cartItems.filter((ci) => ci.productId !== id);
    this.s.touch();
  }
  async count(params?: { statuses?: ProductStatus[] }) {
    return this.s.data.products.filter((p) => !p.deletedAt && (!params?.statuses || params.statuses.includes(p.status)))
      .length;
  }
  async incrementSales(productId: string, qty: number) {
    const p = this.s.data.products.find((x) => x.id === productId);
    if (p) p.salesCount += qty;
    this.s.touch();
  }
  async facets(params: { categoryIds?: string[] }) {
    const products = this.s.data.products.filter(
      (p) => !p.deletedAt && p.status === 'ACTIVE' && (!params.categoryIds || params.categoryIds.includes(p.categoryId)),
    );
    const ids = new Set(products.map((p) => p.id));
    const variants = this.s.data.productVariants.filter((v) => ids.has(v.productId) && v.isActive);
    const sizes = [...new Set(variants.map((v) => v.size))].sort((a, b) => sizeIndex(a) - sizeIndex(b));
    const colorMap = new Map<string, { name: string; hex: string | null }>();
    for (const v of variants) if (!colorMap.has(norm(v.color))) colorMap.set(norm(v.color), { name: v.color, hex: v.colorHex });
    const prices = products.map((p) => p.priceCents);
    return {
      sizes,
      colors: [...colorMap.values()].sort((a, b) => a.name.localeCompare(b.name, 'tr')),
      minCents: prices.length ? Math.min(...prices) : 0,
      maxCents: prices.length ? Math.max(...prices) : 0,
    };
  }
}

const SIZE_ORDER = ['S', 'M', 'L', 'XL', 'XXL'];
function sizeIndex(size: string) {
  const i = SIZE_ORDER.indexOf(size);
  return i === -1 ? 99 : i;
}

// ---------------- Variants ----------------

export class MemoryVariantRepository implements VariantRepository {
  constructor(private s: MemoryStore) {}
  async findById(id: string) {
    return this.s.data.productVariants.find((v) => v.id === id) ?? null;
  }
  async findManyByIds(ids: string[]) {
    const set = new Set(ids);
    return this.s.data.productVariants.filter((v) => set.has(v.id));
  }
  async findBySku(sku: string) {
    return this.s.data.productVariants.find((v) => v.sku === sku) ?? null;
  }
  async decrementStock(id: string, qty: number) {
    const v = this.s.data.productVariants.find((x) => x.id === id);
    if (!v || v.stockQuantity < qty) return false;
    v.stockQuantity -= qty;
    v.updatedAt = new Date();
    this.s.touch();
    return true;
  }
  async incrementStock(id: string, qty: number) {
    const v = this.s.data.productVariants.find((x) => x.id === id);
    if (v) {
      v.stockQuantity += qty;
      v.updatedAt = new Date();
      this.s.touch();
    }
  }
  async listLowStock(threshold: number, limit: number) {
    const active = new Set(this.s.data.products.filter((p) => !p.deletedAt && p.status === 'ACTIVE').map((p) => p.id));
    return this.s.data.productVariants
      .filter((v) => v.isActive && active.has(v.productId) && v.stockQuantity <= threshold)
      .sort((a, b) => a.stockQuantity - b.stockQuantity)
      .slice(0, limit);
  }
  async countLowStock(threshold: number) {
    const active = new Set(this.s.data.products.filter((p) => !p.deletedAt && p.status === 'ACTIVE').map((p) => p.id));
    return this.s.data.productVariants.filter((v) => v.isActive && active.has(v.productId) && v.stockQuantity <= threshold)
      .length;
  }
}

// ---------------- Cart ----------------

export class MemoryCartRepository implements CartRepository {
  constructor(private s: MemoryStore) {}
  private build(cartId: string): CartWithItems {
    const cart = this.s.data.carts.find((c) => c.id === cartId) ?? notFound('Sepet');
    return {
      ...cart,
      items: this.s.data.cartItems
        .filter((i) => i.cartId === cartId)
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()),
    };
  }
  async getOrCreateByUser(userId: string) {
    let cart = this.s.data.carts.find((c) => c.userId === userId);
    if (!cart) {
      const now = new Date();
      cart = { id: this.s.id(), userId, createdAt: now, updatedAt: now };
      this.s.data.carts.push(cart);
      this.s.touch();
    }
    return this.build(cart.id);
  }
  async findByUser(userId: string) {
    const cart = this.s.data.carts.find((c) => c.userId === userId);
    return cart ? this.build(cart.id) : null;
  }
  async findItem(cartId: string, itemId: string) {
    return this.s.data.cartItems.find((i) => i.cartId === cartId && i.id === itemId) ?? null;
  }
  async findItemByVariant(cartId: string, variantId: string) {
    return this.s.data.cartItems.find((i) => i.cartId === cartId && i.variantId === variantId) ?? null;
  }
  async addItem(cartId: string, data: { productId: string; variantId: string; quantity: number }) {
    const now = new Date();
    const item: CartItemEntity = { ...data, id: this.s.id(), cartId, createdAt: now, updatedAt: now };
    this.s.data.cartItems.push(item);
    this.bump(cartId);
    return item;
  }
  async updateItemQuantity(itemId: string, quantity: number) {
    const item = this.s.data.cartItems.find((i) => i.id === itemId) ?? notFound('Sepet satırı');
    item.quantity = quantity;
    item.updatedAt = new Date();
    this.bump(item.cartId);
    return item;
  }
  async removeItem(itemId: string) {
    const item = this.s.data.cartItems.find((i) => i.id === itemId);
    this.s.data.cartItems = this.s.data.cartItems.filter((i) => i.id !== itemId);
    if (item) this.bump(item.cartId);
  }
  async clear(cartId: string) {
    this.s.data.cartItems = this.s.data.cartItems.filter((i) => i.cartId !== cartId);
    this.bump(cartId);
  }
  private bump(cartId: string) {
    const cart = this.s.data.carts.find((c) => c.id === cartId);
    if (cart) cart.updatedAt = new Date();
    this.s.touch();
  }
}

// ---------------- Favorites ----------------

export class MemoryFavoriteRepository implements FavoriteRepository {
  constructor(private s: MemoryStore) {}
  async listByUser(userId: string) {
    return this.s.data.favorites
      .filter((f) => f.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
  async exists(userId: string, productId: string) {
    return this.s.data.favorites.some((f) => f.userId === userId && f.productId === productId);
  }
  async add(userId: string, productId: string) {
    const existing = this.s.data.favorites.find((f) => f.userId === userId && f.productId === productId);
    if (existing) return existing;
    const f: FavoriteEntity = { id: this.s.id(), userId, productId, createdAt: new Date() };
    this.s.data.favorites.push(f);
    this.s.touch();
    return f;
  }
  async remove(userId: string, productId: string) {
    this.s.data.favorites = this.s.data.favorites.filter((f) => !(f.userId === userId && f.productId === productId));
    this.s.touch();
  }
}

// ---------------- Orders ----------------

export class MemoryOrderRepository implements OrderRepository {
  constructor(private s: MemoryStore) {}
  private build(o: OrderEntity): OrderWithRelations {
    return {
      ...o,
      items: this.s.data.orderItems.filter((i) => i.orderId === o.id),
      statusHistory: this.s.data.orderStatusHistory
        .filter((h) => h.orderId === o.id)
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()),
      payment: this.s.data.payments.find((p) => p.orderId === o.id) ?? null,
    };
  }
  async create(
    order: Omit<OrderEntity, 'id' | 'createdAt' | 'updatedAt'>,
    items: Omit<OrderItemEntity, 'id' | 'orderId'>[],
    initialHistory: Omit<OrderStatusHistoryEntity, 'id' | 'orderId' | 'createdAt'>,
  ) {
    const now = new Date();
    const o: OrderEntity = { ...order, id: this.s.id(), createdAt: now, updatedAt: now };
    this.s.data.orders.push(o);
    for (const it of items) this.s.data.orderItems.push({ ...it, id: this.s.id(), orderId: o.id });
    this.s.data.orderStatusHistory.push({ ...initialHistory, id: this.s.id(), orderId: o.id, createdAt: now });
    this.s.touch();
    return this.build(o);
  }
  async findById(id: string) {
    const o = this.s.data.orders.find((x) => x.id === id);
    return o ? this.build(o) : null;
  }
  async findByOrderNumber(orderNumber: string) {
    const o = this.s.data.orders.find((x) => x.orderNumber === orderNumber);
    return o ? this.build(o) : null;
  }
  async query(params: OrderQuery) {
    let items = [...this.s.data.orders];
    if (params.userId) items = items.filter((o) => o.userId === params.userId);
    if (params.status) items = items.filter((o) => o.status === params.status);
    if (params.paymentStatus) items = items.filter((o) => o.paymentStatus === params.paymentStatus);
    if (params.q) {
      const q = norm(params.q);
      items = items.filter((o) => {
        const user = o.userId ? this.s.data.users.find((u) => u.id === o.userId) : null;
        const hay = norm(
          `${o.orderNumber} ${o.guestEmail ?? ''} ${user?.email ?? ''} ${user?.firstName ?? ''} ${user?.lastName ?? ''} ${o.shippingAddress.firstName} ${o.shippingAddress.lastName} ${o.shippingAddress.phone}`,
        );
        return hay.includes(q);
      });
    }
    items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    const page = paginate(items, params.page, params.pageSize);
    return { items: page.items.map((o) => this.build(o)), total: page.total };
  }
  async update(id: string, data: Partial<Omit<OrderEntity, 'id' | 'createdAt'>>) {
    const o = this.s.data.orders.find((x) => x.id === id) ?? notFound('Sipariş');
    Object.assign(o, data, { updatedAt: new Date() });
    this.s.touch();
    return this.build(o);
  }
  async addStatusHistory(data: Omit<OrderStatusHistoryEntity, 'id' | 'createdAt'>) {
    const h: OrderStatusHistoryEntity = { ...data, id: this.s.id(), createdAt: new Date() };
    this.s.data.orderStatusHistory.push(h);
    this.s.touch();
    return h;
  }
  async stats() {
    const orders = this.s.data.orders;
    const paidOrders = orders.filter((o) => o.paymentStatus === 'PAID' && o.status !== 'CANCELLED' && o.status !== 'RETURNED');
    const byDay = new Map<string, { revenueCents: number; orders: number }>();
    const today = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      byDay.set(d.toISOString().slice(0, 10), { revenueCents: 0, orders: 0 });
    }
    for (const o of orders) {
      const key = o.createdAt.toISOString().slice(0, 10);
      const slot = byDay.get(key);
      if (!slot) continue;
      slot.orders += 1;
      if (o.paymentStatus === 'PAID' && o.status !== 'CANCELLED' && o.status !== 'RETURNED') slot.revenueCents += o.totalCents;
    }
    return {
      total: orders.length,
      pending: orders.filter((o) => o.status === 'PENDING' || o.status === 'CONFIRMED' || o.status === 'PREPARING').length,
      completed: orders.filter((o) => o.status === 'DELIVERED').length,
      revenueCents: paidOrders.reduce((sum, o) => sum + o.totalCents, 0),
      salesByDay: [...byDay.entries()].map(([date, v]) => ({ date, ...v })),
    };
  }
  async customerStats(userIds: string[]) {
    const map = new Map<string, { orderCount: number; totalSpentCents: number; lastOrderAt: Date | null }>();
    for (const id of userIds) map.set(id, { orderCount: 0, totalSpentCents: 0, lastOrderAt: null });
    for (const o of this.s.data.orders) {
      if (!o.userId || !map.has(o.userId)) continue;
      const st = map.get(o.userId)!;
      st.orderCount += 1;
      if (o.paymentStatus === 'PAID' && o.status !== 'CANCELLED') st.totalSpentCents += o.totalCents;
      if (!st.lastOrderAt || o.createdAt > st.lastOrderAt) st.lastOrderAt = o.createdAt;
    }
    return map;
  }
  async orderNumberExists(orderNumber: string) {
    return this.s.data.orders.some((o) => o.orderNumber === orderNumber);
  }
}

// ---------------- Payments ----------------

export class MemoryPaymentRepository implements PaymentRepository {
  constructor(private s: MemoryStore) {}
  async create(data: Omit<PaymentEntity, 'id' | 'createdAt' | 'updatedAt'>) {
    const now = new Date();
    const p: PaymentEntity = { ...data, id: this.s.id(), createdAt: now, updatedAt: now };
    this.s.data.payments.push(p);
    this.s.touch();
    return p;
  }
  async findById(id: string) {
    return this.s.data.payments.find((p) => p.id === id) ?? null;
  }
  async findByOrderId(orderId: string) {
    return this.s.data.payments.find((p) => p.orderId === orderId) ?? null;
  }
  async findByProviderPaymentId(providerPaymentId: string) {
    return this.s.data.payments.find((p) => p.providerPaymentId === providerPaymentId) ?? null;
  }
  async update(id: string, data: Partial<Omit<PaymentEntity, 'id' | 'createdAt'>>) {
    const p = this.s.data.payments.find((x) => x.id === id) ?? notFound('Ödeme');
    Object.assign(p, data, { updatedAt: new Date() });
    this.s.touch();
    return p;
  }
}

// ---------------- Audit / Idempotency ----------------

export class MemoryAuditLogRepository implements AuditLogRepository {
  constructor(private s: MemoryStore) {}
  async create(data: Omit<AuditLogEntity, 'id' | 'createdAt'>) {
    const l: AuditLogEntity = { ...data, id: this.s.id(), createdAt: new Date() };
    this.s.data.auditLogs.push(l);
    this.s.touch();
    return l;
  }
  async list(params: { page: number; pageSize: number }) {
    const items = [...this.s.data.auditLogs].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return paginate(items, params.page, params.pageSize);
  }
}

export class MemoryIdempotencyRepository implements IdempotencyRepository {
  constructor(private s: MemoryStore) {}
  async find(scope: string, key: string) {
    return this.s.data.idempotency.find((r) => r.scope === scope && r.key === key) ?? null;
  }
  async save(record: Omit<IdempotencyRecordEntity, 'createdAt'>) {
    this.s.data.idempotency.push({ ...record, createdAt: new Date() });
    this.s.touch();
  }
}
