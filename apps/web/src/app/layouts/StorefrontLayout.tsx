import { Suspense } from 'react';
import { Outlet, ScrollRestoration } from 'react-router-dom';
import { AnnouncementBar, Header } from '@/components/common/Header';
import { Footer } from '@/components/common/Footer';
import { PageSpinner } from '@/components/ui/Feedback';
import { CartDrawer } from '@/components/cart/CartDrawer';

export function StorefrontLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-surface focus:px-4 focus:py-2 focus:shadow-overlay">
        İçeriğe atla
      </a>
      <AnnouncementBar />
      <Header />
      <main id="main" className="flex-1">
        <Suspense fallback={<PageSpinner />}>
          <Outlet />
        </Suspense>
      </main>
      <Footer />
      <CartDrawer />
      <ScrollRestoration />
    </div>
  );
}
