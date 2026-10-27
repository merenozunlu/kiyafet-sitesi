import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Archive, Plus, Search } from 'lucide-react';
import { formatCents, type ProductDetailDto } from '@shop/shared';
import { ProductImage } from '@/components/product/ProductImage';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ErrorState } from '@/components/ui/Feedback';
import { Input } from '@/components/ui/Input';
import { Pagination } from '@/components/ui/Pagination';
import { Select } from '@/components/ui/Select';
import { useDebounce } from '@/hooks/useDebounce';
import { usePageTitle } from '@/hooks/usePageTitle';
import { getErrorMessage } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-client';
import { adminService } from '@/services/admin.service';
import { toast } from '@/store/ui.store';
import { DataTable, PageHeader } from '../components/AdminUi';

const STATUS_LABEL: Record<ProductDetailDto['status'], { label: string; variant: 'success' | 'neutral' | 'outline' }> = {
  ACTIVE: { label: 'Yayında', variant: 'success' },
  DRAFT: { label: 'Taslak', variant: 'neutral' },
  ARCHIVED: { label: 'Arşiv', variant: 'outline' },
};

export default function AdminProductsPage() {
  usePageTitle('Yönetim · Ürünler');
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Number(params.get('sayfa') ?? 1));
  const status = params.get('durum') ?? '';
  const [q, setQ] = useState(params.get('q') ?? '');
  const dq = useDebounce(q, 300);
  const [archiving, setArchiving] = useState<ProductDetailDto | null>(null);

  const query = { q: dq || undefined, status: status || undefined, page, pageSize: 20 };
  const { data, isLoading, error, refetch } = useQuery({ queryKey: queryKeys.admin.products(query), queryFn: ({ signal }) => adminService.products.list(query, signal), placeholderData: (p) => p });

  const archive = useMutation({
    mutationFn: (id: string) => adminService.products.archive(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'products'] });
      void qc.invalidateQueries({ queryKey: ['products'] });
      toast.success('Ürün arşivlendi');
      setArchiving(null);
    },
    onError: (e) => toast.error('Arşivlenemedi', getErrorMessage(e)),
  });

  const setParam = (k: string, v: string) => {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v);
    else next.delete(k);
    if (k !== 'sayfa') next.delete('sayfa');
    setParams(next);
  };

  return (
    <div>
      <PageHeader
        title="Ürünler"
        description={data ? `${data.meta.total} ürün` : undefined}
        actions={
          <Link to="/admin/urunler/yeni">
            <Button leftIcon={<Plus className="h-4 w-4" />}>Yeni Ürün</Button>
          </Link>
        }
      />
      <div className="mb-4 flex flex-wrap gap-3">
        <Input
          label="Ara"
          hideLabel
          placeholder="Ürün adı veya SKU"
          leftIcon={<Search className="h-4 w-4" />}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setParam('q', e.target.value);
          }}
          containerClassName="w-full sm:w-72"
        />
        <Select
          label="Durum"
          hideLabel
          value={status}
          onChange={(e) => setParam('durum', e.target.value)}
          options={[
            { value: '', label: 'Tüm durumlar' },
            { value: 'ACTIVE', label: 'Yayında' },
            { value: 'DRAFT', label: 'Taslak' },
            { value: 'ARCHIVED', label: 'Arşiv' },
          ]}
          containerClassName="w-44"
        />
      </div>

      {error ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : (
        <>
          <DataTable<ProductDetailDto>
            isLoading={isLoading}
            rows={data?.data ?? []}
            rowKey={(p) => p.id}
            onRowClick={(p) => navigate(`/admin/urunler/${p.id}`)}
            columns={[
              {
                key: 'product',
                header: 'Ürün',
                render: (p) => (
                  <div className="flex items-center gap-3">
                    <ProductImage src={p.images[0]?.imageUrl ?? null} alt="" className="h-12 w-10 rounded" />
                    <div className="min-w-0">
                      <p className="truncate font-medium">{p.name}</p>
                      <p className="truncate text-xs text-secondary">{p.category.name} · /{p.slug}</p>
                    </div>
                  </div>
                ),
              },
              { key: 'price', header: 'Fiyat', render: (p) => <span className="tabular-nums">{formatCents(p.priceCents)}</span> },
              {
                key: 'stock',
                header: 'Stok',
                hideOnMobile: true,
                render: (p) => {
                  const total = p.variants.reduce((n, v) => n + v.stockQuantity, 0);
                  const low = p.variants.filter((v) => v.isActive && v.stockQuantity <= 5).length;
                  return (
                    <span className={total === 0 ? 'text-danger' : ''}>
                      {total} adet · {p.variants.length} varyant{low > 0 && <span className="ml-1 text-warning">({low} kritik)</span>}
                    </span>
                  );
                },
              },
              { key: 'status', header: 'Durum', render: (p) => <Badge variant={STATUS_LABEL[p.status].variant} size="sm">{STATUS_LABEL[p.status].label}</Badge> },
              {
                key: 'actions',
                header: '',
                className: 'text-right',
                render: (p) => (
                  <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                    <Link to={`/admin/urunler/${p.id}`} className="rounded px-2 py-1 text-xs hover:bg-surface-muted">
                      Düzenle
                    </Link>
                    {p.status !== 'ARCHIVED' && (
                      <button type="button" className="rounded px-2 py-1 text-xs text-danger hover:bg-danger/10" onClick={() => setArchiving(p)} aria-label={`${p.name} arşivle`}>
                        <Archive className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ),
              },
            ]}
          />
          {data && <Pagination page={page} totalPages={data.meta.totalPages} onChange={(p) => setParam('sayfa', String(p))} className="mt-4" />}
        </>
      )}

      <ConfirmDialog
        open={!!archiving}
        onClose={() => setArchiving(null)}
        title="Ürünü arşivle"
        description={archiving ? `"${archiving.name}" mağazada görünmez olacak. Sipariş geçmişi korunur; daha sonra durumunu değiştirerek yeniden yayınlayabilirsiniz.` : undefined}
        confirmLabel="Arşivle"
        destructive
        loading={archive.isPending}
        onConfirm={() => {
          if (archiving) archive.mutate(archiving.id);
        }}
      />
    </div>
  );
}
