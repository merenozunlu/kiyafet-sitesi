import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { productService } from '@/services/product.service';
import { queryKeys } from '@/lib/query-client';
import { ProductGrid } from '@/components/product/ProductCard';
import { Pagination } from '@/components/ui/Pagination';
import { EmptyState, ErrorState, ProductGridSkeleton } from '@/components/ui/Feedback';
import { SearchBar } from '@/components/common/SearchBar';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useProductFilters } from '../useProductFilters';

export default function SearchPage() {
  const { state, update, toParams } = useProductFilters();
  const q = state.q.trim();
  usePageTitle(q ? `“${q}” için arama sonuçları` : 'Arama');

  const params = toParams();
  const query = useQuery({
    queryKey: queryKeys.products({ ...params, scope: 'search' }),
    queryFn: ({ signal }) => productService.list(params, signal),
    enabled: q.length >= 2,
    placeholderData: keepPreviousData,
  });

  return (
    <div className="container-page py-8 sm:py-12">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="font-display text-4xl font-semibold">Arama</h1>
        <div className="mt-6">
          <SearchBar size="lg" />
        </div>
      </div>

      <div className="mt-10">
        {q.length < 2 ? (
          <EmptyState icon={<Search className="h-6 w-6" aria-hidden />} title="Ne aramıştınız?" description="Ürün adı, kategori veya renk yazarak arama yapabilirsiniz." />
        ) : query.isLoading ? (
          <ProductGridSkeleton />
        ) : query.isError ? (
          <ErrorState error={query.error} onRetry={() => void query.refetch()} />
        ) : !query.data || query.data.data.length === 0 ? (
          <EmptyState icon={<Search className="h-6 w-6" aria-hidden />} title={`“${q}” için sonuç bulunamadı`} description="Farklı bir kelime deneyin veya kategorilere göz atın." />
        ) : (
          <>
            <p className="mb-6 text-sm text-secondary" aria-live="polite">
              “{q}” için {query.data.meta.total} sonuç
            </p>
            <ProductGrid products={query.data.data} />
            <Pagination page={query.data.meta.page} totalPages={query.data.meta.totalPages} onChange={(p) => update({ page: p }, { resetPage: false })} className="mt-12" />
          </>
        )}
      </div>
    </div>
  );
}
