import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Heart, RefreshCcw, ShoppingBag, Truck } from 'lucide-react';
import type { Size } from '@shop/shared';
import { productService } from '@/services/product.service';
import { queryKeys } from '@/lib/query-client';
import { isApiError } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Price } from '@/components/ui/Price';
import { QuantitySelector } from '@/components/ui/QuantitySelector';
import { EmptyState, ErrorState, ProductGridSkeleton, Skeleton } from '@/components/ui/Feedback';
import { ProductImageGallery } from '@/components/product/ProductImageGallery';
import { ColorSelector, SizeSelector } from '@/components/product/VariantSelector';
import { ProductGrid } from '@/components/product/ProductCard';
import { useCart } from '@/features/cart/useCart';
import { useFavorites } from '@/features/favorites/useFavorites';
import { useUiStore, toast } from '@/store/ui.store';
import { usePageTitle } from '@/hooks/usePageTitle';

export default function ProductDetailPage() {
  const { slug = '' } = useParams<{ slug: string }>();
  const { data: product, isLoading, isError, error, refetch } = useQuery({
    queryKey: queryKeys.product(slug),
    queryFn: ({ signal }) => productService.bySlug(slug, signal),
    enabled: !!slug,
  });
  const related = useQuery({
    queryKey: queryKeys.related(product?.id ?? ''),
    queryFn: ({ signal }) => productService.related(product!.id, signal),
    enabled: !!product?.id,
  });

  usePageTitle(product?.name);

  const { addItem, isAdding } = useCart();
  const openCart = useUiStore((s) => s.openCartDrawer);
  const { isFavorite, toggle } = useFavorites();

  const [color, setColor] = useState<string | null>(null);
  const [size, setSize] = useState<Size | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [sizeError, setSizeError] = useState<string | null>(null);

  const activeVariants = useMemo(() => product?.variants.filter((v) => v.isActive) ?? [], [product]);

  const colors = useMemo(() => {
    const map = new Map<string, { name: string; hex: string | null; available: boolean }>();
    for (const v of activeVariants) {
      const prev = map.get(v.color);
      map.set(v.color, { name: v.color, hex: v.colorHex, available: (prev?.available ?? false) || v.stockQuantity > 0 });
    }
    return [...map.values()];
  }, [activeVariants]);

  // İlk render: stoklu ilk rengi seç; beden seçimi kullanıcıya bırakılır (zorunlu).
  useEffect(() => {
    if (!product) return;
    setSize(null);
    setQuantity(1);
    setSizeError(null);
    const first = colors.find((c) => c.available) ?? colors[0];
    setColor(first?.name ?? null);
  }, [product, colors]);

  const sizeOptions = useMemo(
    () =>
      (['S', 'M', 'L', 'XL', 'XXL'] as Size[]).map((s) => ({
        size: s,
        variant: activeVariants.find((v) => v.size === s && (color ? v.color === color : true)) ?? null,
      })),
    [activeVariants, color],
  );

  const selectedVariant = size ? sizeOptions.find((o) => o.size === size)?.variant ?? null : null;
  const maxQty = selectedVariant ? Math.max(1, Math.min(20, selectedVariant.stockQuantity)) : 20;

  useEffect(() => {
    if (quantity > maxQty) setQuantity(maxQty);
  }, [maxQty, quantity]);

  const handleAdd = async () => {
    if (!product) return;
    if (!size || !selectedVariant) {
      setSizeError('Lütfen bir beden seçin.');
      document.getElementById('size-section')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (selectedVariant.stockQuantity <= 0) {
      setSizeError('Seçtiğiniz beden stokta yok.');
      return;
    }
    setSizeError(null);
    try {
      await addItem({ variantId: selectedVariant.id, quantity, maxStock: selectedVariant.stockQuantity });
      toast.success('Sepete eklendi', `${product.name} · ${color} · ${size} × ${quantity}`);
      openCart();
    } catch (e) {
      if (isApiError(e) && e.code === 'OUT_OF_STOCK') void refetch();
    }
  };

  if (isLoading) {
    return (
      <div className="container-page py-10">
        <div className="grid gap-10 lg:grid-cols-2">
          <Skeleton className="aspect-product w-full rounded-lg" />
          <div className="space-y-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-9 w-3/4" />
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-11 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (isError || !product) {
    const notFound = isApiError(error) && error.status === 404;
    return (
      <div className="container-page py-16">
        {notFound ? (
          <EmptyState title="Ürün bulunamadı" description="Bu ürün satıştan kaldırılmış olabilir." action={<Link to="/urunler"><Button>Ürünlere dön</Button></Link>} />
        ) : (
          <ErrorState error={error} onRetry={() => void refetch()} />
        )}
      </div>
    );
  }

  const fav = isFavorite(product.id);
  const outOfStock = !product.inStock;

  return (
    <div className="container-page py-6 sm:py-10">
      <Breadcrumb items={[{ label: 'Ürünler', to: '/urunler' }, { label: product.category.name, to: `/kategori/${product.category.slug}` }, { label: product.name }]} />

      <div className="mt-6 grid gap-10 lg:grid-cols-2 lg:gap-16">
        <ProductImageGallery images={product.images} productName={product.name} />

        <div className="flex flex-col">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Link to={`/kategori/${product.category.slug}`} className="text-sm text-secondary hover:text-primary">
                {product.category.name}
              </Link>
              <h1 className="mt-1 font-display text-4xl font-semibold leading-tight">{product.name}</h1>
            </div>
            <button
              type="button"
              onClick={() => toggle(product.id)}
              aria-pressed={fav}
              aria-label={fav ? 'Favorilerden çıkar' : 'Favorilere ekle'}
              className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border hover:bg-surface-muted', fav && 'text-danger')}
            >
              <Heart className={cn('h-5 w-5', fav && 'fill-current')} />
            </button>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <Price cents={selectedVariant?.priceCents ?? product.priceCents} compareAtCents={product.compareAtPriceCents} size="xl" />
            {product.discountPercent ? <Badge variant="danger">%{product.discountPercent} indirim</Badge> : null}
            {product.isNew && <Badge variant="dark">Yeni</Badge>}
          </div>

          <p className="mt-5 text-[15px] leading-relaxed text-secondary">{product.description}</p>

          <div className="mt-8 space-y-6">
            <ColorSelector colors={colors} value={color} onChange={(c) => { setColor(c); setSize(null); setSizeError(null); }} />

            <div id="size-section">
              <SizeSelector options={sizeOptions} value={size} onChange={(s) => { setSize(s); setSizeError(null); }} error={sizeError} />
              <p className="mt-2 text-xs text-secondary">
                {selectedVariant
                  ? selectedVariant.stockQuantity <= 3
                    ? `Son ${selectedVariant.stockQuantity} adet`
                    : 'Stokta var'
                  : 'Beden seçimi zorunludur.'}
                <Link to="/yardim/beden-rehberi" className="ml-2 underline underline-offset-4 hover:text-primary">
                  Beden rehberi
                </Link>
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <QuantitySelector value={quantity} onChange={setQuantity} max={maxQty} disabled={outOfStock} />
              <Button size="lg" className="flex-1" onClick={() => void handleAdd()} loading={isAdding} disabled={outOfStock} leftIcon={<ShoppingBag className="h-4 w-4" />} data-testid="add-to-cart">
                {outOfStock ? 'Tükendi' : 'Sepete Ekle'}
              </Button>
            </div>
          </div>

          <dl className="mt-10 divide-y divide-border border-y border-border text-sm">
            <div className="flex gap-3 py-4">
              <Truck className="mt-0.5 h-5 w-5 shrink-0 text-secondary" aria-hidden />
              <div>
                <dt className="font-medium">Teslimat</dt>
                <dd className="text-secondary">1.500 TL üzeri siparişlerde kargo ücretsiz. Siparişler 1–3 iş günü içinde kargoya verilir.</dd>
              </div>
            </div>
            <div className="flex gap-3 py-4">
              <RefreshCcw className="mt-0.5 h-5 w-5 shrink-0 text-secondary" aria-hidden />
              <div>
                <dt className="font-medium">İade</dt>
                <dd className="text-secondary">Teslimattan itibaren 14 gün içinde, kullanılmamış ve etiketli ürünleri iade edebilirsiniz.</dd>
              </div>
            </div>
          </dl>
        </div>
      </div>

      <section className="mt-20" aria-labelledby="related-title">
        <h2 id="related-title" className="mb-6 font-display text-3xl font-semibold">
          Benzer Ürünler
        </h2>
        {related.isLoading ? <ProductGridSkeleton count={4} /> : related.data && related.data.length > 0 ? <ProductGrid products={related.data} /> : <p className="text-sm text-secondary">Bu kategoride başka ürün bulunmuyor.</p>}
      </section>
    </div>
  );
}
