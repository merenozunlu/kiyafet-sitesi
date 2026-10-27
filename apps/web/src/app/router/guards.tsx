import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { PageSpinner } from '@/components/ui/Feedback';
import { useAuthStore } from '@/store/auth.store';

/**
 * Route guard'ları yalnızca kullanıcı deneyimi içindir; güvenlik sınırı backend'dedir.
 */
export function RequireAuth() {
  const status = useAuthStore((s) => s.status);
  const location = useLocation();
  if (status === 'idle' || status === 'loading') return <PageSpinner />;
  if (status !== 'authenticated') return <Navigate to="/giris" state={{ from: location.pathname + location.search }} replace />;
  return <Outlet />;
}

export function RequireAdmin() {
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);
  const location = useLocation();
  if (status === 'idle' || status === 'loading') return <PageSpinner />;
  if (status !== 'authenticated') return <Navigate to="/admin/giris" state={{ from: location.pathname }} replace />;
  if (user?.role !== 'ADMIN') return <Navigate to="/" replace />;
  return <Outlet />;
}

/** Giriş yapmış kullanıcıyı giriş/kayıt sayfalarından uzaklaştırır. */
export function RedirectIfAuthenticated() {
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);
  if (status === 'idle' || status === 'loading') return <PageSpinner />;
  if (status === 'authenticated') return <Navigate to={user?.role === 'ADMIN' ? '/admin' : '/hesap'} replace />;
  return <Outlet />;
}
