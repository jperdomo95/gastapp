/**
 * How far a savings goal has come and when each step is reached. Pure and
 * string-dated, like ../income/pay-cycle.
 */
import { daysBetween } from '../subscriptions/recurrence';
import { paysBucket, shiftDays, type CycleBucket, type CycleExpense } from '../income/pay-cycle';

export interface GoalInput {
  targetAmount: string;
  currency: string;
  milestones: string[];
  baseAmount: string;
  baseDate: string;
  bucket: CycleBucket | null;
}

export interface GoalProgress {
  saved: string;
  remaining: string;
  contributed: string;
  ratePerMonth: string | null;
  rateSource: 'SET_ASIDE' | 'HISTORY' | null;
  steps: Array<{ amount: string; reached: boolean; eta: string | null }>;
}

const DAYS_PER_MONTH = 365.25 / 12;
/** Saving history this short says little about the rate. */
const MIN_HISTORY_DAYS = 28;
const HISTORY_WINDOW_DAYS = 90;

const cents = (amount: string) => Math.round(Number(amount) * 100);
const money = (c: number) => (c / 100).toFixed(2);

export function goalProgress(goal: GoalInput, expenses: CycleExpense[], today: string): GoalProgress {
  const { bucket } = goal;
  // Money moved into the goal: payments to its set-aside after the balance was last entered.
  const contributions = bucket
    ? expenses.filter((e) =>
        e.currency === goal.currency && !e.fromSubscription &&
        e.date > goal.baseDate && e.date <= today && paysBucket(bucket, e))
    : [];
  const contributed = contributions.reduce((acc, e) => acc + cents(e.amount), 0);
  const saved = cents(goal.baseAmount) + contributed;
  const target = cents(goal.targetAmount);

  // The plan (the set-aside, once per paycheck) beats history; history is the
  // fallback when the set-aside amount is in another currency or missing.
  let rate: number | null = null;
  let rateSource: GoalProgress['rateSource'] = null;
  if (bucket && bucket.currency === goal.currency && cents(bucket.amount) > 0) {
    rate = cents(bucket.amount);
    rateSource = 'SET_ASIDE';
  } else {
    const span = Math.min(HISTORY_WINDOW_DAYS, daysBetween(goal.baseDate, today));
    if (span >= MIN_HISTORY_DAYS) {
      const since = shiftDays(today, -span);
      const recent = contributions.filter((e) => e.date > since).reduce((a, e) => a + cents(e.amount), 0);
      if (recent > 0) {
        rate = Math.round(recent / (span / DAYS_PER_MONTH));
        rateSource = 'HISTORY';
      }
    }
  }

  const amounts = [...new Set([...goal.milestones.map(cents), target])]
    .filter((a) => a > 0 && a <= target)
    .sort((a, b) => a - b);

  return {
    saved: money(saved),
    remaining: money(Math.max(0, target - saved)),
    contributed: money(contributed),
    ratePerMonth: rate === null ? null : money(rate),
    rateSource,
    steps: amounts.map((amount) => {
      const reached = saved >= amount;
      const eta = reached || !rate
        ? null
        : shiftDays(today, Math.ceil(((amount - saved) / rate) * DAYS_PER_MONTH));
      return { amount: money(amount), reached, eta };
    }),
  };
}
