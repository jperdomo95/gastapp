import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, ListChecks, PieChart, Tags, LogOut, Plus, Moon, Sun,
} from 'lucide-react';
import { useState } from 'react';
import type React from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { useLogout } from '@/hooks/use-auth';
import { useThemeStore } from '@/stores/theme-store';
import { Button } from '@/components/ui/button';
import { AddExpenseSheet } from './AddExpenseSheet';

const navItems = [
  { to: '/',           label: 'Dashboard',  icon: LayoutDashboard },
  { to: '/expenses',   label: 'Expenses',   icon: ListChecks },
  { to: '/categories', label: 'Categories', icon: Tags },
  { to: '/reports',    label: 'Reports',    icon: PieChart },
] as const;

const PAGE_TITLES: Record<string, { title: string; subtitle: string }> = {
  '/':           { title: 'Dashboard',  subtitle: 'Your spending at a glance' },
  '/expenses':   { title: 'Expenses',   subtitle: 'Browse and manage your ledger' },
  '/categories': { title: 'Categories', subtitle: 'Organise your spending' },
  '/reports':    { title: 'Reports',    subtitle: 'Analytics & trends' },
};

export function AppLayout() {
  const user = useAuthStore((s) => s.user);
  const logout = useLogout();
  const { theme, toggle } = useThemeStore();
  const location = useLocation();
  const [addOpen, setAddOpen] = useState(false);

  const page = PAGE_TITLES[location.pathname] ?? { title: 'GastApp', subtitle: '' };

  return (
    <>
      {/* Ambient glows — fixed, behind everything */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
        <div className="pulse-glow-a absolute inset-0" />
        <div className="pulse-glow-b absolute inset-0" />
      </div>

      {/* Desktop layout */}
      <div className="relative z-10 hidden h-full md:grid md:grid-cols-[248px_1fr]">
        <aside className="flex h-full flex-col border-r border-pulse-stroke bg-[var(--pulse-nav-bg)] backdrop-blur-xl">
          <div className="px-6 py-6">
            <span className="gradient-hero-text text-xl font-bold tracking-tight">Pulse</span>
          </div>

          <nav className="flex-1 space-y-0.5 px-3">
            {navItems.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-pulse-glass-hi text-pulse-v2'
                      : 'text-pulse-dim hover:bg-pulse-glass hover:text-pulse-text'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon size={16} className={isActive ? 'text-pulse-v2' : 'text-pulse-faint'} />
                    {label}
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="border-t border-pulse-stroke p-4 space-y-3">
            <div>
              <div className="text-sm font-medium text-pulse-text">{user?.name}</div>
              <div className="text-xs text-pulse-faint truncate">{user?.email}</div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={toggle}
                aria-label="Toggle theme"
                className="rounded-lg p-1.5 text-pulse-faint transition-colors hover:bg-pulse-glass hover:text-pulse-text"
              >
                {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
              </button>
              <Button variant="ghost" size="sm" onClick={() => logout.mutate()} className="flex-1 justify-start">
                <LogOut size={14} /> Sign out
              </Button>
            </div>
          </div>
        </aside>

        <div className="flex h-full flex-col overflow-hidden bg-pulse-bg">
          <header className="flex h-16 shrink-0 items-center justify-between border-b border-pulse-stroke px-8">
            <div>
              <h1 className="text-lg font-bold text-pulse-text">{page.title}</h1>
              {page.subtitle && <p className="text-xs text-pulse-faint">{page.subtitle}</p>}
            </div>
            <Button onClick={() => setAddOpen(true)} size="sm">
              <Plus size={14} /> New expense
            </Button>
          </header>

          <main className="flex-1 overflow-y-auto p-8">
            <Outlet />
          </main>
        </div>
      </div>

      {/* Mobile layout */}
      <div className="relative z-10 flex h-full flex-col bg-pulse-bg md:hidden">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-pulse-stroke px-5">
          <span className="gradient-hero-text text-base font-bold tracking-tight">Pulse</span>
          <button onClick={toggle} aria-label="Toggle theme" className="rounded-lg p-1.5 text-pulse-faint">
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </header>

        <main className="flex-1 overflow-y-auto px-5 py-5 pb-24">
          <Outlet />
        </main>

        <nav
          className="fixed bottom-0 inset-x-0 z-20 flex h-[62px] items-center border-t border-pulse-stroke bg-[var(--pulse-nav-bg)] backdrop-blur-xl"
          aria-label="Main navigation"
        >
          {navItems.slice(0, 2).map(({ to, label, icon: Icon }) => (
            <MobileTab key={to} to={to} label={label} Icon={Icon} end={to === '/'} />
          ))}

          <div className="flex flex-1 items-center justify-center">
            <button
              onClick={() => setAddOpen(true)}
              aria-label="Add expense"
              className="flex h-[46px] w-[46px] items-center justify-center rounded-pulse-fab text-white shadow-lg"
              style={{ background: 'linear-gradient(135deg, var(--pulse-v1), var(--pulse-v2))' }}
            >
              <Plus size={20} />
            </button>
          </div>

          {navItems.slice(2).map(({ to, label, icon: Icon }) => (
            <MobileTab key={to} to={to} label={label} Icon={Icon} />
          ))}
        </nav>
      </div>

      <AddExpenseSheet open={addOpen} onOpenChange={setAddOpen} />
    </>
  );
}

function MobileTab({
  to, label, Icon, end,
}: {
  to: string;
  label: string;
  Icon: React.ElementType;
  end?: boolean;
}) {
  return (
    <NavLink to={to} end={end} className="flex flex-1 flex-col items-center justify-center gap-0.5">
      {({ isActive }) => (
        <>
          <Icon size={20} className={isActive ? 'text-pulse-v2' : 'text-pulse-faint'} />
          <span className={`text-[9px] font-medium ${isActive ? 'text-pulse-v2' : 'text-pulse-faint'}`}>
            {label}
          </span>
        </>
      )}
    </NavLink>
  );
}
