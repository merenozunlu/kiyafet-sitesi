import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, RefreshCcw, ShieldCheck, Truck } from 'lucide-react';
import type { CategoryDto, ProductListItemDto } from '@shop/shared';
import { productService } from '@/services/product.service';
import { queryKeys } from '@/lib/query-client';
import { ProductGrid } from '@/components/product/ProductCard';
import { ProductImage } from '@/components/product/ProductImage';
import { ErrorState, ProductGridSkeleton, Skeleton } from '@/components/ui/Feedback';
import { Button } from '@/components/ui/Button';
import { NewsletterForm } from '@/components/common/NewsletterForm';
import { usePageTitle } from '@/hooks/usePageTitle';

function SectionHeader({ title, subtitle, to, linkLabel = 'Tümünü gör' }: { title: string; subtitle?: string; to?: string; linkLabel?: string }) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div>
        <h2 className="font-display text-3xl font-semibold">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-secondary">{subtitle}</p>}
      </div>
      {to && (
        <Link to={to} className="hidden items-center gap-1 text-sm font-medium hover:underline sm:inline-flex">
          {linkLabel} <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      )}
    </div>
  );
}

function ProductSection({ title, subtitle, to, products, isLoading }: { title: string; subtitle?: string; to: string; products: ProductListItemDto[] | undefined; isLoading: boolean }) {
  if (!isLoading && (!products || products.length === 0)) return null;
  return (
    <section className="container-page py-12 sm:py-16" aria-labelledby={title}>
      <SectionHeader title={title} subtitle={subtitle} to={to} />
      {isLoading || !products ? <ProductGridSkeleton count={4} /> : <ProductGrid products={products.slice(0, 8)} />}
      <div className="mt-6 sm:hidden">
        <Link to={to}>
          <Button variant="outline" fullWidth>
            Tümünü gör
          </Button>
        </Link>
      </div>
    </section>
  );
}

function CategoryTiles({ categories, isLoading }: { categories: CategoryDto[] | undefined; isLoading: boolean }) {
  return (
    <section className="bg-surface py-12 sm:py-16">
      <div className="container-page">
        <SectionHeader title="Kategoriler" subtitle="Gardırobunuzun temel taşlarını keşfedin" />
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-6">
          {isLoading || !categories
            ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="aspect-[4/5] w-full rounded-lg" />)
            : categories.map((c) => (
                <Link key={c.id} to={`/kategori/${c.slug}`} className="group relative block overflow-hidden rounded-lg">
                  <ProductImage src={c.imageUrl} alt={c.name} className="aspect-[4/5] w-full" imgClassName="transition-transform duration-500 group-hover:scale-105" />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-primary/70 to-transparent p-4">
                    <p className="text-base font-medium text-surface">{c.name}</p>
                    <p className="text-xs text-surface/80">{c.productCount} ürün</p>
                  </div>
                </Link>
              ))}
        </div>
      </div>
    </section>
  );
}

const trust = [
  { icon: Truck, title: 'Ücretsiz kargo', text: '1.500 TL ve üzeri siparişlerde' },
  { icon: RefreshCcw, title: '14 gün iade', text: 'Koşulsuz ve kolay iade süreci' },
  { icon: ShieldCheck, title: 'Güvenli ödeme', text: 'Kart bilgileriniz saklanmaz' },
];

export default function HomePage() {
  usePageTitle('Atölye — Sade ve kaliteli giyim');
  const { data, isLoading, isError, error, refetch } = useQuery({ queryKey: queryKeys.home, queryFn: ({ signal }) => productService.home(signal) });

  return (
    <>
      <section className="relative overflow-hidden bg-surface-muted">
        <div className="container-page grid min-h-[70vh] items-center gap-8 py-12 lg:grid-cols-2 lg:py-0">
          <div className="order-2 lg:order-1">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-accent-hover">Yeni Sezon</p>
            <h1 className="mt-4 font-display text-5xl font-semibold leading-[1.05] sm:text-6xl lg:text-7xl">
              Az ama öz
              <br />
              bir gardırop.
            </h1>
            <p className="mt-5 max-w-md text-base text-secondary">Doğal kumaşlar, temiz kesimler ve her gün giyilebilecek parçalar.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/urunler?isNew=true&sort=newest">
                <Button size="lg">Yeni Gelenleri Keşfet</Button>
              </Link>
              <Link to="/urunler">
                <Button size="lg" variant="outline">
                  Tüm Ürünler
                </Button>
              </Link>
            </div>
          </div>
          <div className="order-1 lg:order-2">
            <ProductImage
              src="https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1200&q=80"
              alt="Yeni sezon koleksiyonundan sade bir kombin"
              className="aspect-[4/5] w-full rounded-xl lg:aspect-[5/6]"
              loading="eager"
            />
          </div>
        </div>
      </section>

      {isError ? (
        <div className="container-page py-12">
          <ErrorState error={error} onRetry={() => void refetch()} title="Ürünler yüklenemedi" />
        </div>
      ) : (
        <>
          <ProductSection title="Yeni Sezon" subtitle="En son eklenen parçalar" to="/urunler?isNew=true&sort=newest" products={data?.newArrivals} isLoading={isLoading} />
          <CategoryTiles categories={data?.categories} isLoading={isLoading} />
          <ProductSection title="Çok Satanlar" subtitle="Müşterilerimizin favorileri" to="/urunler?sort=recommended" products={data?.bestSellers} isLoading={isLoading} />

          <section className="container-page py-12 sm:py-16">
            <div className="grid gap-6 overflow-hidden rounded-xl bg-primary text-surface lg:grid-cols-2">
              <div className="flex flex-col justify-center p-8 sm:p-12 lg:p-16">
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-accent">Koleksiyon</p>
                <h2 className="mt-4 font-display text-4xl font-semibold sm:text-5xl">Zamansız Temeller</h2>
                <p className="mt-4 max-w-md text-surface/75">Mevsimden bağımsız, birbirleriyle kolayca kombinlenen parçalar. Daha az satın alın, daha uzun giyin.</p>
                <Link to="/urunler?isFeatured=true" className="mt-8">
                  <Button variant="accent" size="lg">
                    Koleksiyonu İncele
                  </Button>
                </Link>
              </div>
              <ProductImage
                src="https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1200&q=80"
                alt="Zamansız Temeller koleksiyonu"
                className="aspect-[4/3] w-full lg:aspect-auto lg:h-full"
              />
            </div>
          </section>

          <ProductSection title="İndirimdekiler" subtitle="Sezon sonu fırsatları" to="/urunler?onSale=true&sort=discount" products={data?.onSale} isLoading={isLoading} />
        </>
      )}

      <section className="border-y border-border bg-surface">
        <div className="container-page grid gap-6 py-10 sm:grid-cols-3">
          {trust.map((t) => (
            <div key={t.title} className="flex items-start gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface-muted">
                <t.icon className="h-5 w-5" aria-hidden />
              </span>
              <div>
                <p className="font-medium">{t.title}</p>
                <p className="text-sm text-secondary">{t.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="container-page py-14 sm:py-20">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="font-display text-3xl font-semibold">Bültenimize katılın</h2>
          <p className="mt-2 text-sm text-secondary">Yeni ürünler ve özel fırsatlardan ilk siz haberdar olun. İstediğiniz zaman ayrılabilirsiniz.</p>
          <div className="mt-6 flex justify-center">
            <NewsletterForm />
          </div>
        </div>
      </section>
    </>
  );
}
