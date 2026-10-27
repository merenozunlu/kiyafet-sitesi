import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { ProductGrid } from '@/components/product/ProductCard';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { Button } from '@/components/ui/Button';
import { EmptyState, ErrorState, ProductGridSkeleton } from '@/components/ui/Feedback';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useFavorites } from '../useFavorites';
import { useAuthStore, selectIsAuthenticated } from '@/store/auth.store';

export default function FavoritesPage() {
  usePageTitle('Favorilerim');
  const { products, isLoading, error, refetch } = useFavorites();
  const isAuthenticated = useAuthStore(selectIsAuthenticated);

  return (
    <div className="container-page py-6 sm:py-10">
      <Breadcrumb items={[{ label: 'Favorilerim' }]} />
      <div className="mt-4 flex items-end justify-between">
        <div>
          <h1 className="font-display text-4xl font-semibold">Favorilerim</h1>
          {!isAuthenticated && products.length > 0 && (
            <p className="mt-1 text-sm text-secondary">
              Favorileriniz bu tarayıcıda saklanıyor.{' '}
              <Link to="/giris" className="underline underline-offset-4">
                Giriş yapın
              </Link>{' '}
              ve her cihazdan erişin.
            </p>
          )}
        </div>
      </div>
      <div className="mt-8">
        {isLoading ? (
          <ProductGridSkeleton />
        ) : error ? (
          <ErrorState error={error} onRetry={() => void refetch()} />
        ) : products.length === 0 ? (
          <EmptyState icon={<Heart className="h-6 w-6" aria-hidden />} title="Henüz favoriniz yok" description="Beğendiğiniz ürünleri kalp simgesine tıklayarak buraya kaydedebilirsiniz." action={<Link to="/urunler"><Button>Ürünleri Keşfet</Button></Link>} />
        ) : (
          <ProductGrid products={products} />
        )}
      </div>
    </div>
  );
}
