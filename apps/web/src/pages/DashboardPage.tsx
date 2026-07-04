import { useMemo } from 'react';
import {
  AreaChart, Area, PieChart, Pie, Cell, XAxis, Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useExpenses } from '@/hooks/use-expenses';
import { useMonthlyTotals, useCategoryBreakdown } from '@/hooks/use-reports';
import { useThemeStore } from '@/stores/theme-store';
import { Card } from '@/components/ui/card';
import { catColor, catSoft, catTint, usd, SYSTEM_CATEGORY_HUES } from '@/lib/pulse';

function monthRange(monthsBack = 0) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() - monthsBack;
  const from = new Date(year, month, 1, 0, 0, 0).toISOString();
  const to   = new Date(year, month + 1, 0, 23, 59, 59).toISOString();
  return { from, to };
}

function sixMonthRange() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth() - 5, 1, 0, 0, 0).toISOString();
  const to   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();
  return { from, to };
}

const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function catHue(name: string, color: string | null): number {
  if (color) {
    const n = parseInt(color.replace('#', ''), 16);
    return n % 360;
  }
  return SYSTEM_CATEGORY_HUES[name] ?? 230;
}

export function DashboardPage() {
  const { theme } = useThemeStore();

  const thisMonth = useMemo(() => monthRange(0), []);
  const lastMonth = useMemo(() => monthRange(1), []);
  const sixMonths = useMemo(() => sixMonthRange(), []);

  const { data: trend }    = useMonthlyTotals(sixMonths);
  const { data: catData }  = useCategoryBreakdown(thisMonth);
  const { data: lastData } = useMonthlyTotals(lastMonth);
  const { data: recent }   = useExpenses({ pageSize: 5 });

  const thisMonthKey = useMemo(() => {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  const thisMonthTotal = useMemo(() => {
    return Number(trend?.find((m) => m.month === thisMonthKey)?.total ?? 0);
  }, [trend, thisMonthKey]);

  const lastMonthTotal = useMemo(() => {
    return Number(lastData?.[0]?.total ?? 0);
  }, [lastData]);

  const deltaPct = useMemo(() => {
    if (!lastMonthTotal) return null;
    return ((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100;
  }, [thisMonthTotal, lastMonthTotal]);

  const avgPerDay = useMemo(() => {
    const day = new Date().getDate();
    return day > 0 ? thisMonthTotal / day : 0;
  }, [thisMonthTotal]);

  const totalEntries = recent?.total ?? 0;

  const catTotal = useMemo(() =>
    (catData ?? []).reduce((acc, c) => acc + Number(c.total), 0), [catData]);

  const maxCatTotal = useMemo(() =>
    Math.max(...(catData ?? []).map((c) => Number(c.total)), 1), [catData]);

  const chartData = useMemo(() => (trend ?? []).map((m) => ({
    label: MONTH_LABELS[parseInt(m.month.split('-')[1]!) - 1],
    value: Number(m.total),
    current: m.month === thisMonthKey,
  })), [trend, thisMonthKey]);

  return (
    <div className="space-y-5">
      {/* Hero card */}
      <Card hero className="p-5">
        <p className="text-xs font-medium uppercase tracking-widest text-pulse-dim">Spent this month</p>
        <div className="mt-2 flex items-end gap-3">
          <span className="gradient-hero-text text-[44px] font-bold leading-none tracking-tight">
            ${usd(thisMonthTotal)}
          </span>
          {deltaPct !== null && (
            <span
              className="mb-1 flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold"
              style={{ background: `rgba(34,211,238,0.15)`, color: 'var(--pulse-v2)' }}
            >
              {deltaPct < 0 ? '↓' : '↑'} {Math.abs(deltaPct).toFixed(1)}%
              <span className="font-normal text-pulse-dim ml-1">
                {deltaPct < 0 ? 'less' : 'more'} than last month
              </span>
            </span>
          )}
        </div>
      </Card>

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4">
          <p className="text-xs text-pulse-faint">Avg / day</p>
          <p className="mt-1 text-xl font-bold text-pulse-text">${usd(avgPerDay)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-pulse-faint">Total entries</p>
          <p className="mt-1 text-xl font-bold text-pulse-text">{totalEntries}</p>
        </Card>
      </div>

      {/* By category */}
      {catData && catData.length > 0 && (
        <Card className="p-5">
          <p className="mb-4 text-sm font-semibold text-pulse-text">By category</p>
          <div className="flex gap-4">
            {/* Donut */}
            <div className="relative shrink-0" style={{ width: 132, height: 132 }}>
              <PieChart width={132} height={132}>
                <Pie
                  data={catData}
                  dataKey="percentage"
                  cx={61}
                  cy={61}
                  innerRadius={38}
                  outerRadius={52}
                  strokeWidth={0}
                  paddingAngle={2}
                  cornerRadius={3}
                >
                  {catData.map((c) => {
                    const hue = catHue(c.categoryName, null);
                    return <Cell key={c.categoryId} fill={catColor(hue, theme)} />;
                  })}
                </Pie>
              </PieChart>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-base font-bold text-pulse-text">${usd(catTotal, 0)}</span>
                <span className="text-[9px] uppercase tracking-widest text-pulse-faint">Total</span>
              </div>
            </div>

            {/* Ranked list */}
            <div className="flex-1 space-y-2.5 min-w-0">
              {catData.slice(0, 5).map((c) => {
                const hue = catHue(c.categoryName, null);
                return (
                  <div key={c.categoryId}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <div className="flex items-center gap-1.5 truncate">
                        <span
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{ background: catColor(hue, theme) }}
                        />
                        <span className="truncate text-pulse-dim">{c.categoryName}</span>
                      </div>
                      <span className="shrink-0 font-medium text-pulse-text ml-2">${usd(Number(c.total), 0)}</span>
                    </div>
                    <div className="h-1 w-full rounded-full" style={{ background: 'var(--pulse-track)' }}>
                      <div
                        className="h-1 rounded-full transition-all"
                        style={{
                          width: `${(Number(c.total) / maxCatTotal) * 100}%`,
                          background: `linear-gradient(90deg, ${catColor(hue, theme)}, ${catColor(hue + 18, theme)})`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      )}

      {/* Monthly trend */}
      {chartData.length > 0 && (
        <Card className="p-5">
          <p className="mb-3 text-sm font-semibold text-pulse-text">Monthly trend</p>
          <ResponsiveContainer width="100%" height={88}>
            <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--pulse-v1)" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="var(--pulse-v1)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="areaStroke" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="var(--pulse-v1)" />
                  <stop offset="100%" stopColor="var(--pulse-v2)" />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="label"
                tick={{ fill: 'var(--pulse-faint)', fontSize: 9 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: 'var(--pulse-bg-soft)',
                  border: '1px solid var(--pulse-stroke)',
                  borderRadius: 10,
                  fontSize: 12,
                  color: 'var(--pulse-text)',
                }}
                formatter={(v: number) => [`$${usd(v)}`, 'Total']}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="url(#areaStroke)"
                strokeWidth={2}
                fill="url(#areaFill)"
                dot={(props) => {
                  if (!props.payload.current) return <g key={props.key} />;
                  return (
                    <circle
                      key={props.key}
                      cx={props.cx}
                      cy={props.cy}
                      r={4}
                      fill="var(--pulse-v2)"
                      stroke="var(--pulse-bg)"
                      strokeWidth={2}
                    />
                  );
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Recent expenses */}
      {recent && recent.items.length > 0 && (
        <Card className="overflow-hidden">
          <div className="border-b border-pulse-stroke px-5 py-3">
            <p className="text-sm font-semibold text-pulse-text">Recent</p>
          </div>
          <div className="divide-y divide-pulse-stroke">
            {recent.items.map((e) => {
              const hue = SYSTEM_CATEGORY_HUES['Other'] ?? 230;
              const initial = (e.description ?? '?')[0]?.toUpperCase() ?? '?';
              return (
                <div key={e.id} className="flex items-center gap-3 px-5 py-3">
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold"
                    style={{ background: catSoft(hue, theme), color: catTint(hue, theme) }}
                  >
                    {initial}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-pulse-text">
                      {e.description ?? 'Expense'}
                    </p>
                    <p className="text-xs text-pulse-faint">
                      {new Date(e.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold text-pulse-text">
                    −${usd(Number(e.amount))}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
