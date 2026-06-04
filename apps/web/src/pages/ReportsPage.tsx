import { useMemo } from 'react';
import {
  Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { useCategoryBreakdown, useMonthlyTotals } from '@/hooks/use-reports';

const COLORS = ['#10b981', '#3b82f6', '#f97316', '#a855f7', '#ec4899', '#eab308', '#06b6d4', '#ef4444'];

export function ReportsPage() {
  const range = useMemo(() => {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString();
    const to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();
    return { from, to };
  }, []);

  const { data: monthly } = useMonthlyTotals(range);
  const { data: byCategory } = useCategoryBreakdown(range);

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Reports</h1>

      <section className="rounded-lg border border-neutral-200 bg-white p-6">
        <h2 className="mb-4 font-semibold">Monthly totals (last 6 months)</h2>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthly ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="total" fill="#10b981" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="rounded-lg border border-neutral-200 bg-white p-6">
        <h2 className="mb-4 font-semibold">Breakdown by category</h2>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={byCategory ?? []}
                dataKey={(d) => Number(d.total)}
                nameKey="categoryName"
                outerRadius={100}
                label={(d) => `${d.categoryName} (${d.percentage.toFixed(0)}%)`}
              >
                {(byCategory ?? []).map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}
