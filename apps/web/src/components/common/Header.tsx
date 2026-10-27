import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Heart, Menu, Search, ShoppingBag, User, X } from 'lucide-react';
import { categoryService } from '@/services/product.service';
import { queryKeys } from '@/lib/query-client';
import { cn } from '@/lib/utils';
import { Logo } from './Logo';
import { SearchBar } from './SearchBar';
import { useCartCount } from '@/features/cart/useCart';
import { useAuthStore, selectIsAuthenticated } from '@/store/auth.store';
import { useUiStore } from '@/store/ui.store';
import { useFavoriteCount } from '@/features/favorites/useFavorites';
import { Drawer } from '@/components/ui/Drawer';

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn('text-sm transition-colors hover:text-primary', isActive ? 'font-medium text-primary' : 'text-secondary');

function IconLink({ to, label, icon, count }: { to: string; label: string; icon: React.ReactNode; count?: number }) {
  return (
    <Link to={to} aria-label={count ? `${label} (${count})` : label} className="relative flex h-10 w-10 items-center justify-center rounded-md text-primary hover:bg-surface-muted">
      {icon}
      {count ? (
        <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-surface" aria-hidden>
          {count > 99 ? '99+' : count}
        </span>
      ) : null}
    </Link>
  );
}

export function AnnouncementBar() {
  return (
    <div className="bg-primary text-surface">
      <div className="container-page flex h-[var(--announcement-height)] items-center justify-center text-center text-xs tracking-wide sm:text-[13px]">
        1.500 TL ve üzeri siparişlerde kargo ücretsiz · 14 gün içinde kolay iade
      </div>
    </div>
  );
}

export function Header() {
  const { data: categories } = useQuery({ queryKey: queryKeys.categories, queryFn: ({ signal }) => categoryService.list(signal), staleTime: 5 * 60_000 });
  const cartCount = useCartCount();
  const favoriteCount = useFavoriteCount();
  const isAuthenticated = useAuthStore(selectIsAuthenticated);
  const user = useAuthStore((s) => s.user);
  const openCart = useUiStore((s) => s.openCartDrawer);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setMobileOpen(false);
    setSearchOpen(false);
  }, [location.pathname]);

  const accountTo = isAuthenticated ? '/hesap' : '/giris';
  const accountLabel = isAuthenticated ? `Hesabım${user ? ` — ${user.firstName}` : ''}` : 'Giriş yap';

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/80">
      <div className="container-page flex h-[var(--header-height)] items-center gap-3">
        <button type="button" onClick={() => setMobileOpen(true)} className="-ml-2 flex h-10 w-10 items-center justify-center rounded-md lg:hidden" aria-label="Menüyü aç">
          <Menu className="h-5 w-5" />
        </button>

        <Logo className="shrink-0" />

        <nav className="ml-6 hidden items-center gap-6 lg:flex" aria-label="Ana menü">
          <NavLink to="/urunler" end className={navLinkClass}>
            Tüm Ürünler
          </NavLink>
          {categories?.map((c) => (
            <NavLink key={c.id} to={`/kategori/${c.slug}`} className={navLinkClass}>
              {c.name}
            </NavLink>
          ))}
          <NavLink to="/urunler?onSale=true" className={({ isActive }) => cn(navLinkClass({ isActive }), 'text-danger hover:text-danger')}>
            İndirim
          </NavLink>
        </nav>

        <div className="ml-auto hidden w-full max-w-sm md:block">
          <SearchBar />
        </div>

        <div className="ml-auto flex items-center gap-0.5 md:ml-2">
          <button type="button" onClick={() => setSearchOpen((v) => !v)} className="flex h-10 w-10 items-center justify-center rounded-md hover:bg-surface-muted md:hidden" aria-label="Ara" aria-expanded={searchOpen}>
            {searchOpen ? <X className="h-5 w-5" /> : <Search className="h-5 w-5" />}
          </button>
          <IconLink to={accountTo} label={accountLabel} icon={<User className="h-5 w-5" />} />
          <IconLink to="/favoriler" label="Favoriler" icon={<Heart className="h-5 w-5" />} count={favoriteCount} />
          <button
            type="button"
            onClick={openCart}
            aria-label={cartCount ? `Sepet (${cartCount} ürün)` : 'Sepet'}
            className="relative flex h-10 w-10 items-center justify-center rounded-md text-primary hover:bg-surface-muted"
          >
            <ShoppingBag className="h-5 w-5" />
            {cartCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-surface" aria-hidden>
                {cartCount > 99 ? '99+' : cartCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {searchOpen && (
        <div className="container-page border-t border-border py-3 md:hidden">
          <SearchBar autoFocus onNavigate={() => setSearchOpen(false)} />
        </div>
      )}

      <Drawer open={mobileOpen} onClose={() => setMobileOpen(false)} title="Menü" side="left" widthClassName="max-w-xs">
        <nav className="flex flex-col" aria-label="Mobil menü">
          <NavLink to="/urunler" end className="border-b border-border py-3 text-base">
            Tüm Ürünler
          </NavLink>
          {categories?.map((c) => (
            <NavLink key={c.id} to={`/kategori/${c.slug}`} className="border-b border-border py-3 text-base">
              {c.name}
            </NavLink>
          ))}
          <NavLink to="/urunler?onSale=true" className="border-b border-border py-3 text-base text-danger">
            İndirim
          </NavLink>
          <NavLink to="/favoriler" className="border-b border-border py-3 text-base">
            Favoriler
          </NavLink>
          <NavLink to={accountTo} className="py-3 text-base">
            {isAuthenticated ? 'Hesabım' : 'Giriş Yap / Kayıt Ol'}
          </NavLink>
        </nav>
      </Drawer>
    </header>
  );
}
