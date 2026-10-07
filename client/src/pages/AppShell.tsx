import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  CalendarClock,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Menu,
  QrCode,
  Tags,
  UserCircle,
  Users,
  X,
  Zap,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';

const ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  RECEPTION: 'Recepción',
  MEMBER: 'Socio',
};

const STAFF_NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/members', label: 'Socios', icon: Users },
  { to: '/plans', label: 'Planes y Precios', icon: Tags },
  { to: '/quick-sale', label: 'Venta Rápida', icon: Zap },
  { to: '/cash', label: 'Caja del Día', icon: CreditCard },
  { to: '/checkin', label: 'Check-in', icon: QrCode },
];

const MEMBER_NAV = [{ to: '/portal', label: 'Mi Portal', icon: UserCircle }];

export default function AppShell() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [open, setOpen] = useState(false);

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  const isMember = user?.role === 'MEMBER';
  const nav = isMember ? MEMBER_NAV : STAFF_NAV;

  return (
    <div className="flex min-h-screen">
      {/* Overlay móvil */}
      {open && <div className="fixed inset-0 z-30 bg-black/60 md:hidden" onClick={() => setOpen(false)} />}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-line bg-card p-5 transition-transform md:static md:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between">
          <img src="/assets/logo/logo.svg" alt="NEW START GYM" className="h-20 w-auto" />
          <button className="text-zinc-500 md:hidden" onClick={() => setOpen(false)}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="mt-8 flex-1 space-y-1">
          {nav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/dashboard'}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm transition-colors ${
                  isActive
                    ? 'bg-gold/10 font-medium text-gold'
                    : 'text-zinc-400 hover:bg-gold/5 hover:text-zinc-200'
                }`
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-line pt-4">
          <p className="px-1 text-sm text-zinc-300">{user?.name}</p>
          <p className="px-1 text-xs text-zinc-500">{ROLE_LABEL[user?.role ?? ''] ?? user?.role}</p>
          <button
            onClick={handleLogout}
            className="mt-3 flex w-full items-center gap-2 rounded-lg border border-line px-4 py-2 text-sm text-zinc-400 transition-colors hover:border-danger hover:text-danger"
          >
            <LogOut className="h-4 w-4" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Contenido */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-line bg-card/50 px-4 py-3 md:hidden">
          <button onClick={() => setOpen(true)} className="text-zinc-300">
            <Menu className="h-6 w-6" />
          </button>
          <span className="font-display text-lg tracking-widest text-gold">NEW START GYM</span>
          <CalendarClock className="h-5 w-5 text-gold/50" />
        </header>

        <main className="flex-1 p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
