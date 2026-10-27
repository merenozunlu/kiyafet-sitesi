import { isRouteErrorResponse, Link, useRouteError } from 'react-router-dom';
import { Button } from '@/components/ui/Button';

export function RouteErrorBoundary() {
  const error = useRouteError();
  const is404 = isRouteErrorResponse(error) && error.status === 404;
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <p className="font-display text-6xl font-semibold text-accent">{is404 ? '404' : 'Hata'}</p>
      <h1 className="mt-4 text-2xl font-semibold">{is404 ? 'Sayfa bulunamadı' : 'Beklenmeyen bir hata oluştu'}</h1>
      <p className="mt-2 max-w-md text-secondary">
        {is404 ? 'Aradığınız sayfa taşınmış veya kaldırılmış olabilir.' : 'Sayfayı yenilemeyi deneyin. Sorun devam ederse daha sonra tekrar deneyin.'}
      </p>
      <div className="mt-8 flex gap-3">
        <Button onClick={() => window.location.reload()} variant="outline">
          Yenile
        </Button>
        <Link to="/">
          <Button>Ana sayfaya dön</Button>
        </Link>
      </div>
    </div>
  );
}
