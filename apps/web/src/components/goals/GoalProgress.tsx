import type { SavingsGoal } from '@gastapp/types';
import { usd } from '@/lib/pulse';

export const formatMonth = (date: string) =>
  new Date(`${date}T12:00:00`).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

export const goalMoney = (amount: string | number, currency: string) =>
  currency === 'USD' ? `$${usd(amount, 0)}` : `${usd(amount, 0)} ${currency}`;

/** A progress bar with a tick at every step, and when each step is reached. */
export function GoalProgress({ goal, compact = false }: { goal: SavingsGoal; compact?: boolean }) {
  const { progress, currency } = goal;
  const target = Number(goal.targetAmount);
  const saved = Number(progress.saved);
  const pct = target > 0 ? Math.min(100, (saved / target) * 100) : 0;
  const steps = progress.steps.slice(0, -1); // the last one is the target
  const next = progress.steps.find((s) => !s.reached);

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm">
          <span className="font-semibold text-pulse-text">{goalMoney(saved, currency)}</span>
          <span className="text-pulse-faint"> of {goalMoney(target, currency)}</span>
        </span>
        <span className="text-xs text-pulse-dim">{Math.floor(pct)}%</span>
      </div>

      <div
        className="relative h-2 overflow-hidden rounded-full bg-pulse-track"
        role="img"
        aria-label={`${Math.floor(pct)}% of ${goalMoney(target, currency)} saved`}
      >
        <div
          className="h-full rounded-full"
          style={{ width: `${pct}%`, background: 'linear-gradient(90deg, var(--pulse-v1), var(--pulse-v2))' }}
        />
        {steps.map((s) => (
          <div
            key={s.amount}
            className="absolute inset-y-0 w-0.5 bg-pulse-bg"
            style={{ left: `${(Number(s.amount) / target) * 100}%` }}
          />
        ))}
      </div>

      {!compact && progress.steps.length > 1 && (
        <ol className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
          {progress.steps.map((s) => (
            <li key={s.amount} className={s.reached ? 'text-pulse-v2' : 'text-pulse-dim'}>
              {s.reached ? '✓ ' : ''}
              {goalMoney(s.amount, currency)}
              {!s.reached && s.eta && <span className="text-pulse-faint"> · {formatMonth(s.eta)}</span>}
            </li>
          ))}
        </ol>
      )}

      <p className="text-xs text-pulse-faint">
        {next === undefined
          ? 'Goal reached.'
          : progress.ratePerMonth
            ? `Saving ${goalMoney(progress.ratePerMonth, currency)}/month${progress.rateSource === 'SET_ASIDE' ? ' (your set-aside)' : ' (recent average)'}` +
              (next.eta ? ` — ${goalMoney(next.amount, currency)} by ${formatMonth(next.eta)}.` : '.')
            : 'Link a savings set-aside to see when you will get there.'}
      </p>
    </div>
  );
}
