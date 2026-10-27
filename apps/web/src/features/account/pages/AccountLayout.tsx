import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, LogOut, MapPin, Package, UserRound } from 'lucide-react';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { useLogout } from '@/features/auth/useAuth';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';

const NAV = [
  { to: '/hesap', label: 'Genel Bakış', icon: LayoutDashboard, end: true },
  { to: '/hesap/siparisler', label: 'Siparişlerim', icon: Package },
  { to: '/hesap/adresler', label: 'Adreslerim', icon: MapPin },
  { to: '/hesap/profil', label: 'Profil ve Güvenlik', icon: UserRound },
];

export default function AccountLayout() {
  const user = useAuthStore((s) => s.user);
  const logout = useLogout();
  return (
    <div className="container-page py-6 sm:py-10">
      <Breadcrumb items={[{ label: 'Hesabım' }]} />
      <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl font-semibold">Hesabım</h1>
          {user && (
            <p className="mt-1 text-sm text-secondary">
              {user.firstName} {user.lastName} · {user.email}
            </p>
          )}
        </div>
      </div>
      <div className="mt-8 grid gap-8 lg:grid-cols-[240px_1fr]">
        <nav aria-label="Hesap menüsü" className="-mx-4 overflow-x-auto px-4 lg:mx-0 lg:px-0">
          <ul className="flex gap-1 lg:flex-col">
            {NAV.map((n) => (
              <li key={n.to}>
                <NavLink
                  to={n.to}
                  end={n.end}
                  className={({ isActive }) =>
                    cn('flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-sm', isActive ? 'bg-primary text-surface' : 'text-secondary hover:bg-surface-muted hover:text-primary')
                  }
                >
                  <n.icon className="h-4 w-4" aria-hidden />
                  {n.label}
                </NavLink>
              </li>
            ))}
            <li>
              <button
                type="button"
                onClick={() => logout.mutate()}
                className="flex w-full items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-sm text-secondary hover:bg-surface-muted hover:text-danger"
              >
                <LogOut className="h-4 w-4" aria-hidden />
                Çıkış Yap
              </button>
            </li>
          </ul>
        </nav>
        <div className="min-w-0">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
