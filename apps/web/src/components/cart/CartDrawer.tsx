import { useNavigate } from 'react-router-dom';
import { ShoppingBag } from 'lucide-react';
import { Drawer } from '@/components/ui/Drawer';
import { Button } from '@/components/ui/Button';
import { EmptyState, ErrorState, Spinner } from '@/components/ui/Feedback';
import { useUiStore } from '@/store/ui.store';
import { useCart } from '@/features/cart/useCart';
import { CartItem } from './CartItem';
import { CartSummary } from './CartSummary';

export function CartDrawer() {
  const open = useUiStore((s) => s.cartDrawerOpen);
  const close = useUiStore((s) => s.closeCartDrawer);
  const navigate = useNavigate();
  const { items, summary, isLoading, error, updateQuantity, removeItem, refetch, hasBlockingWarnings, itemCount } = useCart();

  const go = (to: string) => {
    close();
    navigate(to);
  };

  return (
    <Drawer
      open={open}
      onClose={close}
      title={itemCount ? `Sepetim (${itemCount})` : 'Sepetim'}
      footer={
        items.length > 0 ? (
          <div className="space-y-3">
            <CartSummary summary={summary} />
            <Button fullWidth size="lg" onClick={() => go('/odeme')} disabled={hasBlockingWarnings}>
              Ödemeye Geç
            </Button>
            <Button fullWidth variant="outline" onClick={() => go('/sepet')}>
              Sepete Git
            </Button>
          </div>
        ) : undefined
      }
    >
      {isLoading ? (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      ) : error ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<ShoppingBag className="h-6 w-6" aria-hidden />}
          title="Sepetiniz boş"
          description="Beğendiğiniz ürünleri sepete ekleyerek alışverişe başlayın."
          action={<Button onClick={() => go('/urunler')}>Ürünleri Keşfet</Button>}
          className="border-0 py-10"
        />
      ) : (
        <div className="divide-y divide-border">
          {items.map((item) => (
            <CartItem key={item.id} item={item} compact onQuantityChange={(q) => updateQuantity(item, q)} onRemove={() => removeItem(item)} />
          ))}
        </div>
      )}
    </Drawer>
  );
}
