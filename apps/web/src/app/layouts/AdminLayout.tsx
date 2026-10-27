import { Suspense, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, LogOut, Menu, Package, ShoppingCart, Store, Tags, Users, ScrollText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PageSpinner } from '@/components/ui/Feedback';
import { Drawer } from '@/components/ui/Drawer';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/store/auth.store';
import { useLogout } from '@/features/auth/useAuth';

const nav = [
  { to: '/admin', label: 'Genel Bakış', icon: LayoutDashboard, end: true },
  { to: '/admin/urunler', label: 'Ürünler', icon: Package },
  { to: '/admin/kategoriler', label: 'Kategoriler', icon: Tags },
  { to: '/admin/siparisler', label: 'Siparişler', icon: ShoppingCart },
  { to: '/admin/musteriler', label: 'Müşteriler', icon: Users },
  { to: '/admin/islem-kayitlari', label: 'İşlem Kayıtları', icon: ScrollText },
];

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-1" aria-label="Yönetici menüsü">
      {nav.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors',
              isActive ? 'bg-primary text-surface' : 'text-secondary hover:bg-surface-muted hover:text-primary',
            )
          }
        >
          <item.icon className="h-4 w-4" aria-hidden />
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}

export function AdminLayout() {
  const user = useAuthStore((s) => s.user);
  const logout = useLogout();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-border bg-surface px-4 py-6 lg:flex">
        <div className="mb-8 px-3">
          <span className="font-display text-2xl font-semibold">Atölye</span>
          <span className="ml-2 rounded bg-accent/15 px-1.5 py-0.5 text-[11px] font-medium text-accent-hover">Yönetim</span>
        </div>
        <SidebarNav />
        <div className="mt-auto space-y-2 border-t border-border pt-4">
          <NavLink to="/" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-secondary hover:bg-surface-muted hover:text-primary">
            <Store className="h-4 w-4" aria-hidden /> Mağazaya git
          </NavLink>
          <div className="px-3 text-xs text-secondary">
            <p className="truncate font-medium text-primary">{user ? `${user.firstName} ${user.lastName}` : ''}</p>
            <p className="truncate">{user?.email}</p>
          </div>
          <Button variant="ghost" size="sm" fullWidth className="justify-start" leftIcon={<LogOut className="h-4 w-4" />} onClick={() => logout.mutate(undefined, { onSuccess: () => navigate('/admin/giris') })} loading={logout.isPending}>
            Çıkış yap
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border bg-surface px-4 lg:hidden">
          <button type="button" onClick={() => setOpen(true)} className="-ml-2 flex h-10 w-10 items-center justify-center rounded-md" aria-label="Menüyü aç">
            <Menu className="h-5 w-5" />
          </button>
          <span className="font-display text-xl font-semibold">Atölye Yönetim</span>
        </header>
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <Suspense fallback={<PageSpinner />}>
            <Outlet />
          </Suspense>
        </main>
      </div>

      <Drawer open={open} onClose={() => setOpen(false)} title="Yönetim" side="left" widthClassName="max-w-xs">
        <SidebarNav onNavigate={() => setOpen(false)} />
        <div className="mt-6 border-t border-border pt-4">
          <Button variant="ghost" size="sm" fullWidth className="justify-start" leftIcon={<LogOut className="h-4 w-4" />} onClick={() => logout.mutate(undefined, { onSuccess: () => navigate('/admin/giris') })}>
            Çıkış yap
          </Button>
        </div>
      </Drawer>
    </div>
  );
}
