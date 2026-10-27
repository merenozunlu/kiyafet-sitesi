import { Link } from 'react-router-dom';
import { AlertTriangle, Trash2 } from 'lucide-react';
import type { CartItemDto } from '@shop/shared';
import { Price } from '@/components/ui/Price';
import { QuantitySelector } from '@/components/ui/QuantitySelector';
import { ProductImage } from '@/components/product/ProductImage';
import { cn } from '@/lib/utils';

export interface CartItemProps {
  item: CartItemDto;
  onQuantityChange: (quantity: number) => void;
  onRemove: () => void;
  compact?: boolean;
  disabled?: boolean;
}

const warningText: Record<NonNullable<CartItemDto['warning']>, string> = {
  OUT_OF_STOCK: 'Bu ürün tükendi. Devam etmek için sepetten kaldırın.',
  QUANTITY_REDUCED: 'Stok sınırı nedeniyle adet güncellendi.',
  PRICE_CHANGED: 'Bu ürünün fiyatı güncellendi.',
  INACTIVE: 'Bu ürün artık satışta değil.',
};

export function CartItem({ item, onQuantityChange, onRemove, compact, disabled }: CartItemProps) {
  const blocked = item.warning === 'OUT_OF_STOCK' || item.warning === 'INACTIVE';
  return (
    <div className={cn('flex gap-4 py-4', blocked && 'opacity-80')}>
      <Link to={`/urun/${item.slug}`} className="shrink-0">
        <ProductImage src={item.imageUrl} alt={item.name} className={cn('rounded-md', compact ? 'h-24 w-20' : 'h-32 w-24 sm:h-36 sm:w-28')} />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link to={`/urun/${item.slug}`} className="line-clamp-2 text-sm font-medium hover:underline">
              {item.name}
            </Link>
            <p className="mt-0.5 text-xs text-secondary">
              Beden: <span className="text-primary">{item.size}</span> · Renk: <span className="text-primary">{item.color}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onRemove}
            disabled={disabled}
            className="-mr-1 -mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded text-secondary hover:bg-surface-muted hover:text-danger disabled:opacity-50"
            aria-label={`${item.name} ürününü sepetten kaldır`}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>

        {item.warning && (
          <p className={cn('mt-2 flex items-start gap-1.5 text-xs', blocked ? 'text-danger' : 'text-warning')} role="alert">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            {warningText[item.warning]}
          </p>
        )}

        <div className="mt-auto flex flex-wrap items-end justify-between gap-3 pt-3">
          <QuantitySelector value={item.quantity} onChange={onQuantityChange} max={Math.max(1, Math.min(20, item.stockQuantity))} size="sm" disabled={disabled || blocked} label={`${item.name} adedi`} />
          <div className="text-right">
            <Price cents={item.lineTotalCents} size={compact ? 'sm' : 'md'} emphasizeDiscount={false} />
            {item.quantity > 1 && (
              <p className="text-xs text-secondary">
                Birim: <Price cents={item.unitPriceCents} size="sm" emphasizeDiscount={false} className="text-secondary [&>span]:font-normal [&>span]:text-secondary" />
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
