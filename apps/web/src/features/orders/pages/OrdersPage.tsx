import { Link, useSearchParams } from 'react-router-dom';
import { ChevronRight, Package } from 'lucide-react';
import { formatCents, PAYMENT_METHOD_LABELS } from '@shop/shared';
import { ProductImage } from '@/components/product/ProductImage';
import { Button } from '@/components/ui/Button';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/Feedback';
import { OrderStatusBadge, PaymentStatusBadge } from '@/components/ui/OrderStatusBadge';
import { Pagination } from '@/components/ui/Pagination';
import { usePageTitle } from '@/hooks/usePageTitle';
import { formatDate } from '@/lib/utils';
import { useOrders } from '../useOrders';

export default function OrdersPage() {
  usePageTitle('Siparişlerim');
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Number(params.get('sayfa') ?? 1));
  const { data, isLoading, error, refetch } = useOrders(page);

  return (
    <div>
      <h2 className="text-lg font-semibold">Siparişlerim</h2>
      <div className="mt-4 space-y-4">
        {isLoading ? (
          [0, 1, 2].map((i) => <Skeleton key={i} className="h-28" />)
        ) : error ? (
          <ErrorState error={error} onRetry={() => void refetch()} />
        ) : !data || data.data.length === 0 ? (
          <EmptyState icon={<Package className="h-6 w-6" aria-hidden />} title="Henüz siparişiniz yok" description="İlk siparişinizi verdiğinizde burada görünecek." action={<Link to="/urunler"><Button>Alışverişe Başla</Button></Link>} />
        ) : (
          <>
            <ul className="space-y-4">
              {data.data.map((o) => (
                <li key={o.id} className="rounded-lg border border-border">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 text-sm">
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                      <span className="font-mono font-medium">{o.orderNumber}</span>
                      <span className="text-secondary">{formatDate(o.createdAt)}</span>
                      <span className="text-secondary">{PAYMENT_METHOD_LABELS[o.paymentMethod]}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <OrderStatusBadge status={o.status} size="sm" />
                      <PaymentStatusBadge status={o.paymentStatus} size="sm" />
                    </div>
                  </div>
                  <Link to={`/hesap/siparisler/${o.id}`} className="flex items-center gap-4 px-4 py-3 hover:bg-surface-muted">
                    <div className="flex -space-x-3">
                      {o.items.slice(0, 3).map((it) => (
                        <ProductImage key={it.id} src={it.imageUrl} alt={it.productName} className="h-14 w-11 rounded border-2 border-surface" />
                      ))}
                      {o.items.length > 3 && <span className="flex h-14 w-11 items-center justify-center rounded border-2 border-surface bg-surface-muted text-xs">+{o.items.length - 3}</span>}
                    </div>
                    <div className="min-w-0 flex-1 text-sm">
                      <p className="truncate">{o.items.map((i) => i.productName).join(', ')}</p>
                      <p className="text-xs text-secondary">{o.items.reduce((n, i) => n + i.quantity, 0)} ürün</p>
                    </div>
                    <span className="tabular-nums font-medium">{formatCents(o.totalCents)}</span>
                    <ChevronRight className="h-4 w-4 text-secondary" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
            <Pagination page={page} totalPages={data.meta.totalPages} onChange={(p) => setParams({ sayfa: String(p) })} className="mt-6" />
          </>
        )}
      </div>
    </div>
  );
}
