import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { SlidersHorizontal } from 'lucide-react';
import { PRODUCT_SORT_LABELS, PRODUCT_SORTS, type ProductSort } from '@shop/shared';
import { categoryService, productService } from '@/services/product.service';
import { queryKeys } from '@/lib/query-client';
import { ProductGrid } from '@/components/product/ProductCard';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Drawer } from '@/components/ui/Drawer';
import { Pagination } from '@/components/ui/Pagination';
import { EmptyState, ErrorState, ProductGridSkeleton } from '@/components/ui/Feedback';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useProductFilters } from '../useProductFilters';
import { ProductFilters } from '../components/ProductFilters';

export default function ProductListPage() {
  const { slug } = useParams<{ slug?: string }>();
  const { state, update, reset, activeCount, toParams } = useProductFilters();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const categoryQuery = useQuery({
    queryKey: queryKeys.category(slug ?? ''),
    queryFn: ({ signal }) => categoryService.bySlug(slug!, signal),
    enabled: !!slug,
  });

  const params = toParams(slug ? { category: slug } : {});
  const listQuery = useQuery({
    queryKey: queryKeys.products(params as Record<string, unknown>),
    queryFn: ({ signal }) => productService.list(params, signal),
    placeholderData: keepPreviousData,
  });

  const title = slug ? (categoryQuery.data?.name ?? 'Kategori') : state.onSale ? 'İndirimli Ürünler' : state.isNew ? 'Yeni Gelenler' : 'Tüm Ürünler';
  usePageTitle(title);

  const data = listQuery.data;
  const isCategoryMissing = slug && categoryQuery.isError;

  return (
    <div className="container-page py-6 sm:py-10">
      <Breadcrumb items={slug ? [{ label: 'Ürünler', to: '/urunler' }, { label: title }] : [{ label: title }]} />

      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-semibold">{title}</h1>
          {slug && categoryQuery.data?.description && <p className="mt-1 text-sm text-secondary">{categoryQuery.data.description}</p>}
          {data && (
            <p className="mt-1 text-sm text-secondary" aria-live="polite">
              {data.meta.total} ürün
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="lg:hidden" onClick={() => setDrawerOpen(true)} leftIcon={<SlidersHorizontal className="h-4 w-4" />}>
            Filtrele{activeCount > 0 ? ` (${activeCount})` : ''}
          </Button>
          <Select
            label="Sırala"
            hideLabel
            size="sm"
            value={state.sort}
            onChange={(e) => update({ sort: e.target.value as ProductSort })}
            options={PRODUCT_SORTS.map((s) => ({ value: s, label: PRODUCT_SORT_LABELS[s] }))}
            containerClassName="w-44"
          />
        </div>
      </div>

      <div className="mt-8 grid gap-10 lg:grid-cols-[240px_1fr]">
        <aside className="hidden lg:block">
          <div className="sticky top-24">
            <ProductFilters state={state} facets={data?.facets} onChange={(p) => update(p)} onReset={reset} activeCount={activeCount} />
          </div>
        </aside>

        <section aria-label="Ürün listesi" aria-busy={listQuery.isFetching}>
          {isCategoryMissing ? (
            <EmptyState title="Kategori bulunamadı" description="Bu kategori kaldırılmış veya adresi değişmiş olabilir." />
          ) : listQuery.isLoading ? (
            <ProductGridSkeleton count={12} />
          ) : listQuery.isError ? (
            <ErrorState error={listQuery.error} onRetry={() => void listQuery.refetch()} />
          ) : !data || data.data.length === 0 ? (
            <EmptyState
              title="Ürün bulunamadı"
              description="Seçtiğiniz filtrelerle eşleşen ürün yok. Filtreleri temizleyerek tekrar deneyin."
              action={
                activeCount > 0 ? (
                  <Button variant="outline" onClick={reset}>
                    Filtreleri temizle
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div className={listQuery.isFetching ? 'opacity-70 transition-opacity' : ''}>
              <ProductGrid products={data.data} />
              <Pagination
                page={data.meta.page}
                totalPages={data.meta.totalPages}
                onChange={(p) => {
                  update({ page: p }, { resetPage: false });
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="mt-12"
              />
            </div>
          )}
        </section>
      </div>

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Filtreler" side="left" widthClassName="max-w-sm" footer={<Button fullWidth onClick={() => setDrawerOpen(false)}>Sonuçları göster{data ? ` (${data.meta.total})` : ''}</Button>}>
        <ProductFilters state={state} facets={data?.facets} onChange={(p) => update(p)} onReset={reset} activeCount={activeCount} />
      </Drawer>
    </div>
  );
}
