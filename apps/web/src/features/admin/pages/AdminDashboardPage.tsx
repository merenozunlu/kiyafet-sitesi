import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { AlertTriangle, Package, ShoppingCart, TrendingUp, Users } from 'lucide-react';
import { formatCents, type OrderDto } from '@shop/shared';
import { ErrorState, Skeleton } from '@/components/ui/Feedback';
import { OrderStatusBadge, PaymentStatusBadge } from '@/components/ui/OrderStatusBadge';
import { usePageTitle } from '@/hooks/usePageTitle';
import { queryKeys } from '@/lib/query-client';
import { formatDateTime } from '@/lib/utils';
import { adminService } from '@/services/admin.service';
import { DataTable, PageHeader, StatCard } from '../components/AdminUi';

export default function AdminDashboardPage() {
  usePageTitle('Yönetim · Genel Bakış');
  const navigate = useNavigate();
  const { data, isLoading, error, refetch } = useQuery({ queryKey: queryKeys.admin.dashboard, queryFn: ({ signal }) => adminService.dashboard(signal), refetchInterval: 60_000 });

  if (error) return <ErrorState error={error} onRetry={() => void refetch()} />;

  const maxRevenue = Math.max(1, ...(data?.salesByDay.map((d) => d.revenueCents) ?? [1]));

  return (
    <div>
      <PageHeader title="Genel Bakış" description="Mağazanızın özet durumu" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {isLoading || !data ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)
        ) : (
          <>
            <StatCard label="Toplam ciro" value={formatCents(data.totals.revenueCents)} hint="Ödemesi alınan siparişler" icon={<TrendingUp className="h-4 w-4" />} />
            <StatCard label="Siparişler" value={data.totals.orders} hint={`${data.totals.pendingOrders} bekliyor · ${data.totals.completedOrders} teslim`} icon={<ShoppingCart className="h-4 w-4" />} />
            <StatCard label="Ürünler" value={data.totals.products} hint={`${data.totals.lowStockVariants} varyant kritik stokta`} icon={<Package className="h-4 w-4" />} />
            <StatCard label="Müşteriler" value={data.totals.customers} icon={<Users className="h-4 w-4" />} />
          </>
        )}
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-[1fr_360px]">
        <section className="rounded-lg border border-border bg-surface p-5">
          <h2 className="text-sm font-semibold">Son 14 gün satış</h2>
          {isLoading || !data ? (
            <Skeleton className="mt-4 h-40" />
          ) : (
            <div className="mt-4 flex h-40 items-end gap-1" role="img" aria-label="Günlük ciro grafiği">
              {data.salesByDay.map((d) => (
                <div key={d.date} className="group relative flex flex-1 flex-col items-center justify-end">
                  <div className="w-full rounded-t bg-primary/80 transition-colors group-hover:bg-accent" style={{ height: `${Math.max(2, (d.revenueCents / maxRevenue) * 100)}%` }} />
                  <span className="pointer-events-none absolute -top-8 hidden whitespace-nowrap rounded bg-primary px-2 py-1 text-[10px] text-surface group-hover:block">
                    {d.date.slice(5)} · {formatCents(d.revenueCents)} · {d.orders} sipariş
                  </span>
                </div>
              ))}
            </div>
          )}
          <div className="mt-2 flex justify-between text-[10px] text-secondary">
            <span>{data?.salesByDay[0]?.date.slice(5)}</span>
            <span>{data?.salesByDay.at(-1)?.date.slice(5)}</span>
          </div>
        </section>

        <section className="rounded-lg border border-border bg-surface p-5">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <AlertTriangle className="h-4 w-4 text-warning" aria-hidden /> Kritik stok
            </h2>
            <Link to="/admin/urunler" className="text-xs text-secondary hover:text-primary">
              Ürünlere git
            </Link>
          </div>
          <ul className="mt-3 divide-y divide-border text-sm">
            {isLoading || !data ? (
              [0, 1, 2].map((i) => <Skeleton key={i} className="my-2 h-8" />)
            ) : data.lowStock.length === 0 ? (
              <li className="py-4 text-center text-secondary">Kritik stokta ürün yok</li>
            ) : (
              data.lowStock.map((v) => (
                <li key={v.sku} className="flex items-center justify-between py-2">
                  <Link to={`/admin/urunler/${v.productId}`} className="min-w-0">
                    <p className="truncate font-medium hover:underline">{v.productName}</p>
                    <p className="text-xs text-secondary">
                      {v.size} · {v.color} · {v.sku}
                    </p>
                  </Link>
                  <span className={`shrink-0 rounded px-2 py-0.5 text-xs font-medium ${v.stockQuantity === 0 ? 'bg-danger/10 text-danger' : 'bg-warning/10 text-warning'}`}>{v.stockQuantity} adet</span>
                </li>
              ))
            )}
          </ul>
        </section>
      </div>

      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Son siparişler</h2>
          <Link to="/admin/siparisler" className="text-xs text-secondary hover:text-primary">
            Tümünü gör
          </Link>
        </div>
        <DataTable<OrderDto>
          isLoading={isLoading}
          rows={data?.recentOrders ?? []}
          rowKey={(o) => o.id}
          onRowClick={(o) => navigate(`/admin/siparisler/${o.id}`)}
          columns={[
            { key: 'no', header: 'Sipariş', render: (o) => <span className="font-mono">{o.orderNumber}</span> },
            { key: 'customer', header: 'Müşteri', render: (o) => (o.customer ? `${o.customer.firstName} ${o.customer.lastName}` : o.customerEmail), hideOnMobile: true },
            { key: 'date', header: 'Tarih', render: (o) => formatDateTime(o.createdAt), hideOnMobile: true },
            { key: 'status', header: 'Durum', render: (o) => <OrderStatusBadge status={o.status} size="sm" /> },
            { key: 'pay', header: 'Ödeme', render: (o) => <PaymentStatusBadge status={o.paymentStatus} size="sm" />, hideOnMobile: true },
            { key: 'total', header: 'Tutar', className: 'text-right', render: (o) => <span className="tabular-nums font-medium">{formatCents(o.totalCents)}</span> },
          ]}
        />
      </section>
    </div>
  );
}
