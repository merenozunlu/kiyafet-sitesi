import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import type { ProductListItemDto } from '@shop/shared';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { Price } from '@/components/ui/Price';
import { ProductImage } from './ProductImage';
import { useFavorites } from '@/features/favorites/useFavorites';

export interface ProductCardProps {
  product: ProductListItemDto;
  className?: string;
  priority?: boolean;
}

export function ProductCard({ product, className, priority }: ProductCardProps) {
  const { isFavorite, toggle } = useFavorites();
  const fav = isFavorite(product.id);
  const to = `/urun/${product.slug}`;

  return (
    <article className={cn('group relative flex flex-col', className)} data-testid="product-card">
      <div className="relative">
        <Link to={to} className="block overflow-hidden rounded-lg" aria-label={`${product.name} ürününü incele`} tabIndex={-1}>
          <ProductImage
            src={product.image?.imageUrl}
            alt={product.image?.altText || product.name}
            className="aspect-product w-full"
            imgClassName="transition-transform duration-500 group-hover:scale-[1.03]"
            loading={priority ? 'eager' : 'lazy'}
          />
        </Link>
        <div className="pointer-events-none absolute left-2.5 top-2.5 flex flex-col gap-1.5">
          {product.discountPercent ? <Badge variant="danger">%{product.discountPercent} indirim</Badge> : null}
          {product.isNew && <Badge variant="dark">Yeni</Badge>}
          {!product.inStock && <Badge variant="outline">Tükendi</Badge>}
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            toggle(product.id);
          }}
          aria-label={fav ? `${product.name} ürününü favorilerden çıkar` : `${product.name} ürününü favorilere ekle`}
          aria-pressed={fav}
          className={cn(
            'absolute right-2.5 top-2.5 flex h-9 w-9 items-center justify-center rounded-full bg-surface/90 shadow-soft backdrop-blur transition-colors hover:bg-surface',
            fav ? 'text-danger' : 'text-primary',
          )}
        >
          <Heart className={cn('h-[18px] w-[18px]', fav && 'fill-current')} />
        </button>
      </div>
      <div className="mt-3 flex flex-col gap-1">
        <p className="text-xs text-secondary">{product.category.name}</p>
        <h3 className="text-sm font-medium leading-snug">
          <Link to={to} className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none group-focus-within:underline">
            {product.name}
          </Link>
        </h3>
        <Price cents={product.priceCents} compareAtCents={product.compareAtPriceCents} size="md" />
        {product.colors.length > 1 && (
          <div className="mt-1 flex items-center gap-1" aria-label={`${product.colors.length} renk seçeneği`}>
            {product.colors.slice(0, 5).map((c) => (
              <span key={c.name} title={c.name} className="h-3 w-3 rounded-full border border-border" style={{ backgroundColor: c.hex ?? '#E5E7EB' }} aria-hidden />
            ))}
            {product.colors.length > 5 && <span className="text-[11px] text-secondary">+{product.colors.length - 5}</span>}
          </div>
        )}
      </div>
    </article>
  );
}

export function ProductGrid({ products, className, priorityCount = 4 }: { products: ProductListItemDto[]; className?: string; priorityCount?: number }) {
  return (
    <div className={cn('grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4', className)}>
      {products.map((p, i) => (
        <ProductCard key={p.id} product={p} priority={i < priorityCount} />
      ))}
    </div>
  );
}
