import { Prisma, PrismaClient } from '@prisma/client';
import type { AddressSnapshot, ProductStatus } from '@shop/shared';
import { env } from '../../../config/env';
import { buildSeedData } from '../memory/seed';
import type {
  AddressEntity,
  AuditLogEntity,
  OrderEntity,
  OrderItemEntity,
  OrderStatusHistoryEntity,
  PaymentEntity,
  ProductEntity,
  ProductImageEntity,
  ProductVariantEntity,
} from '../entities';
import type {
  AddressRepository,
  AuditLogRepository,
  CartRepository,
  CategoryRepository,
  Database,
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

type Client = PrismaClient | Prisma.TransactionClient;

const SIZE_ORDER = ['S', 'M', 'L', 'XL', 'XXL'];
function sizeIndex(size: string) {
  const i = SIZE_ORDER.indexOf(size);
  return i === -1 ? 99 : i;
}

function asAddress(json: Prisma.JsonValue): AddressSnapshot {
  return json as unknown as AddressSnapshot;
}

function withProduct(p: ProductEntity & { images: ProductImageEntity[]; variants: ProductVariantEntity[] }): ProductWithRelations {
  return {
    ...p,
    images: [...p.images].sort((a, b) => a.sortOrder - b.sortOrder),
    variants: [...p.variants],
  };
}

function withOrder(o: OrderEntity & { items: OrderItemEntity[]; statusHistory: OrderStatusHistoryEntity[]; payment: PaymentEntity | null }): OrderWithRelations {
  return {
    ...o,
    shippingAddress: o.shippingAddress,
    items: o.items,
    statusHistory: [...o.statusHistory].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()),
    payment: o.payment,
  };
}

function mapOrder(row: {
  id: string;
  orderNumber: string;
  userId: string | null;
  guestEmail: string | null;
  status: OrderEntity['status'];
  paymentStatus: OrderEntity['paymentStatus'];
  paymentMethod: OrderEntity['paymentMethod'];
  subtotalCents: number;
  discountCents: number;
  shippingCents: number;
  totalCents: number;
  shippingAddress: Prisma.JsonValue;
  note: string | null;
  trackingNumber: string | null;
  idempotencyKey: string | null;
  createdAt: Date;
  updatedAt: Date;
  items: OrderItemEntity[];
  statusHistory: OrderStatusHistoryEntity[];
  payment: PaymentEntity | null;
}): OrderWithRelations {
  return withOrder({ ...row, shippingAddress: asAddress(row.shippingAddress) });
}

class PrismaUserRepository implements UserRepository {
  constructor(private p: Client) {}
  findById(id: string) {
    return this.p.user.findUnique({ where: { id } });
  }
  findByEmail(email: string) {
    return this.p.user.findUnique({ where: { email: email.toLowerCase() } });
  }
  create(data: Parameters<UserRepository['create']>[0]) {
    return this.p.user.create({ data: { ...data, email: data.email.toLowerCase() } });
  }
  update(id: string, data: Parameters<UserRepository['update']>[1]) {
    return this.p.user.update({ where: { id }, data });
  }
  async list(params: { q?: string; role?: UserEntityRole; page: number; pageSize: number }) {
    const where: Prisma.UserWhereInput = {
      ...(params.role ? { role: params.role } : {}),
      ...(params.q
        ? {
            OR: [
              { email: { contains: params.q, mode: 'insensitive' } },
              { firstName: { contains: params.q, mode: 'insensitive' } },
              { lastName: { contains: params.q, mode: 'insensitive' } },
              { phone: { contains: params.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      this.p.user.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (params.page - 1) * params.pageSize, take: params.pageSize }),
      this.p.user.count({ where }),
    ]);
    return { items, total };
  }
  count(params?: { role?: UserEntityRole }) {
    return this.p.user.count({ where: params?.role ? { role: params.role } : {} });
  }
}
type UserEntityRole = NonNullable<Parameters<UserRepository['list']>[0]['role']>;

class PrismaRefreshTokenRepository implements RefreshTokenRepository {
  constructor(private p: Client) {}
  create(data: Parameters<RefreshTokenRepository['create']>[0]) {
    return this.p.refreshToken.create({ data });
  }
  findByHash(tokenHash: string) {
    return this.p.refreshToken.findUnique({ where: { tokenHash } });
  }
  async revoke(id: string) {
    await this.p.refreshToken.updateMany({ where: { id, revokedAt: null }, data: { revokedAt: new Date() } });
  }
  async revokeAllForUser(userId: string) {
    await this.p.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
  }
  async deleteExpired(now: Date) {
    const r = await this.p.refreshToken.deleteMany({ where: { expiresAt: { lt: now } } });
    return r.count;
  }
}

class PrismaPasswordResetTokenRepository implements PasswordResetTokenRepository {
  constructor(private p: Client) {}
  create(data: Parameters<PasswordResetTokenRepository['create']>[0]) {
    return this.p.passwordResetToken.create({ data });
  }
  findByHash(tokenHash: string) {
    return this.p.passwordResetToken.findUnique({ where: { tokenHash } });
  }
  async markUsed(id: string) {
    await this.p.passwordResetToken.update({ where: { id }, data: { usedAt: new Date() } });
  }
  async invalidateAllForUser(userId: string) {
    await this.p.passwordResetToken.updateMany({ where: { userId, usedAt: null }, data: { usedAt: new Date() } });
  }
}

class PrismaAddressRepository implements AddressRepository {
  constructor(private p: Client) {}
  listByUser(userId: string) {
    return this.p.address.findMany({ where: { userId }, orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }] });
  }
  findById(id: string) {
    return this.p.address.findUnique({ where: { id } });
  }
  create(data: Omit<AddressEntity, 'id' | 'createdAt' | 'updatedAt'>) {
    return this.p.address.create({ data });
  }
  update(id: string, data: Parameters<AddressRepository['update']>[1]) {
    return this.p.address.update({ where: { id }, data });
  }
  async delete(id: string) {
    await this.p.address.delete({ where: { id } });
  }
  async clearDefault(userId: string) {
    await this.p.address.updateMany({ where: { userId, isDefault: true }, data: { isDefault: false } });
  }
}

class PrismaCategoryRepository implements CategoryRepository {
  constructor(private p: Client) {}
  list(params?: { onlyActive?: boolean }) {
    return this.p.category.findMany({ where: params?.onlyActive ? { isActive: true } : {}, orderBy: { sortOrder: 'asc' } });
  }
  findById(id: string) {
    return this.p.category.findUnique({ where: { id } });
  }
  findBySlug(slug: string) {
    return this.p.category.findUnique({ where: { slug } });
  }
  create(data: Parameters<CategoryRepository['create']>[0]) {
    return this.p.category.create({ data });
  }
  update(id: string, data: Parameters<CategoryRepository['update']>[1]) {
    return this.p.category.update({ where: { id }, data });
  }
  async delete(id: string) {
    await this.p.category.delete({ where: { id } });
  }
  countProducts(categoryId: string) {
    return this.p.product.count({ where: { categoryId, deletedAt: null, status: { not: 'ARCHIVED' } } });
  }
}

class PrismaProductRepository implements ProductRepository {
  constructor(private p: Client) {}
  private include = { images: { orderBy: { sortOrder: 'asc' as const } }, variants: true };

  async query(params: ProductQuery) {
    const where: Prisma.ProductWhereInput = {
      ...(params.includeDeleted ? {} : { deletedAt: null }),
      ...(params.statuses ? { status: { in: params.statuses } } : {}),
      ...(params.categoryId ? { categoryId: params.categoryId } : {}),
      ...(params.categoryIds ? { categoryId: { in: params.categoryIds } } : {}),
      ...(params.excludeIds?.length ? { id: { notIn: params.excludeIds } } : {}),
      ...(params.ids ? { id: { in: params.ids } } : {}),
      ...(params.minPriceCents != null ? { priceCents: { gte: params.minPriceCents } } : {}),
      ...(params.maxPriceCents != null ? { priceCents: { ...(params.minPriceCents != null ? { gte: params.minPriceCents } : {}), lte: params.maxPriceCents } } : {}),
      ...(params.isNew ? { isNew: true } : {}),
      ...(params.isFeatured ? { isFeatured: true } : {}),
      ...(params.inStock ? { variants: { some: { isActive: true, stockQuantity: { gt: 0 } } } } : {}),
      ...(params.sizes?.length ? { variants: { some: { isActive: true, stockQuantity: { gt: 0 }, size: { in: params.sizes as never } } } } : {}),
      ...(params.colors?.length
        ? { variants: { some: { isActive: true, OR: params.colors.map((c) => ({ color: { equals: c, mode: 'insensitive' as const } })) } } }
        : {}),
      ...(params.q
        ? {
            OR: [
              { name: { contains: params.q, mode: 'insensitive' } },
              { description: { contains: params.q, mode: 'insensitive' } },
              { slug: { contains: params.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const rows = await this.p.product.findMany({ where, include: this.include });
    let items = rows.map((r) => withProduct(r));
    if (params.onSale) items = items.filter((p) => p.compareAtPriceCents != null && p.compareAtPriceCents > p.priceCents);
    const disc = (p: ProductEntity) =>
      p.compareAtPriceCents && p.compareAtPriceCents > p.priceCents ? (p.compareAtPriceCents - p.priceCents) / p.compareAtPriceCents : 0;
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
        items.sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured) || b.salesCount - a.salesCount || b.createdAt.getTime() - a.createdAt.getTime());
    }
    const total = items.length;
    const start = (params.page - 1) * params.pageSize;
    return { items: items.slice(start, start + params.pageSize), total };
  }

  async findById(id: string, opts?: { includeDeleted?: boolean }) {
    const p = await this.p.product.findUnique({ where: { id }, include: this.include });
    if (!p || (!opts?.includeDeleted && p.deletedAt)) return null;
    return withProduct(p);
  }
  async findBySlug(slug: string, opts?: { includeDeleted?: boolean }) {
    const p = await this.p.product.findUnique({ where: { slug }, include: this.include });
    if (!p || (!opts?.includeDeleted && p.deletedAt)) return null;
    return withProduct(p);
  }
  async findManyByIds(ids: string[]) {
    if (!ids.length) return [];
    const rows = await this.p.product.findMany({ where: { id: { in: ids }, deletedAt: null }, include: this.include });
    const map = new Map(rows.map((r) => [r.id, withProduct(r)]));
    return ids.flatMap((id) => (map.get(id) ? [map.get(id)!] : []));
  }
  async create(
    data: Omit<ProductEntity, 'id' | 'createdAt' | 'updatedAt' | 'salesCount' | 'deletedAt'>,
    images: Omit<ProductImageEntity, 'id' | 'productId'>[],
    variants: Omit<ProductVariantEntity, 'id' | 'productId' | 'createdAt' | 'updatedAt'>[],
  ) {
    const p = await this.p.product.create({
      data: {
        ...data,
        salesCount: 0,
        images: { create: images },
        variants: { create: variants },
      },
      include: this.include,
    });
    return withProduct(p);
  }
  async update(id: string, data: Partial<Omit<ProductEntity, 'id' | 'createdAt'>>) {
    const p = await this.p.product.update({ where: { id }, data, include: this.include });
    return withProduct(p);
  }
  async replaceImages(productId: string, images: Omit<ProductImageEntity, 'id' | 'productId'>[]) {
    await this.p.productImage.deleteMany({ where: { productId } });
    if (images.length) await this.p.productImage.createMany({ data: images.map((i) => ({ ...i, productId })) });
  }
  async syncVariants(productId: string, variants: (Omit<ProductVariantEntity, 'productId' | 'createdAt' | 'updatedAt' | 'id'> & { id?: string })[]) {
    const existing = await this.p.productVariant.findMany({ where: { productId } });
    const keep = new Set<string>();
    for (const input of variants) {
      const match = (input.id && existing.find((v) => v.id === input.id)) || existing.find((v) => v.size === input.size && v.color.toLowerCase() === input.color.toLowerCase());
      if (match) {
        await this.p.productVariant.update({
          where: { id: match.id },
          data: { sku: input.sku, size: input.size, color: input.color, colorHex: input.colorHex, stockQuantity: input.stockQuantity, priceOverrideCents: input.priceOverrideCents, isActive: input.isActive },
        });
        keep.add(match.id);
      } else {
        const created = await this.p.productVariant.create({ data: { ...input, productId } });
        keep.add(created.id);
      }
    }
    const removed = existing.filter((v) => !keep.has(v.id)).map((v) => v.id);
    if (removed.length) {
      await this.p.cartItem.deleteMany({ where: { variantId: { in: removed } } });
      await this.p.productVariant.deleteMany({ where: { id: { in: removed } } });
    }
  }
  async softDelete(id: string) {
    await this.p.product.update({ where: { id }, data: { deletedAt: new Date(), status: 'ARCHIVED' } });
    await this.p.cartItem.deleteMany({ where: { productId: id } });
  }
  count(params?: { statuses?: ProductStatus[] }) {
    return this.p.product.count({ where: { deletedAt: null, ...(params?.statuses ? { status: { in: params.statuses } } : {}) } });
  }
  async incrementSales(productId: string, qty: number) {
    await this.p.product.update({ where: { id: productId }, data: { salesCount: { increment: qty } } });
  }
  async facets(params: { categoryIds?: string[] }) {
    const products = await this.p.product.findMany({
      where: { deletedAt: null, status: 'ACTIVE', ...(params.categoryIds ? { categoryId: { in: params.categoryIds } } : {}) },
      include: { variants: true },
    });
    const sizes = new Set<string>();
    const colorMap = new Map<string, { name: string; hex: string | null }>();
    for (const p of products) {
      for (const v of p.variants.filter((x) => x.isActive)) {
        sizes.add(v.size);
        const k = v.color.toLowerCase();
        if (!colorMap.has(k)) colorMap.set(k, { name: v.color, hex: v.colorHex });
      }
    }
    const prices = products.map((p) => p.priceCents);
    return {
      sizes: [...sizes].sort((a, b) => sizeIndex(a) - sizeIndex(b)),
      colors: [...colorMap.values()].sort((a, b) => a.name.localeCompare(b.name, 'tr')),
      minCents: prices.length ? Math.min(...prices) : 0,
      maxCents: prices.length ? Math.max(...prices) : 0,
    };
  }
}

class PrismaVariantRepository implements VariantRepository {
  constructor(private p: Client) {}
  findById(id: string) {
    return this.p.productVariant.findUnique({ where: { id } });
  }
  findManyByIds(ids: string[]) {
    if (!ids.length) return Promise.resolve([]);
    return this.p.productVariant.findMany({ where: { id: { in: ids } } });
  }
  findBySku(sku: string) {
    return this.p.productVariant.findUnique({ where: { sku } });
  }
  async decrementStock(id: string, qty: number) {
    const r = await this.p.productVariant.updateMany({ where: { id, stockQuantity: { gte: qty } }, data: { stockQuantity: { decrement: qty } } });
    return r.count === 1;
  }
  async incrementStock(id: string, qty: number) {
    await this.p.productVariant.update({ where: { id }, data: { stockQuantity: { increment: qty } } });
  }
  listLowStock(threshold: number, limit: number) {
    return this.p.productVariant.findMany({
      where: { isActive: true, stockQuantity: { lte: threshold }, product: { deletedAt: null, status: 'ACTIVE' } },
      orderBy: { stockQuantity: 'asc' },
      take: limit,
    });
  }
  countLowStock(threshold: number) {
    return this.p.productVariant.count({
      where: { isActive: true, stockQuantity: { lte: threshold }, product: { deletedAt: null, status: 'ACTIVE' } },
    });
  }
}

class PrismaCartRepository implements CartRepository {
  constructor(private p: Client) {}
  async getOrCreateByUser(userId: string) {
    const existing = await this.p.cart.findUnique({ where: { userId }, include: { items: { orderBy: { createdAt: 'asc' } } } });
    if (existing) return existing;
    return this.p.cart.create({ data: { userId }, include: { items: true } });
  }
  async findByUser(userId: string) {
    return this.p.cart.findUnique({ where: { userId }, include: { items: { orderBy: { createdAt: 'asc' } } } });
  }
  findItem(cartId: string, itemId: string) {
    return this.p.cartItem.findFirst({ where: { id: itemId, cartId } });
  }
  findItemByVariant(cartId: string, variantId: string) {
    return this.p.cartItem.findUnique({ where: { cartId_variantId: { cartId, variantId } } });
  }
  addItem(cartId: string, data: { productId: string; variantId: string; quantity: number }) {
    return this.p.cartItem.create({ data: { cartId, ...data } });
  }
  updateItemQuantity(itemId: string, quantity: number) {
    return this.p.cartItem.update({ where: { id: itemId }, data: { quantity } });
  }
  async removeItem(itemId: string) {
    await this.p.cartItem.delete({ where: { id: itemId } });
  }
  async clear(cartId: string) {
    await this.p.cartItem.deleteMany({ where: { cartId } });
  }
}

class PrismaFavoriteRepository implements FavoriteRepository {
  constructor(private p: Client) {}
  listByUser(userId: string) {
    return this.p.favorite.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
  }
  async exists(userId: string, productId: string) {
    const f = await this.p.favorite.findUnique({ where: { userId_productId: { userId, productId } } });
    return !!f;
  }
  async add(userId: string, productId: string) {
    const existing = await this.p.favorite.findUnique({ where: { userId_productId: { userId, productId } } });
    if (existing) return existing;
    return this.p.favorite.create({ data: { userId, productId } });
  }
  async remove(userId: string, productId: string) {
    await this.p.favorite.deleteMany({ where: { userId, productId } });
  }
}

const orderInclude = { items: true, statusHistory: { orderBy: { createdAt: 'asc' as const } }, payment: true };

class PrismaOrderRepository implements OrderRepository {
  constructor(private p: Client) {}
  async create(order: Omit<OrderEntity, 'id' | 'createdAt' | 'updatedAt'>, items: Omit<OrderItemEntity, 'id' | 'orderId'>[], initialHistory: Omit<OrderStatusHistoryEntity, 'id' | 'orderId' | 'createdAt'>) {
    const row = await this.p.order.create({
      data: {
        ...order,
        shippingAddress: order.shippingAddress as unknown as Prisma.InputJsonValue,
        items: { create: items },
        statusHistory: { create: initialHistory },
      },
      include: orderInclude,
    });
    return mapOrder(row);
  }
  async findById(id: string) {
    const row = await this.p.order.findUnique({ where: { id }, include: orderInclude });
    return row ? mapOrder(row) : null;
  }
  async findByOrderNumber(orderNumber: string) {
    const row = await this.p.order.findUnique({ where: { orderNumber }, include: orderInclude });
    return row ? mapOrder(row) : null;
  }
  async query(params: OrderQuery) {
    const where: Prisma.OrderWhereInput = {
      ...(params.userId ? { userId: params.userId } : {}),
      ...(params.status ? { status: params.status } : {}),
      ...(params.paymentStatus ? { paymentStatus: params.paymentStatus } : {}),
      ...(params.q
        ? {
            OR: [
              { orderNumber: { contains: params.q, mode: 'insensitive' } },
              { guestEmail: { contains: params.q, mode: 'insensitive' } },
              { user: { is: { email: { contains: params.q, mode: 'insensitive' } } } },
            ],
          }
        : {}),
    };
    const [rows, total] = await Promise.all([
      this.p.order.findMany({ where, include: orderInclude, orderBy: { createdAt: 'desc' }, skip: (params.page - 1) * params.pageSize, take: params.pageSize }),
      this.p.order.count({ where }),
    ]);
    return { items: rows.map(mapOrder), total };
  }
  async update(id: string, data: Partial<Omit<OrderEntity, 'id' | 'createdAt'>>) {
    const { shippingAddress, ...rest } = data;
    const row = await this.p.order.update({
      where: { id },
      data: { ...rest, ...(shippingAddress ? { shippingAddress: shippingAddress as unknown as Prisma.InputJsonValue } : {}) },
      include: orderInclude,
    });
    return mapOrder(row);
  }
  addStatusHistory(data: Omit<OrderStatusHistoryEntity, 'id' | 'createdAt'>) {
    return this.p.orderStatusHistory.create({ data });
  }
  async stats() {
    const orders = await this.p.order.findMany({ select: { status: true, paymentStatus: true, totalCents: true, createdAt: true } });
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
    if (!userIds.length) return map;
    const orders = await this.p.order.findMany({ where: { userId: { in: userIds } } });
    for (const o of orders) {
      if (!o.userId) continue;
      const st = map.get(o.userId);
      if (!st) continue;
      st.orderCount += 1;
      if (o.paymentStatus === 'PAID' && o.status !== 'CANCELLED') st.totalSpentCents += o.totalCents;
      if (!st.lastOrderAt || o.createdAt > st.lastOrderAt) st.lastOrderAt = o.createdAt;
    }
    return map;
  }
  async orderNumberExists(orderNumber: string) {
    const n = await this.p.order.count({ where: { orderNumber } });
    return n > 0;
  }
}

class PrismaPaymentRepository implements PaymentRepository {
  constructor(private p: Client) {}
  create(data: Omit<PaymentEntity, 'id' | 'createdAt' | 'updatedAt'>) {
    return this.p.payment.create({ data });
  }
  findById(id: string) {
    return this.p.payment.findUnique({ where: { id } });
  }
  findByOrderId(orderId: string) {
    return this.p.payment.findUnique({ where: { orderId } });
  }
  findByProviderPaymentId(providerPaymentId: string) {
    return this.p.payment.findUnique({ where: { providerPaymentId } });
  }
  update(id: string, data: Partial<Omit<PaymentEntity, 'id' | 'createdAt'>>) {
    return this.p.payment.update({ where: { id }, data });
  }
}

class PrismaAuditLogRepository implements AuditLogRepository {
  constructor(private p: Client) {}
  async create(data: Omit<AuditLogEntity, 'id' | 'createdAt'>): Promise<AuditLogEntity> {
    const row = await this.p.auditLog.create({ data: { ...data, metadata: data.metadata === null ? Prisma.JsonNull : (data.metadata as Prisma.InputJsonValue) } });
    return { ...row, metadata: (row.metadata as Record<string, unknown> | null) ?? null };
  }
  async list(params: { page: number; pageSize: number }) {
    const [rows, total] = await Promise.all([
      this.p.auditLog.findMany({ orderBy: { createdAt: 'desc' }, skip: (params.page - 1) * params.pageSize, take: params.pageSize }),
      this.p.auditLog.count(),
    ]);
    return { items: rows.map((l) => ({ ...l, metadata: (l.metadata as Record<string, unknown> | null) ?? null })), total };
  }
}

class PrismaIdempotencyRepository implements IdempotencyRepository {
  constructor(private p: Client) {}
  find(scope: string, key: string) {
    return this.p.idempotencyRecord.findUnique({ where: { scope_key: { scope, key } } });
  }
  async save(record: { scope: string; key: string; orderId: string }) {
    await this.p.idempotencyRecord.upsert({
      where: { scope_key: { scope: record.scope, key: record.key } },
      create: record,
      update: { orderId: record.orderId },
    });
  }
}

function bind(client: Client): Database {
  const db: Database = {
    kind: 'prisma',
    users: new PrismaUserRepository(client),
    refreshTokens: new PrismaRefreshTokenRepository(client),
    passwordResetTokens: new PrismaPasswordResetTokenRepository(client),
    addresses: new PrismaAddressRepository(client),
    categories: new PrismaCategoryRepository(client),
    products: new PrismaProductRepository(client),
    variants: new PrismaVariantRepository(client),
    carts: new PrismaCartRepository(client),
    favorites: new PrismaFavoriteRepository(client),
    orders: new PrismaOrderRepository(client),
    payments: new PrismaPaymentRepository(client),
    auditLogs: new PrismaAuditLogRepository(client),
    idempotency: new PrismaIdempotencyRepository(client),
    async transaction<T>(fn: (tx: Database) => Promise<T>) {
      if (!('$transaction' in client)) return fn(db);
      return (client as PrismaClient).$transaction((tx) => fn(bind(tx)));
    },
    async reset() {
      if (!('$executeRawUnsafe' in client)) throw new Error('reset yalnızca kök PrismaClient ile çağrılır');
      await seedPrisma(client as PrismaClient, { wipe: true });
    },
  };
  return db;
}

export async function seedPrisma(
  prisma: PrismaClient,
  opts?: { wipe?: boolean; adminEmail?: string; adminPassword?: string; demoCustomerEmail?: string; demoCustomerPassword?: string },
) {
  if (opts?.wipe) {
    await prisma.$executeRawUnsafe(`
      TRUNCATE TABLE
        "IdempotencyRecord", "AuditLog", "OrderStatusHistory", "Payment", "OrderItem", "Order",
        "Favorite", "CartItem", "Cart", "ProductVariant", "ProductImage", "Product", "Category",
        "Address", "PasswordResetToken", "RefreshToken", "User"
      RESTART IDENTITY CASCADE
    `);
  }
  const data = buildSeedData({
    adminEmail: opts?.adminEmail ?? env.ADMIN_EMAIL,
    adminPassword: opts?.adminPassword ?? env.ADMIN_PASSWORD,
    demoCustomerEmail: opts?.demoCustomerEmail ?? env.DEMO_CUSTOMER_EMAIL,
    demoCustomerPassword: opts?.demoCustomerPassword ?? env.DEMO_CUSTOMER_PASSWORD,
  });
  if (data.users.length) await prisma.user.createMany({ data: data.users });
  if (data.addresses.length) await prisma.address.createMany({ data: data.addresses });
  if (data.categories.length) await prisma.category.createMany({ data: data.categories });
  if (data.products.length) await prisma.product.createMany({ data: data.products });
  if (data.productImages.length) await prisma.productImage.createMany({ data: data.productImages });
  if (data.productVariants.length) await prisma.productVariant.createMany({ data: data.productVariants });
}

export async function createPrismaDatabase(): Promise<Database> {
  if (!env.DATABASE_URL) {
    throw new Error('DATA_SOURCE=prisma için DATABASE_URL zorunludur. docker compose up -d db && npx prisma migrate deploy && npx prisma db seed');
  }
  const prisma = new PrismaClient({ log: env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'] });
  await prisma.$connect();
  const count = await prisma.category.count();
  if (count === 0) await seedPrisma(prisma);
  return bind(prisma);
}
