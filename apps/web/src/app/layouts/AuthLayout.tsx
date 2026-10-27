import { Suspense } from 'react';
import { Link, Outlet } from 'react-router-dom';
import { Logo } from '@/components/common/Logo';
import { PageSpinner } from '@/components/ui/Feedback';

/** Giriş/kayıt gibi odaklı sayfalar için sade layout. */
export function AuthLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="container-page flex h-16 items-center justify-between">
        <Logo />
        <Link to="/" className="text-sm text-secondary hover:text-primary">
          Mağazaya dön
        </Link>
      </header>
      <main className="flex flex-1 items-start justify-center px-4 py-8 sm:py-14">
        <div className="w-full max-w-md">
          <Suspense fallback={<PageSpinner />}>
            <Outlet />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
