import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useLocation, useParams } from 'react-router-dom';
import { CheckCircle2, Copy, Landmark } from 'lucide-react';
import type { OrderDto } from '@shop/shared';
import { formatCents, PAYMENT_METHOD_LABELS } from '@shop/shared';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PageSpinner } from '@/components/ui/Feedback';
import { OrderStatusBadge, PaymentStatusBadge } from '@/components/ui/OrderStatusBadge';
import { ProductImage } from '@/components/product/ProductImage';
import { usePageTitle } from '@/hooks/usePageTitle';
import { orderService } from '@/services/order.service';
import { useAuthStore, selectIsAuthenticated } from '@/store/auth.store';
import { toast } from '@/store/ui.store';

export default function OrderCompletePage() {
  const { orderNumber = '' } = useParams();
  usePageTitle(`Sipariş ${orderNumber}`);
  const location = useLocation();
  const stateOrder = (location.state as { order?: OrderDto } | null)?.order;
  const isAuthenticated = useAuthStore(selectIsAuthenticated);
  const [email, setEmail] = useState('');
  const [lookupEmail, setLookupEmail] = useState<string | null>(null);

  // Sayfa yenilenirse: giriş yapmış kullanıcı için siparişi listeden bul; misafir için e-posta ile sorgula
  const query = useQuery({
    queryKey: ['orders', 'track', orderNumber, lookupEmail],
    queryFn: ({ signal }) => orderService.track(orderNumber, lookupEmail!, signal),
    enabled: !stateOrder && !!lookupEmail,
  });
  const mine = useQuery({
    queryKey: ['orders', 'byNumber', orderNumber],
    queryFn: async ({ signal }) => {
      const r = await orderService.list(1, signal);
      return r.data.find((o) => o.orderNumber === orderNumber) ?? null;
    },
    enabled: !stateOrder && isAuthenticated,
  });

  const order = stateOrder ?? query.data ?? mine.data ?? null;

  if (!order) {
    if (mine.isLoading || query.isLoading) return <PageSpinner />;
    return (
      <div className="container-page max-w-md py-16">
        <h1 className="font-display text-3xl font-semibold">Siparişinizi görüntüleyin</h1>
        <p className="mt-2 text-sm text-secondary">
          <span className="font-mono">{orderNumber}</span> numaralı siparişi görmek için sipariş verirken kullandığınız e-postayı girin.
        </p>
        <form
          className="mt-6 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setLookupEmail(email.trim());
          }}
        >
          <Input label="E-posta" hideLabel type="email" value={email} onChange={(e) => setEmail(e.target.value)} containerClassName="flex-1" placeholder="ornek@eposta.com" />
          <Button type="submit" loading={query.isFetching}>
            Göster
          </Button>
        </form>
        {query.error && (
          <p className="error-text mt-3" role="alert">
            Sipariş bulunamadı. E-postayı kontrol edin.
          </p>
        )}
      </div>
    );
  }

  const bank = order.payment?.bankTransferInstructions;
  return (
    <div className="container-page max-w-3xl py-10 sm:py-16">
      <div className="text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/10 text-success">
          <CheckCircle2 className="h-8 w-8" aria-hidden />
        </div>
        <h1 className="mt-5 font-display text-4xl font-semibold">Siparişiniz alındı</h1>
        <p className="mt-2 text-secondary">
          Sipariş numaranız: <span className="font-mono font-medium text-primary" data-testid="order-number">{order.orderNumber}</span>
        </p>
        <p className="mt-1 text-sm text-secondary">Onay e-postası {order.customerEmail} adresine gönderilecektir.</p>
        <div className="mt-4 flex items-center justify-center gap-2">
          <OrderStatusBadge status={order.status} />
          <PaymentStatusBadge status={order.paymentStatus} />
        </div>
      </div>

      {bank && (
        <section className="mt-10 rounded-lg border border-accent/40 bg-accent/5 p-6" aria-labelledby="bank-info">
          <h2 id="bank-info" className="flex items-center gap-2 text-lg font-semibold">
            <Landmark className="h-5 w-5" aria-hidden /> Havale / EFT Bilgileri
          </h2>
          <p className="mt-1 text-sm text-secondary">Ödemenizi aşağıdaki hesaba, açıklama kısmına sipariş numaranızı yazarak gönderin. Ödeme onaylandığında siparişiniz hazırlanmaya başlar.</p>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <Row label="Banka" value={bank.bankName} />
            <Row label="Hesap sahibi" value={bank.accountHolder} />
            <Row label="IBAN" value={bank.iban} copy />
            <Row label="Açıklama" value={bank.reference} copy />
            <Row label="Tutar" value={formatCents(order.totalCents)} />
          </dl>
        </section>
      )}

      <section className="mt-10 grid gap-6 sm:grid-cols-2">
        <div className="rounded-lg border border-border p-5 text-sm">
          <h2 className="text-xs font-medium uppercase tracking-wide text-secondary">Teslimat adresi</h2>
          <p className="mt-2 font-medium">
            {order.shippingAddress.firstName} {order.shippingAddress.lastName}
          </p>
          <p>{order.shippingAddress.line}</p>
          <p>
            {order.shippingAddress.district} / {order.shippingAddress.city} {order.shippingAddress.postalCode ?? ''}
          </p>
          <p>{order.shippingAddress.phone}</p>
        </div>
        <div className="rounded-lg border border-border p-5 text-sm">
          <h2 className="text-xs font-medium uppercase tracking-wide text-secondary">Ödeme</h2>
          <p className="mt-2 font-medium">{PAYMENT_METHOD_LABELS[order.paymentMethod]}</p>
          {order.payment?.cardLast4 && <p className="text-secondary">Kart •••• {order.payment.cardLast4}</p>}
          <p className="mt-2 text-secondary">Referans: {order.payment?.reference}</p>
        </div>
      </section>

      <section className="mt-8">
        <ul className="divide-y divide-border border-y border-border">
          {order.items.map((it) => (
            <li key={it.id} className="flex items-center gap-4 py-3 text-sm">
              <ProductImage src={it.imageUrl} alt={it.productName} className="h-16 w-12 rounded" />
              <div className="min-w-0 flex-1">
                <Link to={`/urun/${it.productSlug}`} className="truncate font-medium hover:underline">
                  {it.productName}
                </Link>
                <p className="text-xs text-secondary">
                  {it.size} · {it.color} · {it.quantity} adet
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

      <div className="mt-10 flex flex-wrap justify-center gap-3">
        {isAuthenticated ? (
          <Link to={`/hesap/siparisler/${order.id}`}>
            <Button variant="outline">Sipariş Detayı</Button>
          </Link>
        ) : (
          <Link to="/kayit">
            <Button variant="outline">Hesap oluşturup siparişlerinizi takip edin</Button>
          </Link>
        )}
        <Link to="/urunler">
          <Button>Alışverişe Devam Et</Button>
        </Link>
      </div>
    </div>
  );
}

function Row({ label, value, copy }: { label: string; value: string; copy?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md bg-surface px-3 py-2">
      <div>
        <dt className="text-xs text-secondary">{label}</dt>
        <dd className="font-medium">{value}</dd>
      </div>
      {copy && (
        <button
          type="button"
          className="rounded p-1.5 text-secondary hover:bg-surface-muted hover:text-primary"
          aria-label={`${label} kopyala`}
          onClick={() => {
            void navigator.clipboard?.writeText(value).then(() => toast.success('Kopyalandı'));
          }}
        >
          <Copy className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
