import type { AdminCustomerDto, AdminDashboardDto, CategoryInput, OrderStatus, PaymentStatus, ProductInput, ProductUpdateInput } from '@shop/shared';
import { commerceConfig } from '../../config/commerce';
import { db } from '../../shared/db';
import type { ProductEntity, ProductImageEntity, ProductVariantEntity } from '../../shared/db/entities';
import { AppError } from '../../shared/errors';
import { paginationMeta, toAuditLogDto, toCategoryDto, toProductDetailDto, toUserDto } from '../../shared/mappers';
import { buildSku } from '../../shared/db/seed-data';
import { orderToDto } from '../orders/orders.service';

export function slugify(input: string): string {
  const map: Record<string, string> = { ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u', İ: 'i', Ç: 'c', Ğ: 'g', Ö: 'o', Ş: 's', Ü: 'u' };
  return input
    .trim()
    .replace(/[çğıöşüİÇĞÖŞÜ]/g, (c) => map[c] ?? c)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 140);
}

async function uniqueProductSlug(base: string, excludeId?: string) {
  let slug = base || 'urun';
  for (let i = 0; i < 50; i++) {
    const existing = await db().products.findBySlug(slug, { includeDeleted: true });
    if (!existing || existing.id === excludeId) return slug;
    slug = `${base}-${i + 2}`;
  }
  throw AppError.conflict('Benzersiz slug üretilemedi');
}

async function audit(actorUserId: string, action: string, entityType: string, entityId: string | null, metadata?: Record<string, unknown>) {
  await db().auditLogs.create({ actorUserId, action, entityType, entityId, metadata: metadata ?? null });
}

async function toDetail(productId: string) {
  const p = await db().products.findById(productId, { includeDeleted: true });
  if (!p) throw AppError.notFound('Ürün bulunamadı');
  const c = await db().categories.findById(p.categoryId);
  if (!c) throw AppError.notFound('Kategori bulunamadı');
  return toProductDetailDto(p, c);
}

function mapImages(images: ProductInput['images']): Omit<ProductImageEntity, 'id' | 'productId'>[] {
  return images.map((img, i) => ({ imageUrl: img.imageUrl, altText: img.altText ?? '', sortOrder: img.sortOrder ?? i }));
}

function mapVariants(slug: string, variants: ProductInput['variants']): (Omit<ProductVariantEntity, 'id' | 'productId' | 'createdAt' | 'updatedAt'> & { id?: string })[] {
  return variants.map((v) => ({
    id: v.id,
    sku: v.sku && v.sku.trim() ? v.sku.trim() : buildSku(slug, v.color, v.size),
    size: v.size,
    color: v.color,
    colorHex: v.colorHex ?? null,
    stockQuantity: v.stockQuantity,
    priceOverrideCents: v.priceOverrideCents ?? null,
    isActive: v.isActive,
  }));
}

export const adminService = {
  async dashboard(): Promise<AdminDashboardDto> {
    const [stats, products, customers, lowStockCount, lowStock, recent] = await Promise.all([
      db().orders.stats(),
      db().products.count({ statuses: ['ACTIVE', 'DRAFT'] }),
      db().users.count({ role: 'CUSTOMER' }),
      db().variants.countLowStock(commerceConfig.lowStockThreshold),
      db().variants.listLowStock(commerceConfig.lowStockThreshold, 8),
      db().orders.query({ page: 1, pageSize: 6 }),
    ]);
    const lowProducts = await db().products.findManyByIds([...new Set(lowStock.map((v) => v.productId))]);
    return {
      totals: {
        orders: stats.total,
        pendingOrders: stats.pending,
        completedOrders: stats.completed,
        revenueCents: stats.revenueCents,
        products,
        lowStockVariants: lowStockCount,
        customers,
      },
      recentOrders: await Promise.all(recent.items.map(orderToDto)),
      salesByDay: stats.salesByDay,
      lowStock: lowStock.map((v) => ({
        productId: v.productId,
        productName: lowProducts.find((p) => p.id === v.productId)?.name ?? '—',
        sku: v.sku,
        size: v.size,
        color: v.color,
        stockQuantity: v.stockQuantity,
      })),
    };
  },

  // ---------- Ürünler ----------
  async listProducts(q: { q?: string; status?: 'ACTIVE' | 'DRAFT' | 'ARCHIVED'; category?: string; page: number; pageSize: number }) {
    let categoryId: string | undefined;
    if (q.category) {
      const c = (await db().categories.findBySlug(q.category)) ?? (await db().categories.findById(q.category));
      if (c) categoryId = c.id;
    }
    const { items, total } = await db().products.query({
      q: q.q,
      categoryId,
      statuses: q.status ? [q.status] : undefined,
      includeDeleted: q.status === 'ARCHIVED',
      sort: 'newest',
      page: q.page,
      pageSize: q.pageSize,
    });
    const cats = new Map((await db().categories.list()).map((c) => [c.id, c]));
    return {
      data: items.flatMap((p) => {
        const c = cats.get(p.categoryId);
        return c ? [toProductDetailDto(p, c)] : [];
      }),
      meta: paginationMeta(q.page, q.pageSize, total),
    };
  },

  getProduct: (id: string) => toDetail(id),

  async createProduct(input: ProductInput, adminId: string) {
    const category = await db().categories.findById(input.categoryId);
    if (!category) throw AppError.validation('Kategori bulunamadı', [{ path: 'categoryId', message: 'Geçerli bir kategori seçin' }]);
    const slug = await uniqueProductSlug(input.slug ?? slugify(input.name));
    const variants = mapVariants(slug, input.variants);
    for (const v of variants) {
      const dup = await db().variants.findBySku(v.sku);
      if (dup) throw AppError.conflict(`SKU zaten kullanımda: ${v.sku}`);
    }
    const p = await db().products.create(
      {
        name: input.name,
        slug,
        description: input.description,
        priceCents: input.priceCents,
        compareAtPriceCents: input.compareAtPriceCents ?? null,
        categoryId: input.categoryId,
        status: input.status,
        isFeatured: input.isFeatured,
        isNew: input.isNew,
      },
      mapImages(input.images),
      variants.map(({ id: _id, ...v }) => v),
    );
    await audit(adminId, 'product.create', 'Product', p.id, { name: p.name });
    return toDetail(p.id);
  },

  async updateProduct(id: string, input: ProductUpdateInput, adminId: string) {
    const existing = await db().products.findById(id, { includeDeleted: true });
    if (!existing) throw AppError.notFound('Ürün bulunamadı');
    if (input.categoryId) {
      const c = await db().categories.findById(input.categoryId);
      if (!c) throw AppError.validation('Kategori bulunamadı', [{ path: 'categoryId', message: 'Geçerli bir kategori seçin' }]);
    }
    const nextPrice = input.priceCents ?? existing.priceCents;
    const nextCompare = input.compareAtPriceCents === undefined ? existing.compareAtPriceCents : input.compareAtPriceCents;
    if (nextCompare != null && nextCompare <= nextPrice) {
      throw AppError.validation('Önceki fiyat güncel fiyattan büyük olmalıdır', [{ path: 'compareAtPriceCents', message: 'Önceki fiyat güncel fiyattan büyük olmalıdır' }]);
    }
    const slug = input.slug ? await uniqueProductSlug(input.slug, id) : input.name && input.name !== existing.name && !input.slug ? existing.slug : existing.slug;

    const patch: Partial<Omit<ProductEntity, 'id' | 'createdAt'>> = {};
    if (input.name !== undefined) patch.name = input.name;
    patch.slug = slug;
    if (input.description !== undefined) patch.description = input.description;
    if (input.priceCents !== undefined) patch.priceCents = input.priceCents;
    if (input.compareAtPriceCents !== undefined) patch.compareAtPriceCents = input.compareAtPriceCents;
    if (input.categoryId !== undefined) patch.categoryId = input.categoryId;
    if (input.status !== undefined) {
      patch.status = input.status;
      if (input.status !== 'ARCHIVED') patch.deletedAt = null;
    }
    if (input.isFeatured !== undefined) patch.isFeatured = input.isFeatured;
    if (input.isNew !== undefined) patch.isNew = input.isNew;
    await db().products.update(id, patch);

    if (input.images) await db().products.replaceImages(id, mapImages(input.images));
    if (input.variants) {
      const variants = mapVariants(slug, input.variants);
      for (const v of variants) {
        const dup = await db().variants.findBySku(v.sku);
        if (dup && dup.productId !== id) throw AppError.conflict(`SKU başka bir üründe kullanımda: ${v.sku}`);
      }
      await db().products.syncVariants(id, variants);
    }
    await audit(adminId, 'product.update', 'Product', id, { fields: Object.keys(input) });
    return toDetail(id);
  },

  async deleteProduct(id: string, adminId: string) {
    const existing = await db().products.findById(id);
    if (!existing) throw AppError.notFound('Ürün bulunamadı');
    await db().products.softDelete(id);
    await audit(adminId, 'product.archive', 'Product', id, { name: existing.name });
  },

  // ---------- Kategoriler ----------
  async listCategories() {
    const cats = await db().categories.list();
    return Promise.all(cats.map(async (c) => toCategoryDto(c, await db().categories.countProducts(c.id))));
  },

  async createCategory(input: CategoryInput, adminId: string) {
    const slug = input.slug ?? slugify(input.name);
    if (await db().categories.findBySlug(slug)) throw AppError.conflict('Bu slug zaten kullanımda');
    const c = await db().categories.create({ name: input.name, slug, description: input.description ?? null, imageUrl: input.imageUrl ?? null, isActive: input.isActive, sortOrder: input.sortOrder });
    await audit(adminId, 'category.create', 'Category', c.id, { name: c.name });
    return toCategoryDto(c, 0);
  },

  async updateCategory(id: string, input: Partial<CategoryInput>, adminId: string) {
    const existing = await db().categories.findById(id);
    if (!existing) throw AppError.notFound('Kategori bulunamadı');
    if (input.slug && input.slug !== existing.slug) {
      const dup = await db().categories.findBySlug(input.slug);
      if (dup) throw AppError.conflict('Bu slug zaten kullanımda');
    }
    const c = await db().categories.update(id, {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.slug !== undefined ? { slug: input.slug } : {}),
      ...(input.description !== undefined ? { description: input.description ?? null } : {}),
      ...(input.imageUrl !== undefined ? { imageUrl: input.imageUrl ?? null } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
    });
    await audit(adminId, 'category.update', 'Category', id, { fields: Object.keys(input) });
    return toCategoryDto(c, await db().categories.countProducts(c.id));
  },

  async deleteCategory(id: string, adminId: string) {
    const existing = await db().categories.findById(id);
    if (!existing) throw AppError.notFound('Kategori bulunamadı');
    const count = await db().categories.countProducts(id);
    if (count > 0) throw AppError.conflict(`Bu kategoride ${count} ürün var. Önce ürünleri taşıyın veya kategoriyi pasife alın.`);
    await db().categories.delete(id);
    await audit(adminId, 'category.delete', 'Category', id, { name: existing.name });
  },

  // ---------- Siparişler ----------
  async listOrders(q: { q?: string; status?: OrderStatus; paymentStatus?: PaymentStatus; page: number; pageSize: number }) {
    const { items, total } = await db().orders.query(q);
    return { data: await Promise.all(items.map(orderToDto)), meta: paginationMeta(q.page, q.pageSize, total) };
  },

  async getOrder(id: string) {
    const o = await db().orders.findById(id);
    if (!o) throw AppError.notFound('Sipariş bulunamadı');
    return orderToDto(o);
  },

  // ---------- Müşteriler ----------
  async listCustomers(q: { q?: string; page: number; pageSize: number }) {
    const { items, total } = await db().users.list({ ...q, role: 'CUSTOMER' });
    const stats = await db().orders.customerStats(items.map((u) => u.id));
    const data: AdminCustomerDto[] = items.map((u) => {
      const s = stats.get(u.id) ?? { orderCount: 0, totalSpentCents: 0, lastOrderAt: null };
      return { ...toUserDto(u), isActive: u.isActive, orderCount: s.orderCount, totalSpentCents: s.totalSpentCents, lastOrderAt: s.lastOrderAt?.toISOString() ?? null };
    });
    return { data, meta: paginationMeta(q.page, q.pageSize, total) };
  },

  async listAuditLogs(page: number, pageSize: number) {
    const { items, total } = await db().auditLogs.list({ page, pageSize });
    const actorIds = [...new Set(items.map((l) => l.actorUserId).filter((x): x is string => !!x))];
    const actors = new Map<string, string>();
    for (const id of actorIds) {
      const u = await db().users.findById(id);
      if (u) actors.set(id, u.email);
    }
    return { data: items.map((l) => toAuditLogDto(l, l.actorUserId ? (actors.get(l.actorUserId) ?? null) : null)), meta: paginationMeta(page, pageSize, total) };
  },

  audit,
};
