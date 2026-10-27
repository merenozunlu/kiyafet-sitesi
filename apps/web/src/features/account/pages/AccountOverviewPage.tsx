import { Link } from 'react-router-dom';
import { ArrowRight, Heart, MapPin, Package } from 'lucide-react';
import { formatCents } from '@shop/shared';
import { OrderStatusBadge } from '@/components/ui/OrderStatusBadge';
import { Skeleton } from '@/components/ui/Feedback';
import { useFavoriteCount } from '@/features/favorites/useFavorites';
import { useOrders } from '@/features/orders/useOrders';
import { usePageTitle } from '@/hooks/usePageTitle';
import { formatDate } from '@/lib/utils';
import { useAddresses } from '../useAddresses';

export default function AccountOverviewPage() {
  usePageTitle('Hesabım');
  const orders = useOrders(1);
  const { addresses } = useAddresses();
  const favCount = useFavoriteCount();
  const recent = orders.data?.data.slice(0, 3) ?? [];

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={Package} label="Sipariş" value={orders.data?.meta.total ?? '—'} to="/hesap/siparisler" />
        <StatCard icon={MapPin} label="Kayıtlı adres" value={addresses.length} to="/hesap/adresler" />
        <StatCard icon={Heart} label="Favori" value={favCount} to="/favoriler" />
      </div>

      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Son Siparişler</h2>
          <Link to="/hesap/siparisler" className="flex items-center gap-1 text-sm text-secondary hover:text-primary">
            Tümü <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>
        <div className="mt-3 divide-y divide-border rounded-lg border border-border">
          {orders.isLoading ? (
            [0, 1, 2].map((i) => <Skeleton key={i} className="m-4 h-10" />)
          ) : recent.length === 0 ? (
            <p className="p-6 text-center text-sm text-secondary">Henüz siparişiniz yok.</p>
          ) : (
            recent.map((o) => (
              <Link key={o.id} to={`/hesap/siparisler/${o.id}`} className="flex items-center justify-between gap-4 p-4 text-sm hover:bg-surface-muted">
                <div>
                  <p className="font-mono font-medium">{o.orderNumber}</p>
                  <p className="text-xs text-secondary">
                    {formatDate(o.createdAt)} · {o.items.length} ürün
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <OrderStatusBadge status={o.status} size="sm" />
                  <span className="tabular-nums font-medium">{formatCents(o.totalCents)}</span>
                </div>
              </Link>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, to }: { icon: typeof Package; label: string; value: number | string; to: string }) {
  return (
    <Link to={to} className="flex items-center gap-4 rounded-lg border border-border p-4 hover:bg-surface-muted">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-muted">
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <div>
        <p className="text-2xl font-semibold tabular-nums">{value}</p>
        <p className="text-xs text-secondary">{label}</p>
      </div>
    </Link>
  );
}
