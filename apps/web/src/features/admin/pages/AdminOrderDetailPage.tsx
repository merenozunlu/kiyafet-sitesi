import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { formatCents, ORDER_STATUS_LABELS, ORDER_STATUS_TRANSITIONS, PAYMENT_METHOD_LABELS, updateOrderStatusSchema, type OrderStatus, type UpdateOrderStatusInput } from '@shop/shared';
import { ProductImage } from '@/components/product/ProductImage';
import { Button } from '@/components/ui/Button';
import { ErrorState, PageSpinner } from '@/components/ui/Feedback';
import { Input } from '@/components/ui/Input';
import { OrderStatusBadge, PaymentStatusBadge } from '@/components/ui/OrderStatusBadge';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { OrderTimeline } from '@/features/orders/components/OrderTimeline';
import { usePageTitle } from '@/hooks/usePageTitle';
import { getErrorMessage } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-client';
import { formatDateTime } from '@/lib/utils';
import { adminService } from '@/services/admin.service';
import { toast } from '@/store/ui.store';
import { PageHeader } from '../components/AdminUi';

export default function AdminOrderDetailPage() {
  const { id = '' } = useParams();
  const qc = useQueryClient();
  const { data: order, isLoading, error, refetch } = useQuery({ queryKey: queryKeys.admin.order(id), queryFn: ({ signal }) => adminService.orders.byId(id, signal), enabled: !!id });
  usePageTitle(order ? `Sipariş ${order.orderNumber}` : 'Sipariş');

  const invalidate = (fresh: typeof order) => {
    if (fresh) qc.setQueryData(queryKeys.admin.order(id), fresh);
    void qc.invalidateQueries({ queryKey: ['admin', 'orders'] });
    void qc.invalidateQueries({ queryKey: queryKeys.admin.dashboard });
  };

  const statusMut = useMutation({
    mutationFn: (input: UpdateOrderStatusInput) => adminService.orders.updateStatus(id, input),
    onSuccess: (o) => {
      invalidate(o);
      toast.success('Sipariş durumu güncellendi', ORDER_STATUS_LABELS[o.status]);
    },
    onError: (e) => toast.error('Güncellenemedi', getErrorMessage(e)),
  });
  const payMut = useMutation({
    mutationFn: (input: { paymentStatus: 'PAID' | 'FAILED' | 'REFUNDED'; note?: string }) => adminService.orders.updatePaymentStatus(id, input),
    onSuccess: (o) => {
      invalidate(o);
      toast.success('Ödeme durumu güncellendi');
    },
    onError: (e) => toast.error('Güncellenemedi', getErrorMessage(e)),
  });

  if (isLoading) return <PageSpinner />;
  if (error || !order) return <ErrorState error={error} title="Sipariş bulunamadı" onRetry={() => void refetch()} />;

  const next = ORDER_STATUS_TRANSITIONS[order.status];

  return (
    <div>
      <Link to="/admin/siparisler" className="mb-3 flex items-center gap-1 text-sm text-secondary hover:text-primary">
        <ChevronLeft className="h-4 w-4" aria-hidden /> Siparişler
      </Link>
      <PageHeader
        title={order.orderNumber}
        description={`${formatDateTime(order.createdAt)} · ${order.customerEmail}`}
        actions={
          <div className="flex items-center gap-2">
            <OrderStatusBadge status={order.status} />
            <PaymentStatusBadge status={order.paymentStatus} />
          </div>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <section className="rounded-lg border border-border bg-surface p-5">
            <h2 className="text-sm font-semibold">Ürünler</h2>
            <ul className="mt-3 divide-y divide-border">
              {order.items.map((it) => (
                <li key={it.id} className="flex items-center gap-4 py-3 text-sm">
                  <ProductImage src={it.imageUrl} alt={it.productName} className="h-16 w-12 rounded" />
                  <div className="min-w-0 flex-1">
                    <Link to={`/admin/urunler/${it.productId}`} className="font-medium hover:underline">
                      {it.productName}
                    </Link>
                    <p className="text-xs text-secondary">
                      {it.size} · {it.color} · {it.variantSku} · {it.quantity} × {formatCents(it.unitPriceCents)}
                    </p>
                  </div>
                  <span className="tabular-nums">{formatCents(it.lineTotalCents)}</span>
                </li>
              ))}
            </ul>
            <dl className="ml-auto mt-4 max-w-xs space-y-1.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-secondary">Ara toplam</dt>
                <dd className="tabular-nums">{formatCents(order.subtotalCents)}</dd>
              </div>
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

          <section className="rounded-lg border border-border bg-surface p-5">
            <h2 className="text-sm font-semibold">Durum geçmişi</h2>
            <OrderTimeline history={order.statusHistory} className="mt-4" />
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-lg border border-border bg-surface p-5">
            <h2 className="text-sm font-semibold">Durum güncelle</h2>
            {next.length === 0 ? (
              <p className="mt-2 text-sm text-secondary">Bu sipariş nihai durumda.</p>
            ) : (
              <StatusForm
                next={next}
                currentTracking={order.trackingNumber}
                loading={statusMut.isPending}
                onSubmit={(v) => statusMut.mutate(v)}
              />
            )}
          </section>

          <section className="rounded-lg border border-border bg-surface p-5">
            <h2 className="text-sm font-semibold">Ödeme</h2>
            <p className="mt-2 text-sm">
              {PAYMENT_METHOD_LABELS[order.paymentMethod]} · {order.payment?.provider}
            </p>
            {order.payment?.cardLast4 && <p className="text-sm text-secondary">Kart •••• {order.payment.cardLast4}</p>}
            <p className="text-xs text-secondary">Referans: {order.payment?.reference}</p>
            {order.paymentMethod === 'BANK_TRANSFER' && order.paymentStatus === 'PENDING' && (
              <div className="mt-4 flex flex-col gap-2">
                <Button size="sm" onClick={() => payMut.mutate({ paymentStatus: 'PAID', note: 'Havale onaylandı' })} loading={payMut.isPending}>
                  Havale onayla
                </Button>
                <Button size="sm" variant="outline" className="text-danger" onClick={() => payMut.mutate({ paymentStatus: 'FAILED', note: 'Havale ulaşmadı' })} loading={payMut.isPending}>
                  Ödemeyi reddet
                </Button>
              </div>
            )}
            {order.paymentStatus === 'PAID' && (
              <Button size="sm" variant="outline" className="mt-3" onClick={() => payMut.mutate({ paymentStatus: 'REFUNDED' })} loading={payMut.isPending}>
                İade olarak işaretle
              </Button>
            )}
          </section>

          <section className="rounded-lg border border-border bg-surface p-5 text-sm">
            <h2 className="text-sm font-semibold">Müşteri</h2>
            <p className="mt-2 font-medium">
              {order.customer ? `${order.customer.firstName} ${order.customer.lastName}` : `${order.shippingAddress.firstName} ${order.shippingAddress.lastName}`}
            </p>
            <p className="text-secondary">{order.customerEmail}</p>
            {order.customer?.id && (
              <Link to={`/admin/musteriler?q=${encodeURIComponent(order.customerEmail)}`} className="mt-2 inline-block text-xs underline underline-offset-4">
                Müşteri kaydına git
              </Link>
            )}
            <h3 className="mt-4 text-xs font-medium uppercase tracking-wide text-secondary">Teslimat</h3>
            <p className="mt-1">{order.shippingAddress.line}</p>
            <p>
              {order.shippingAddress.district} / {order.shippingAddress.city} {order.shippingAddress.postalCode ?? ''}
            </p>
            <p>{order.shippingAddress.phone}</p>
            {order.trackingNumber && (
              <p className="mt-2 font-mono text-xs">
                Takip: {order.trackingNumber}
              </p>
            )}
            {order.note && (
              <>
                <h3 className="mt-4 text-xs font-medium uppercase tracking-wide text-secondary">Not</h3>
                <p className="mt-1">{order.note}</p>
              </>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}

function StatusForm({ next, currentTracking, loading, onSubmit }: { next: readonly OrderStatus[]; currentTracking: string | null; loading: boolean; onSubmit: (v: UpdateOrderStatusInput) => void }) {
  const form = useForm<UpdateOrderStatusInput>({
    resolver: zodResolver(updateOrderStatusSchema),
    defaultValues: { status: next[0], note: '', trackingNumber: currentTracking ?? '' },
  });
  const status = form.watch('status');
  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="mt-3 space-y-3" noValidate>
      <Select
        label="Yeni durum"
        options={next.map((s) => ({ value: s, label: ORDER_STATUS_LABELS[s] }))}
        {...form.register('status')}
        error={form.formState.errors.status?.message}
      />
      {(status === 'SHIPPED' || currentTracking) && (
        <Input label="Kargo takip numarası" {...form.register('trackingNumber')} error={form.formState.errors.trackingNumber?.message} />
      )}
      <Textarea label="Not (isteğe bağlı)" rows={2} {...form.register('note')} />
      <Button type="submit" size="sm" fullWidth loading={loading}>
        Durumu güncelle
      </Button>
    </form>
  );
}
