import { useMemo } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { useExpenses } from '@/hooks/use-expenses';
import { useMonthlyTotals } from '@/hooks/use-reports';

export function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const { data } = useExpenses({ pageSize: 5 });

  // The month total must come from the server, not the 5 rows we fetch for the
  // "recent entries" list — otherwise it reads 0.00 whenever those rows fall
  // outside the current month.
  const monthRange = useMemo(() => {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0).toISOString();
    const to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();
    return { from, to };
  }, []);
  const { data: monthly } = useMonthlyTotals(monthRange);

  const monthTotal = useMemo(() => {
    const now = new Date();
    const key = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return monthly?.find((m) => m.month === key)?.total ?? '0.00';
  }, [monthly]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Hi, {user?.name}</h1>
        <p className="text-sm text-neutral-500">Here's a snapshot of your spending.</p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat label="This month" value={`$${monthTotal}`} />
        <Stat label="Recent entries" value={String(data?.items.length ?? 0)} />
        <Stat label="Total entries" value={String(data?.total ?? 0)} />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-5">
      <div className="text-sm text-neutral-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );
}
