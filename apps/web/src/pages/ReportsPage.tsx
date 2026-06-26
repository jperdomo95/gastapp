import { useMemo } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { useCategoryBreakdown, useMonthlyTotals, useTopMerchants } from '@/hooks/use-reports';
import { useThemeStore } from '@/stores/theme-store';
import { Card } from '@/components/ui/card';
import { catColor, usd, SYSTEM_CATEGORY_HUES } from '@/lib/pulse';

const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function sixMonthRange() {
  const now = new Date();
  return {
    from: new Date(now.getFullYear(), now.getMonth() - 5, 1, 0, 0, 0).toISOString(),
    to:   new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString(),
  };
}

function monthRange(offset = 0) {
  const now = new Date();
  return {
    from: new Date(now.getFullYear(), now.getMonth() - offset, 1, 0, 0, 0).toISOString(),
    to:   new Date(now.getFullYear(), now.getMonth() - offset + 1, 0, 23, 59, 59).toISOString(),
  };
}

export function ReportsPage() {
  const { theme } = useThemeStore();

  const sixMonths  = useMemo(() => sixMonthRange(), []);
  const thisMonth  = useMemo(() => monthRange(0), []);
  const lastMonth  = useMemo(() => monthRange(1), []);

  const { data: monthly }    = useMonthlyTotals(sixMonths);
  const { data: catData }    = useCategoryBreakdown(thisMonth);
  const { data: lastCat }    = useCategoryBreakdown(lastMonth);
  const { data: merchants }  = useTopMerchants(thisMonth);

  const thisMonthKey = useMemo(() => {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`;
  }, []);
  const lastMonthKey = useMemo(() => {
    const n = new Date();
    const m = n.getMonth() === 0 ? 12 : n.getMonth();
    const y = n.getMonth() === 0 ? n.getFullYear() - 1 : n.getFullYear();
    return `${y}-${String(m).padStart(2, '0')}`;
  }, []);

  const thisTotal = useMemo(() =>
    Number(monthly?.find((m) => m.month === thisMonthKey)?.total ?? 0), [monthly, thisMonthKey]);
  const lastTotal = useMemo(() =>
    Number(monthly?.find((m) => m.month === lastMonthKey)?.total ?? 0), [monthly, lastMonthKey]);

  const trendData = useMemo(() => (monthly ?? []).map((m) => ({
    label: MONTH_LABELS[parseInt(m.month.split('-')[1]!) - 1],
    value: Number(m.total),
    current: m.month === thisMonthKey,
  })), [monthly, thisMonthKey]);

  const maxMerchantTotal = useMemo(() =>
    Math.max(...(merchants ?? []).map((m) => Number(m.total)), 1), [merchants]);

  return (
    <div className="space-y-5">
      {/* Hero total */}
      <Card hero className="p-5">
        <p className="text-xs uppercase tracking-widest text-pulse-dim">This month</p>
        <p className="mt-1 gradient-hero-text text-[40px] font-bold leading-none">${usd(thisTotal)}</p>
      </Card>

      {/* 6-month trend */}
      {trendData.length > 0 && (
        <Card className="p-5">
          <p className="mb-3 text-sm font-semibold text-pulse-text">6-month trend</p>
          <ResponsiveContainer width="100%" height={110}>
            <AreaChart data={trendData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="rf-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--pulse-v1)" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="var(--pulse-v1)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="rf-stroke" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="var(--pulse-v1)" />
                  <stop offset="100%" stopColor="var(--pulse-v2)" />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="var(--pulse-grid)" strokeDasharray="0" />
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
                stroke="url(#rf-stroke)"
                strokeWidth={2}
                fill="url(#rf-fill)"
                dot={(props) => (
                  <circle
                    key={props.key}
                    cx={props.cx}
                    cy={props.cy}
                    r={props.payload.current ? 4 : 2.5}
                    fill={props.payload.current ? 'var(--pulse-v2)' : 'var(--pulse-v1)'}
                    stroke="var(--pulse-bg)"
                    strokeWidth={props.payload.current ? 2 : 1}
                  />
                )}
              />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* This vs last month */}
      <Card className="p-5">
        <p className="mb-4 text-sm font-semibold text-pulse-text">This vs last month</p>
        <div className="space-y-3">
          {[
            { label: 'This month', value: thisTotal, gradient: true },
            { label: 'Last month', value: lastTotal, gradient: false },
          ].map(({ label, value, gradient }) => {
            const maxVal = Math.max(thisTotal, lastTotal, 1);
            return (
              <div key={label}>
                <div className="mb-1 flex justify-between text-xs">
                  <span className="text-pulse-dim">{label}</span>
                  <span className="font-semibold text-pulse-text">${usd(value)}</span>
                </div>
                <div className="h-2 w-full rounded-full" style={{ background: 'var(--pulse-track)' }}>
                  <div
                    className="h-2 rounded-full transition-all"
                    style={{
                      width: `${(value / maxVal) * 100}%`,
                      background: gradient
                        ? 'linear-gradient(90deg, var(--pulse-v1), var(--pulse-v2))'
                        : 'var(--pulse-bar-inactive)',
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Category donut + legend */}
      {catData && catData.length > 0 && (
        <Card className="p-5">
          <p className="mb-4 text-sm font-semibold text-pulse-text">By category</p>
          <div className="flex gap-4">
            <div className="relative shrink-0" style={{ width: 136, height: 136 }}>
              <PieChart width={136} height={136}>
                <Pie
                  data={catData}
                  dataKey="percentage"
                  cx={63}
                  cy={63}
                  innerRadius={40}
                  outerRadius={54}
                  strokeWidth={0}
                  paddingAngle={2}
                  cornerRadius={3}
                >
                  {catData.map((c) => {
                    const hue = SYSTEM_CATEGORY_HUES[c.categoryName] ?? 230;
                    return <Cell key={c.categoryId} fill={catColor(hue, theme)} />;
                  })}
                </Pie>
              </PieChart>
            </div>
            <div className="flex-1 space-y-2 min-w-0">
              {catData.map((c) => {
                const hue = SYSTEM_CATEGORY_HUES[c.categoryName] ?? 230;
                return (
                  <div key={c.categoryId} className="flex items-center gap-2 text-xs">
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ background: catColor(hue, theme) }}
                    />
                    <span className="truncate flex-1 text-pulse-dim">{c.categoryName}</span>
                    <span className="shrink-0 font-semibold text-pulse-text">
                      {c.percentage.toFixed(0)}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      )}

      {/* Top merchants */}
      {merchants && merchants.length > 0 && (
        <Card className="overflow-hidden">
          <div className="border-b border-pulse-stroke px-5 py-3">
            <p className="text-sm font-semibold text-pulse-text">Top merchants</p>
          </div>
          <div className="divide-y divide-pulse-stroke">
            {merchants.map((m, i) => (
              <div key={m.merchant} className="flex items-center gap-3 px-5 py-3">
                <span className="w-4 shrink-0 text-xs font-semibold text-pulse-faint">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-pulse-text">{m.merchant}</p>
                  <div className="mt-1.5 h-1 w-full rounded-full" style={{ background: 'var(--pulse-track)' }}>
                    <div
                      className="h-1 rounded-full"
                      style={{
                        width: `${(Number(m.total) / maxMerchantTotal) * 100}%`,
                        background: 'linear-gradient(90deg, var(--pulse-v1), var(--pulse-v2))',
                      }}
                    />
                  </div>
                </div>
                <span className="shrink-0 text-sm font-semibold text-pulse-text">
                  ${usd(Number(m.total), 0)}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
