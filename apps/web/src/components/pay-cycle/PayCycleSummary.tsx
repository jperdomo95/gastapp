import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Wallet } from 'lucide-react';
import { usePayCycle } from '@/hooks/use-income';
import { Card } from '@/components/ui/card';
import { usd } from '@/lib/pulse';
import { BurnChart, cycleLength, forecastLines, formatDay } from './BurnChart';
import type { PayCycle } from '@gastapp/types';

/** The forecast sentences, each with an icon so the tone never rests on color alone. */
export function Forecast({ cycle }: { cycle: PayCycle }) {
  return (
    <ul className="space-y-1">
      {forecastLines(cycle).map((line) => (
        <li key={line.text} className="flex items-start gap-2 text-xs text-pulse-dim">
          {line.tone === 'good' ? (
            <CheckCircle2 size={14} className="mt-px shrink-0 text-emerald-400" aria-label="On track" />
          ) : (
            <AlertTriangle size={14} className="mt-px shrink-0 text-amber-400" aria-label="Warning" />
          )}
          <span>{line.text}</span>
        </li>
      ))}
    </ul>
  );
}

/** Dashboard card: what is left of this paycheck and whether it lasts to payday. */
export function PayCycleSummary() {
  const { data: cycle, isLoading, isError } = usePayCycle();
  if (isLoading) return null;

  if (!cycle) {
    // A failed request leaves `cycle` undefined too; only an API answer of
    // `null` means there's no salary set up. (A failed refetch keeps old data.)
    if (isError || cycle === undefined) return null;
    return (
      <Card className="flex items-center gap-3 p-4">
        <Wallet size={18} className="shrink-0 text-pulse-v2" />
        <p className="flex-1 text-xs text-pulse-dim">
          Add your salary to see how long each paycheck lasts.
        </p>
        <Link to="/income" className="text-xs font-semibold text-pulse-v2 hover:underline">
          Set up
        </Link>
      </Card>
    );
  }

  const c = cycle.currency === 'USD' ? '$' : `${cycle.currency} `;
  return (
    <Card className="space-y-4 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-pulse-text">This paycheck</p>
          <p className="text-xs text-pulse-faint">
            Since {formatDay(cycle.start)} · day {cycle.daysElapsed} of {cycleLength(cycle)}
          </p>
        </div>
        <div className="text-right">
          <p className={`text-xl font-bold ${Number(cycle.left) < 0 ? 'text-red-400' : 'text-pulse-text'}`}>
            {c}{usd(Number(cycle.left), 0)}
          </p>
          <p className="text-xs text-pulse-faint">left · {c}{usd(Number(cycle.perDay), 0)}/day</p>
        </div>
      </div>
      <Forecast cycle={cycle} />
      <BurnChart cycle={cycle} />
      <div className="text-right">
        <Link to="/income" className="text-xs text-pulse-faint hover:text-pulse-text hover:underline">
          Income & pay cycle →
        </Link>
      </div>
    </Card>
  );
}
