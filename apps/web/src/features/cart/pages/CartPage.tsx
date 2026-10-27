import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, ShoppingBag } from 'lucide-react';
import { CartItem } from '@/components/cart/CartItem';
import { CartSummary } from '@/components/cart/CartSummary';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { Button } from '@/components/ui/Button';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/Feedback';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useCart } from '../useCart';

export default function CartPage() {
  usePageTitle('Sepetim');
  const navigate = useNavigate();
  const { items, summary, warnings, isLoading, error, refetch, updateQuantity, removeItem, isMutating, hasBlockingWarnings, isGuest } = useCart();

  return (
    <div className="container-page py-6 sm:py-10">
      <Breadcrumb items={[{ label: 'Sepetim' }]} />
      <h1 className="mt-4 font-display text-4xl font-semibold">Sepetim</h1>

      {isLoading ? (
        <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_360px]">
          <div className="space-y-4">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      ) : error ? (
        <ErrorState error={error} onRetry={() => void refetch()} className="mt-8" />
      ) : items.length === 0 ? (
        <EmptyState
          className="mt-8"
          icon={<ShoppingBag className="h-6 w-6" aria-hidden />}
          title="Sepetiniz boş"
          description="Henüz sepetinize ürün eklemediniz. Yeni sezon parçalarına göz atın."
          action={
            <Link to="/urunler">
              <Button>Alışverişe Başla</Button>
            </Link>
          }
        />
      ) : (
        <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_360px]">
          <section aria-label="Sepet ürünleri">
            {warnings.length > 0 && (
              <div className="mb-4 rounded-md border border-warning/40 bg-warning/5 px-4 py-3 text-sm text-primary" role="status">
                {warnings.map((w) => (
                  <p key={w}>{w}</p>
                ))}
              </div>
            )}
            <ul className="divide-y divide-border border-y border-border">
              {items.map((item) => (
                <li key={item.id}>
                  <CartItem item={item} onQuantityChange={(q) => updateQuantity(item, q)} onRemove={() => removeItem(item)} disabled={isMutating} />
                </li>
              ))}
            </ul>
            <div className="mt-4">
              <Link to="/urunler" className="text-sm text-secondary underline-offset-4 hover:underline">
                ← Alışverişe devam et
              </Link>
            </div>
          </section>

          <aside className="h-fit rounded-lg border border-border bg-surface p-6 lg:sticky lg:top-24">
            <h2 className="text-lg font-semibold">Sipariş Özeti</h2>
            <CartSummary summary={summary} className="mt-4" />
            {hasBlockingWarnings && (
              <p className="mt-4 text-xs text-danger" role="alert">
                Tükenen ürünleri kaldırmadan ödemeye geçemezsiniz.
              </p>
            )}
            <Button size="lg" fullWidth className="mt-6" rightIcon={<ArrowRight className="h-4 w-4" />} disabled={hasBlockingWarnings || isMutating} onClick={() => navigate('/odeme')} data-testid="go-to-checkout">
              Ödemeye Geç
            </Button>
            {isGuest && (
              <p className="mt-3 text-center text-xs text-secondary">
                <Link to="/giris" state={{ from: '/odeme' }} className="underline underline-offset-4">
                  Giriş yapın
                </Link>{' '}
                ya da misafir olarak devam edin.
              </p>
            )}
            <p className="mt-4 text-center text-[11px] text-secondary">Fiyatlar KDV dahildir. Toplamlar sunucuda hesaplanır.</p>
          </aside>
        </div>
      )}
    </div>
  );
}
