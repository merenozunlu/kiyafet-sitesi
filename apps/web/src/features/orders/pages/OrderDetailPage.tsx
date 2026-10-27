import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChevronLeft, Landmark } from 'lucide-react';
import { CUSTOMER_CANCELLABLE_STATUSES, formatCents, PAYMENT_METHOD_LABELS } from '@shop/shared';
import { ProductImage } from '@/components/product/ProductImage';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ErrorState, PageSpinner } from '@/components/ui/Feedback';
import { OrderStatusBadge, PaymentStatusBadge } from '@/components/ui/OrderStatusBadge';
import { Textarea } from '@/components/ui/Textarea';
import { usePageTitle } from '@/hooks/usePageTitle';
import { formatDateTime } from '@/lib/utils';
import { OrderTimeline } from '../components/OrderTimeline';
import { useCancelOrder, useOrder } from '../useOrders';

export default function OrderDetailPage() {
  const { id = '' } = useParams();
  const { data: order, isLoading, error, refetch } = useOrder(id);
  usePageTitle(order ? `Sipariş ${order.orderNumber}` : 'Sipariş');
  const cancel = useCancelOrder(id);
  const [confirm, setConfirm] = useState(false);
  const [reason, setReason] = useState('');

  if (isLoading) return <PageSpinner />;
  if (error || !order) return <ErrorState error={error} title="Sipariş bulunamadı" onRetry={() => void refetch()} />;

  const cancellable = CUSTOMER_CANCELLABLE_STATUSES.includes(order.status);
  const bank = order.payment?.bankTransferInstructions;

  return (
    <div>
      <Link to="/hesap/siparisler" className="flex items-center gap-1 text-sm text-secondary hover:text-primary">
        <ChevronLeft className="h-4 w-4" aria-hidden /> Siparişlerim
      </Link>
      <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-mono text-2xl font-semibold">{order.orderNumber}</h2>
          <p className="mt-1 text-sm text-secondary">{formatDateTime(order.createdAt)}</p>
        </div>
        <div className="flex items-center gap-2">
          <OrderStatusBadge status={order.status} />
          <PaymentStatusBadge status={order.paymentStatus} />
        </div>
      </div>

      {bank && order.paymentStatus === 'PENDING' && (
        <section className="mt-6 rounded-lg border border-accent/40 bg-accent/5 p-5 text-sm">
          <h3 className="flex items-center gap-2 font-semibold">
            <Landmark className="h-4 w-4" aria-hidden /> Ödeme bekleniyor — Havale/EFT bilgileri
          </h3>
          <dl className="mt-3 grid gap-2 sm:grid-cols-2">
            <div>
              <dt className="text-xs text-secondary">Banka</dt>
              <dd>{bank.bankName}</dd>
            </div>
            <div>
              <dt className="text-xs text-secondary">Hesap sahibi</dt>
              <dd>{bank.accountHolder}</dd>
            </div>
            <div>
              <dt className="text-xs text-secondary">IBAN</dt>
              <dd className="font-mono">{bank.iban}</dd>
            </div>
            <div>
              <dt className="text-xs text-secondary">Açıklama</dt>
              <dd className="font-mono">{bank.reference}</dd>
            </div>
          </dl>
        </section>
      )}

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_300px]">
        <div className="space-y-8">
          <section>
            <h3 className="text-sm font-medium uppercase tracking-wide text-secondary">Ürünler</h3>
            <ul className="mt-2 divide-y divide-border border-y border-border">
              {order.items.map((it) => (
                <li key={it.id} className="flex items-center gap-4 py-3 text-sm">
                  <ProductImage src={it.imageUrl} alt={it.productName} className="h-20 w-16 rounded" />
                  <div className="min-w-0 flex-1">
                    <Link to={`/urun/${it.productSlug}`} className="font-medium hover:underline">
                      {it.productName}
                    </Link>
                    <p className="text-xs text-secondary">
                      Beden {it.size} · {it.color} · SKU {it.variantSku}
                    </p>
                    <p className="text-xs text-secondary">
                      {it.quantity} × {formatCents(it.unitPriceCents)}
                    </p>
                  </div>
                  <span className="tabular-nums font-medium">{formatCents(it.lineTotalCents)}</span>
                </li>
              ))}
            </ul>
            <dl className="ml-auto mt-4 max-w-xs space-y-1.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-secondary">Ara toplam</dt>
                <dd className="tabular-nums">{formatCents(order.subtotalCents)}</dd>
              </div>
              {order.discountCents > 0 && (
                <div className="flex justify-between">
                  <dt className="text-secondary">İndirim</dt>
                  <dd className="tabular-nums">−{formatCents(order.discountCents)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-secondary">Kargo</dt>
                <dd className="tabular-nums">{order.shippingCents === 0 ? 'Ücretsiz' : formatCents(order.shippingCents)}</dd>
              </div>
              <div className="flex justify-between border-t border-border pt-2 font-semibold">
                <dt>Toplam</dt>
                <dd className="tabular-nums">{formatCents(order.totalCents)}</dd>
              </div>
            </dl>
          </section>

          <section>
            <h3 className="text-sm font-medium uppercase tracking-wide text-secondary">Durum Geçmişi</h3>
            <OrderTimeline history={order.statusHistory} className="mt-4" />
          </section>
        </div>

        <aside className="space-y-6 text-sm">
          <div className="rounded-lg border border-border p-4">
            <h3 className="text-xs font-medium uppercase tracking-wide text-secondary">Teslimat adresi</h3>
            <p className="mt-2 font-medium">
              {order.shippingAddress.firstName} {order.shippingAddress.lastName}
            </p>
            <p>{order.shippingAddress.line}</p>
            <p>
              {order.shippingAddress.district} / {order.shippingAddress.city} {order.shippingAddress.postalCode ?? ''}
            </p>
            <p>{order.shippingAddress.phone}</p>
            {order.trackingNumber && (
              <p className="mt-3 border-t border-border pt-3">
                Kargo takip: <span className="font-mono">{order.trackingNumber}</span>
              </p>
            )}
          </div>
          <div className="rounded-lg border border-border p-4">
            <h3 className="text-xs font-medium uppercase tracking-wide text-secondary">Ödeme</h3>
            <p className="mt-2 font-medium">{PAYMENT_METHOD_LABELS[order.paymentMethod]}</p>
            {order.payment?.cardLast4 && <p className="text-secondary">Kart •••• {order.payment.cardLast4}</p>}
            <p className="text-secondary">Referans: {order.payment?.reference}</p>
          </div>
          {order.note && (
            <div className="rounded-lg border border-border p-4">
              <h3 className="text-xs font-medium uppercase tracking-wide text-secondary">Sipariş notu</h3>
              <p className="mt-2">{order.note}</p>
            </div>
          )}
          {cancellable ? (
            <Button variant="outline" fullWidth className="text-danger" onClick={() => setConfirm(true)}>
              Siparişi İptal Et
            </Button>
          ) : (
            order.status !== 'CANCELLED' &&
            order.status !== 'RETURNED' && (
              <p className="text-xs text-secondary">
                Bu sipariş hazırlanmaya başlandığı için artık iptal edilemez. İade için{' '}
                <Link to="/yardim/teslimat-iade" className="underline underline-offset-4">
                  iade koşullarına
                </Link>{' '}
                bakın.
              </p>
            )
          )}
        </aside>
      </div>

      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Siparişi iptal et"
        description={
          <div className="space-y-3">
            <p>Bu işlem geri alınamaz. Ödeme yaptıysanız iade aynı yönteme yapılır.</p>
            <Textarea label="İptal nedeni (isteğe bağlı)" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} />
          </div>
        }
        confirmLabel="Evet, iptal et"
        cancelLabel="Vazgeç"
        destructive
        loading={cancel.isPending}
        onConfirm={async () => {
          await cancel.mutateAsync(reason || undefined);
          setConfirm(false);
        }}
      />
    </div>
  );
}
