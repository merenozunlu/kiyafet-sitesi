import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { usePageTitle } from '@/hooks/usePageTitle';

export default function NotFoundPage() {
  usePageTitle('Sayfa bulunamadı');
  return (
    <div className="container-page flex min-h-[60vh] flex-col items-center justify-center py-16 text-center">
      <p className="font-display text-7xl font-semibold text-accent">404</p>
      <h1 className="mt-4 text-2xl font-semibold">Sayfa bulunamadı</h1>
      <p className="mt-2 max-w-md text-secondary">Aradığınız sayfa taşınmış veya kaldırılmış olabilir. Ana sayfaya dönerek alışverişe devam edebilirsiniz.</p>
      <div className="mt-8 flex gap-3">
        <Link to="/">
          <Button>Ana Sayfa</Button>
        </Link>
        <Link to="/urunler">
          <Button variant="outline">Ürünler</Button>
        </Link>
      </div>
    </div>
  );
}
