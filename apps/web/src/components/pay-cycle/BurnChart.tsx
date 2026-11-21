import { useMemo, useState } from 'react';
import {
  CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import type { PayCycle } from '@gastapp/types';
import { usd } from '@/lib/pulse';

interface Row {
  day: number;
  date: string;
  /** Running total spent this cycle — up to today. */
  spent?: number;
  /** Running total if the recent pace holds — from today to payday. */
  projected?: number;
  /** Running total on the same day of the previous cycle. */
  previous?: number;
}

const pad = (n: number) => String(n).padStart(2, '0');

function addDays(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  const t = new Date(Date.UTC(y, m - 1, d + days));
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}

export const formatDay = (date: string) =>
  new Date(`${date}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

/** Days from payday to the day before the latest next payday. Both counts include today. */
export const cycleLength = (cycle: PayCycle) => cycle.daysElapsed + cycle.daysLeft - 1;

const whole = (n: number) => `$${usd(n, 0)}`;

/** Day-by-day rows from the first day of the cycle to the day before the latest payday. */
export function burnRows(cycle: PayCycle): Row[] {
  const totalDays = cycleLength(cycle);
  const recent = Number(cycle.recentPerDay);
  const rows: Row[] = [];
  let running = 0;
  for (let i = 0; i < totalDays; i++) {
    const row: Row = { day: i + 1, date: addDays(cycle.start, i) };
    const today = cycle.daily[i];
    if (today) {
      running += Number(today.spent);
      row.spent = running;
    }
    // The projection starts on today's point so the two lines join.
    if (i >= cycle.daysElapsed - 1) row.projected = running + recent * (i - (cycle.daysElapsed - 1));
    const prev = cycle.previous?.cumulative[i];
    if (prev !== undefined) row.previous = Number(prev);
    rows.push(row);
  }
  return rows;
}

/**
 * Running total spent this pay cycle against what the paycheck can cover,
 * with the recent pace projected to payday and the last cycle for comparison.
 */
export function BurnChart({ cycle }: { cycle: PayCycle }) {
  const [asTable, setAsTable] = useState(false);
  const rows = useMemo(() => burnRows(cycle), [cycle]);
  // What the paycheck can cover: income less charges still due and set-asides not yet paid.
  const available = Number(cycle.income) - Number(cycle.committed) - Number(cycle.reserved);
  const hasPrevious = rows.some((r) => r.previous !== undefined);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-pulse-dim">
        <LegendItem label="This cycle" className="border-t-2 border-pulse-v1" />
        <LegendItem label="At recent pace" className="border-t-2 border-dashed border-pulse-v1" />
        {hasPrevious && <LegendItem label="Last cycle" className="border-t-2 border-pulse-faint" />}
        <LegendItem label="Spendable" className="border-t border-dashed border-pulse-v2" />
        <button
          type="button"
          className="ml-auto text-pulse-faint underline hover:text-pulse-text"
          onClick={() => setAsTable((v) => !v)}
        >
          {asTable ? 'Chart' : 'Table'}
        </button>
      </div>

      {asTable ? (
        <div className="max-h-56 overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="text-pulse-faint">
              <tr>
                <th className="py-1 text-left font-medium">Day</th>
                <th className="py-1 text-right font-medium">This cycle</th>
                <th className="py-1 text-right font-medium">At recent pace</th>
                {hasPrevious && <th className="py-1 text-right font-medium">Last cycle</th>}
              </tr>
            </thead>
            <tbody className="text-pulse-text">
              {rows.map((r) => (
                <tr key={r.day} className="border-t border-pulse-stroke">
                  <td className="py-1">{formatDay(r.date)}</td>
                  <td className="py-1 text-right">{r.spent !== undefined ? whole(r.spent) : ''}</td>
                  <td className="py-1 text-right">
                    {r.projected !== undefined && r.spent === undefined ? whole(r.projected) : ''}
                  </td>
                  {hasPrevious && (
                    <td className="py-1 text-right">{r.previous !== undefined ? whole(r.previous) : ''}</td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--pulse-grid)" />
            <XAxis
              dataKey="day"
              tickLine={false}
              axisLine={false}
              tick={{ fill: 'var(--pulse-faint)', fontSize: 10 }}
              tickFormatter={(day: number) => formatDay(rows[day - 1]?.date ?? cycle.start)}
              interval="preserveStartEnd"
              minTickGap={24}
            />
            <YAxis
              width={44}
              tickLine={false}
              axisLine={false}
              domain={[0, 'auto']}
              tick={{ fill: 'var(--pulse-faint)', fontSize: 10 }}
              tickFormatter={(v: number) => (v >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${v}`)}
            />
            <Tooltip
              cursor={{ stroke: 'var(--pulse-stroke)' }}
              content={({ active, payload }) => {
                const row = payload?.[0]?.payload as Row | undefined;
                if (!active || !row) return null;
                return (
                  <div className="rounded-lg border border-pulse-stroke bg-[var(--pulse-sheet-bg)] px-3 py-2 text-xs shadow-pulse-card">
                    <p className="mb-1 font-semibold text-pulse-text">
                      {formatDay(row.date)} · day {row.day}
                    </p>
                    {row.spent !== undefined && <TipRow label="Spent so far" value={row.spent} />}
                    {row.spent === undefined && row.projected !== undefined && (
                      <TipRow label="At recent pace" value={row.projected} />
                    )}
                    {row.previous !== undefined && <TipRow label="Last cycle" value={row.previous} />}
                    <TipRow label="Spendable" value={available} />
                  </div>
                );
              }}
            />
            <ReferenceLine y={available} stroke="var(--pulse-v2)" strokeDasharray="4 4" ifOverflow="extendDomain" />
            {hasPrevious && (
              <Line
                dataKey="previous" type="monotone" stroke="var(--pulse-faint)" strokeWidth={1.5}
                dot={false} activeDot={false} isAnimationActive={false}
              />
            )}
            <Line
              dataKey="projected" type="monotone" stroke="var(--pulse-v1)" strokeWidth={2}
              strokeDasharray="5 4" dot={false} activeDot={false} isAnimationActive={false}
            />
            <Line
              dataKey="spent" type="monotone" stroke="var(--pulse-v1)" strokeWidth={2}
              dot={false} activeDot={{ r: 4, stroke: 'var(--pulse-bg)', strokeWidth: 2 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

function LegendItem({ label, className }: { label: string; className: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`inline-block w-4 ${className}`} aria-hidden />
      {label}
    </span>
  );
}

function TipRow({ label, value }: { label: string; value: number }) {
  return (
    <p className="flex justify-between gap-4 text-pulse-dim">
      <span>{label}</span>
      <span className="font-medium text-pulse-text">${usd(value)}</span>
    </p>
  );
}

/**
 * One or two plain sentences: does this paycheck last at the recent pace, and
 * is spending running ahead of the calendar?
 */
export function forecastLines(cycle: PayCycle): { tone: 'good' | 'warning'; text: string }[] {
  const lines: { tone: 'good' | 'warning'; text: string }[] = [];
  const recent = Number(cycle.recentPerDay);
  const left = Number(cycle.left);
  const pace = `$${usd(recent, 0)}/day over the last ${cycle.recentDays} day${cycle.recentDays === 1 ? '' : 's'}`;

  if (left <= 0) {
    lines.push({ tone: 'warning', text: 'This paycheck is fully spent or committed.' });
  } else if (cycle.projectedZeroDate) {
    const short = Math.round(
      (new Date(`${cycle.nextPaydayLatest}T12:00:00`).getTime() -
        new Date(`${cycle.projectedZeroDate}T12:00:00`).getTime()) / 86_400_000,
    );
    lines.push({
      tone: 'warning',
      text: `At ${pace}, the money runs out around ${formatDay(cycle.projectedZeroDate)} — ${short} day${short === 1 ? '' : 's'} before payday. Keep to $${usd(Number(cycle.perDay), 0)}/day to make it.`,
    });
  } else {
    const spare = left - recent * Math.max(0, cycle.daysLeft - 1);
    lines.push({
      tone: 'good',
      text: spare >= 1
        ? `At ${pace}, this paycheck lasts until payday with about $${usd(spare, 0)} to spare.`
        : `At ${pace}, this paycheck just about lasts until payday.`,
    });
  }

  const income = Number(cycle.income);
  const totalDays = cycleLength(cycle);
  const used = income > 0
    ? (Number(cycle.spent) + Number(cycle.committed) + Number(cycle.reserved)) / income
    : 0;
  const elapsed = cycle.daysElapsed / totalDays;
  if (used - elapsed > 0.1) {
    lines.push({
      tone: 'warning',
      text: `${Math.round(used * 100)}% of this paycheck is spent, due or set aside, ${Math.round(elapsed * 100)}% of the way through the cycle.`,
    });
  }
  return lines;
}
