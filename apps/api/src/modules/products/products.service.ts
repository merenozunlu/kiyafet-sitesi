import type { ProductListQuery, ProductListResponseDto, SearchResponseDto, Size } from '@shop/shared';
import { liraToCents, SIZES } from '@shop/shared';
import { db } from '../../shared/db';
import type { ProductWithRelations } from '../../shared/db/repositories';
import type { CategoryEntity } from '../../shared/db/entities';
import { AppError } from '../../shared/errors';
import { paginationMeta, toCategoryDto, toProductDetailDto, toProductListItemDto } from '../../shared/mappers';

async function categoryMap(): Promise<Map<string, CategoryEntity>> {
  const cats = await db().categories.list();
  return new Map(cats.map((c) => [c.id, c]));
}

function mapList(items: ProductWithRelations[], cats: Map<string, CategoryEntity>) {
  return items.flatMap((p) => {
    const c = cats.get(p.categoryId);
    return c ? [toProductListItemDto(p, c)] : [];
  });
}

export const productsService = {
  async list(query: ProductListQuery, categorySlug?: string): Promise<ProductListResponseDto> {
    const cats = await categoryMap();
    let categoryIds: string[] | undefined;
    const slug = categorySlug ?? query.category;
    if (slug) {
      const c = await db().categories.findBySlug(slug);
      if (!c || !c.isActive) throw AppError.notFound('Kategori bulunamadı');
      categoryIds = [c.id];
    }
    const activeCategoryIds = [...cats.values()].filter((c) => c.isActive).map((c) => c.id);

    const { items, total } = await db().products.query({
      q: query.q,
      ids: query.ids,
      categoryIds: categoryIds ?? activeCategoryIds,
      minPriceCents: query.minPrice != null ? liraToCents(query.minPrice) : undefined,
      maxPriceCents: query.maxPrice != null ? liraToCents(query.maxPrice) : undefined,
      sizes: query.size,
      colors: query.color,
      inStock: query.inStock,
      onSale: query.onSale,
      isNew: query.isNew,
      isFeatured: query.isFeatured,
      statuses: ['ACTIVE'],
      sort: query.sort,
      page: query.page,
      pageSize: query.pageSize,
    });

    const facets = await db().products.facets({ categoryIds: categoryIds ?? activeCategoryIds });
    return {
      data: mapList(items, cats),
      meta: paginationMeta(query.page, query.pageSize, total),
      facets: {
        sizes: SIZES.filter((s) => facets.sizes.includes(s)) as Size[],
        colors: facets.colors,
        priceRange: { minCents: facets.minCents, maxCents: facets.maxCents },
      },
    };
  },

  async search(q: string, limit: number): Promise<SearchResponseDto> {
    const cats = await categoryMap();
    const activeCategoryIds = [...cats.values()].filter((c) => c.isActive).map((c) => c.id);
    const { items } = await db().products.query({
      q,
      categoryIds: activeCategoryIds,
      statuses: ['ACTIVE'],
      sort: 'recommended',
      page: 1,
      pageSize: limit,
    });
    const nq = q.toLocaleLowerCase('tr-TR');
    const matchedCategories = [...cats.values()]
      .filter((c) => c.isActive && c.name.toLocaleLowerCase('tr-TR').includes(nq))
      .slice(0, 3)
      .map((c) => toCategoryDto(c));
    return { products: mapList(items, cats), categories: matchedCategories };
  },

  async getById(id: string) {
    const p = await db().products.findById(id);
    if (!p || p.status !== 'ACTIVE') throw AppError.notFound('Ürün bulunamadı');
    const c = await db().categories.findById(p.categoryId);
    if (!c) throw AppError.notFound('Ürün bulunamadı');
    return toProductDetailDto(p, c);
  },

  async getBySlug(slug: string) {
    const p = await db().products.findBySlug(slug);
    if (!p || p.status !== 'ACTIVE') throw AppError.notFound('Ürün bulunamadı');
    const c = await db().categories.findById(p.categoryId);
    if (!c) throw AppError.notFound('Ürün bulunamadı');
    return toProductDetailDto(p, c);
  },

  async related(id: string, limit: number) {
    const p = await db().products.findById(id);
    if (!p) throw AppError.notFound('Ürün bulunamadı');
    const cats = await categoryMap();
    const { items } = await db().products.query({
      categoryId: p.categoryId,
      excludeIds: [p.id],
      statuses: ['ACTIVE'],
      sort: 'recommended',
      page: 1,
      pageSize: limit,
    });
    return mapList(items, cats);
  },

  /** Ana sayfa için tek istekte birden fazla koleksiyon. */
  async home() {
    const cats = await categoryMap();
    const activeIds = [...cats.values()].filter((c) => c.isActive).map((c) => c.id);
    const base = { categoryIds: activeIds, statuses: ['ACTIVE' as const], page: 1, pageSize: 8 };
    const [newArrivals, bestSellers, onSale, featured] = await Promise.all([
      db().products.query({ ...base, isNew: true, sort: 'newest' }),
      db().products.query({ ...base, sort: 'bestselling' }),
      db().products.query({ ...base, onSale: true, sort: 'discount' }),
      db().products.query({ ...base, isFeatured: true, sort: 'recommended', pageSize: 4 }),
    ]);
    const categories = await Promise.all(
      [...cats.values()]
        .filter((c) => c.isActive)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map(async (c) => toCategoryDto(c, await db().categories.countProducts(c.id))),
    );
    return {
      newArrivals: mapList(newArrivals.items, cats),
      bestSellers: mapList(bestSellers.items, cats),
      onSale: mapList(onSale.items, cats),
      featured: mapList(featured.items, cats),
      categories,
    };
  },
};
