import type {
  CategoryDto,
  ProductDetailDto,
  ProductListItemDto,
  ProductListResponseDto,
  SearchResponseDto,
} from '@shop/shared';
import { api } from '@/lib/api-client';

export interface ProductListParams {
  q?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  size?: string[];
  color?: string[];
  inStock?: boolean;
  onSale?: boolean;
  isNew?: boolean;
  isFeatured?: boolean;
  sort?: string;
  page?: number;
  pageSize?: number;
}

export interface HomeDto {
  newArrivals: ProductListItemDto[];
  bestSellers: ProductListItemDto[];
  onSale: ProductListItemDto[];
  featured: ProductListItemDto[];
  categories: CategoryDto[];
}

export const productService = {
  list: (params: ProductListParams, signal?: AbortSignal) =>
    api.get<ProductListResponseDto>('/products', { query: { ...params }, signal, anonymous: true }),
  home: (signal?: AbortSignal) => api.get<{ data: HomeDto }>('/products/home', { signal, anonymous: true }).then((r) => r.data),
  search: (q: string, signal?: AbortSignal) =>
    api.get<{ data: SearchResponseDto }>('/products/search', { query: { q, limit: 6 }, signal, anonymous: true }).then((r) => r.data),
  bySlug: (slug: string, signal?: AbortSignal) =>
    api.get<{ data: ProductDetailDto }>(`/products/slug/${encodeURIComponent(slug)}`, { signal, anonymous: true }).then((r) => r.data),
  related: (id: string, signal?: AbortSignal) =>
    api.get<{ data: ProductListItemDto[] }>(`/products/${id}/related`, { signal, anonymous: true }).then((r) => r.data),
  byIds: async (ids: string[]): Promise<ProductListItemDto[]> => {
    if (!ids.length) return [];
    const res = await api.get<ProductListResponseDto>('/products', {
      query: { ids, pageSize: 48 },
      anonymous: true,
    });
    const order = new Map(ids.map((id, i) => [id, i]));
    return [...res.data].sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
  },
};

export const categoryService = {
  list: (signal?: AbortSignal) =>
    api.get<{ data: CategoryDto[] }>('/categories', { signal, anonymous: true }).then((r) => r.data),
  bySlug: (slug: string, signal?: AbortSignal) =>
    api.get<{ data: CategoryDto }>(`/categories/${encodeURIComponent(slug)}`, { signal, anonymous: true }).then((r) => r.data),
};
