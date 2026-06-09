import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, ListChecks, PieChart, Tags, LogOut } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { useLogout } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/expenses', label: 'Expenses', icon: ListChecks },
  { to: '/categories', label: 'Categories', icon: Tags },
  { to: '/reports', label: 'Reports', icon: PieChart },
];

export function AppLayout() {
  const user = useAuthStore((s) => s.user);
  const logout = useLogout();

  return (
    <div className="grid h-full grid-cols-[220px_1fr]">
      <aside className="flex h-full flex-col border-r border-neutral-200 bg-white p-4">
        <div className="mb-8 text-lg font-bold text-brand">GastApp</div>
        <nav className="flex-1 space-y-1">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-2 rounded-md px-3 py-2 text-sm ${
                  isActive ? 'bg-neutral-100 font-medium' : 'text-neutral-600 hover:bg-neutral-50'
                }`
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-neutral-200 pt-4">
          <div className="mb-2 text-xs text-neutral-500">{user?.email}</div>
          <Button variant="ghost" size="sm" onClick={() => logout.mutate()}>
            <LogOut size={14} /> Sign out
          </Button>
        </div>
      </aside>
      <main className="h-full overflow-y-auto p-8">
        <Outlet />
      </main>
    </div>
  );
}
