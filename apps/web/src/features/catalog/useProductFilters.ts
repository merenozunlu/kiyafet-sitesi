import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PRODUCT_SORTS, type ProductSort } from '@shop/shared';
import type { ProductListParams } from '@/services/product.service';

export interface FilterState {
  q: string;
  minPrice: number | undefined;
  maxPrice: number | undefined;
  size: string[];
  color: string[];
  inStock: boolean;
  onSale: boolean;
  isNew: boolean;
  isFeatured: boolean;
  sort: ProductSort;
  page: number;
}

const bool = (v: string | null) => v === 'true' || v === '1';
const num = (v: string | null) => {
  if (v == null || v === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
};
const list = (v: string | null) => (v ? v.split(',').map((s) => s.trim()).filter(Boolean) : []);

/** Filtreleri URL query parametreleriyle senkronize tutar. */
export function useProductFilters() {
  const [params, setParams] = useSearchParams();

  const state: FilterState = useMemo(() => {
    const sortParam = params.get('sort');
    return {
      q: params.get('q') ?? '',
      minPrice: num(params.get('minPrice')),
      maxPrice: num(params.get('maxPrice')),
      size: list(params.get('size')),
      color: list(params.get('color')),
      inStock: bool(params.get('inStock')),
      onSale: bool(params.get('onSale')),
      isNew: bool(params.get('isNew')),
      isFeatured: bool(params.get('isFeatured')),
      sort: (PRODUCT_SORTS as readonly string[]).includes(sortParam ?? '') ? (sortParam as ProductSort) : 'recommended',
      page: Math.max(1, Number(params.get('page')) || 1),
    };
  }, [params]);

  const update = useCallback(
    (patch: Partial<FilterState>, options?: { resetPage?: boolean }) => {
      const next = new URLSearchParams(params);
      const merged = { ...state, ...patch };
      if (options?.resetPage !== false && !('page' in patch)) merged.page = 1;

      const setOrDelete = (k: string, v: string | undefined | null) => {
        if (v === undefined || v === null || v === '') next.delete(k);
        else next.set(k, v);
      };
      setOrDelete('q', merged.q || undefined);
      setOrDelete('minPrice', merged.minPrice?.toString());
      setOrDelete('maxPrice', merged.maxPrice?.toString());
      setOrDelete('size', merged.size.length ? merged.size.join(',') : undefined);
      setOrDelete('color', merged.color.length ? merged.color.join(',') : undefined);
      setOrDelete('inStock', merged.inStock ? 'true' : undefined);
      setOrDelete('onSale', merged.onSale ? 'true' : undefined);
      setOrDelete('isNew', merged.isNew ? 'true' : undefined);
      setOrDelete('isFeatured', merged.isFeatured ? 'true' : undefined);
      setOrDelete('sort', merged.sort !== 'recommended' ? merged.sort : undefined);
      setOrDelete('page', merged.page > 1 ? String(merged.page) : undefined);
      setParams(next, { replace: false });
    },
    [params, setParams, state],
  );

  const reset = useCallback(() => {
    const next = new URLSearchParams();
    if (state.q) next.set('q', state.q);
    setParams(next);
  }, [setParams, state.q]);

  const activeCount =
    (state.minPrice != null || state.maxPrice != null ? 1 : 0) +
    state.size.length +
    state.color.length +
    Number(state.inStock) +
    Number(state.onSale) +
    Number(state.isNew) +
    Number(state.isFeatured);

  const toParams = useCallback(
    (extra?: Partial<ProductListParams>): ProductListParams => ({
      q: state.q || undefined,
      minPrice: state.minPrice,
      maxPrice: state.maxPrice,
      size: state.size.length ? state.size : undefined,
      color: state.color.length ? state.color : undefined,
      inStock: state.inStock || undefined,
      onSale: state.onSale || undefined,
      isNew: state.isNew || undefined,
      isFeatured: state.isFeatured || undefined,
      sort: state.sort,
      page: state.page,
      pageSize: 12,
      ...extra,
    }),
    [state],
  );

  return { state, update, reset, activeCount, toParams };
}
