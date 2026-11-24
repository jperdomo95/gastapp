/**
 * Pay-cycle maths: which paycheck you are living on today, when the next one
 * lands, and how much of this one is left once known charges are paid.
 *
 * Pure and string-dated (`YYYY-MM-DD`, UTC only) like ../subscriptions/recurrence.
 */
import {
  daysBetween, dayAfter, nextOccurrenceOnOrAfter, type Frequency,
} from '../subscriptions/recurrence';

export interface CycleSource {
  id: string;
  amount: string;
  currency: string;
  payDayFrom: number;
  payDayTo: number;
  active: boolean;
}

export interface CycleIncome {
  date: string;
  amount: string;
  currency: string;
  sourceId: string | null;
}

export interface CycleExpense {
  date: string;
  amount: string;
  currency: string;
}

export interface CycleSubscription {
  amount: string;
  currency: string;
  frequency: Frequency;
  startDate: string;
  endDate: string | null;
  /** The next charge not yet in the ledger. Null once finished. */
  nextOccurrenceDate: string | null;
  /** Scheduled price changes, ordered by `effectiveFrom` ascending. */
  amountChanges?: { amount: string; effectiveFrom: string }[];
}

export interface PayWindow {
  /** Year and 1-based month the window starts in — its identity. */
  year: number;
  month: number;
  start: string;
  end: string;
}

export interface PayCycleResult {
  currency: string;
  start: string;
  paydayConfirmed: boolean;
  nextPaydayEarliest: string;
  nextPaydayLatest: string;
  today: string;
  daysElapsed: number;
  daysLeft: number;
  income: string;
  spent: string;
  committed: string;
  left: string;
  perDay: string;
  otherCurrencyExpenses: number;
}

const pad = (n: number) => String(n).padStart(2, '0');

const daysInMonth = (year: number, month: number) =>
  new Date(Date.UTC(year, month, 0)).getUTCDate();

/** `day` of the given month, clamped so 31 means "last day" in short months. */
function dayIn(year: number, month: number, day: number): string {
  const y = year + Math.floor((month - 1) / 12);
  const m = ((((month - 1) % 12) + 12) % 12) + 1;
  return `${y}-${pad(m)}-${pad(Math.min(day, daysInMonth(y, m)))}`;
}

/** The pay window that starts in `year`/`month`, normalising month overflow. */
export function payWindow(source: Pick<CycleSource, 'payDayFrom' | 'payDayTo'>, year: number, month: number): PayWindow {
  const start = dayIn(year, month, source.payDayFrom);
  const [y, m] = start.split('-').map(Number) as [number, number];
  // A window like 28 → 2 crosses into the following month.
  const end = source.payDayTo >= source.payDayFrom
    ? dayIn(y, m, source.payDayTo)
    : dayIn(y, m + 1, source.payDayTo);
  return { year: y, month: m, start, end };
}

const ymOf = (date: string) => date.split('-').map(Number).slice(0, 2) as [number, number];

/** The latest window that has started on or before `date`. */
export function windowStartedBy(source: CycleSource, date: string): PayWindow {
  const [y, m] = ymOf(date);
  const thisMonth = payWindow(source, y, m);
  return thisMonth.start <= date ? thisMonth : payWindow(source, y, m - 1);
}

/** The window a deposit on `date` most plausibly belongs to (paid early, on time or late). */
export function windowOf(source: CycleSource, date: string): PayWindow {
  const [y, m] = ymOf(date);
  return [payWindow(source, y, m - 1), payWindow(source, y, m), payWindow(source, y, m + 1)]
    .reduce((best, w) => (distanceToWindow(w, date) < distanceToWindow(best, date) ? w : best));
}

/** `date` moved by `days` (negative goes back). */
export function shiftDays(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  const t = new Date(Date.UTC(y, m - 1, d + days));
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}

const cents = (amount: string) => Math.round(Number(amount) * 100);
const money = (c: number) => (c / 100).toFixed(2);

/** The app is USD-only for now; rows in any other currency are legacy and ignored. */
const CURRENCY = 'USD';

/**
 * How far outside its pay window a deposit may land and still count as that
 * payday. Anything further off (a bonus, a reimbursement matched by text) is
 * extra income, not a new cycle.
 */
export const PAYDAY_TOLERANCE_DAYS = 5;

/** The price in force on `date`: the latest change effective by then, else the base amount. */
function amountOn(s: CycleSubscription, date: string): number {
  let price = s.amount;
  for (const c of s.amountChanges ?? []) {
    if (c.effectiveFrom <= date) price = c.amount;
    else break;
  }
  return cents(price);
}

/**
 * Total of one subscription's charges dated after `after` and before `before`,
 * each at the price in force on its date. A charge on the payday itself is left
 * to the next paycheck.
 */
function chargesBetween(s: CycleSubscription, after: string, before: string): number {
  if (!s.nextOccurrenceDate) return 0;
  let total = 0;
  let date = s.nextOccurrenceDate;
  // Bounded: at most ~10 weekly charges fit in one pay cycle.
  for (let guard = 0; guard < 60 && date < before; guard++) {
    if (s.endDate && date > s.endDate) break;
    if (date > after) total += amountOn(s, date);
    date = nextOccurrenceOnOrAfter(s.startDate, s.frequency, dayAfter(date)).date;
  }
  return total;
}

/** Days between `date` and the nearest edge of `w` (0 inside it). */
const distanceToWindow = (w: PayWindow, date: string) =>
  date < w.start ? daysBetween(date, w.start) : date > w.end ? daysBetween(w.end, date) : 0;

const windowIndex = (w: PayWindow) => w.year * 12 + w.month;

/**
 * The pay cycle containing `today`, driven by the main source — the biggest
 * active USD one. Returns null when there is no active source.
 */
export function computePayCycle(input: {
  today: string;
  sources: CycleSource[];
  incomes: CycleIncome[];
  expenses: CycleExpense[];
  subscriptions: CycleSubscription[];
}): PayCycleResult | null {
  const { today } = input;
  const currency = CURRENCY;
  const active = input.sources.filter((s) => s.active && s.currency === currency);
  const main = [...active].sort((a, b) => cents(b.amount) - cents(a.amount))[0];
  if (!main) return null;

  // Start: the payday deposit for the window that has already opened (or the
  // next one, paid early); otherwise the day that window opened, unconfirmed.
  // Only a deposit landing near its window is a payday, and the first one in
  // that window wins — later top-ups from the same source don't restart it.
  const expected = windowStartedBy(main, today);
  let payday: { date: string; window: PayWindow } | null = null;
  for (const i of input.incomes) {
    if (i.sourceId !== main.id || i.date > today) continue;
    const window = windowOf(main, i.date);
    if (distanceToWindow(window, i.date) > PAYDAY_TOLERANCE_DAYS) continue;
    const newer = !payday || windowIndex(window) > windowIndex(payday.window);
    const earlier = payday && windowIndex(window) === windowIndex(payday.window) && i.date < payday.date;
    if (newer || earlier) payday = { date: i.date, window };
  }
  const confirmed = payday !== null && windowIndex(payday.window) >= windowIndex(expected);

  const start = confirmed && payday ? payday.date : expected.start;
  const current = confirmed && payday ? payday.window : expected;
  const next = payWindow(main, current.year, current.month + 1);

  const inCycle = (date: string) => date >= start && date <= today;

  // Money in: what was recorded, plus each source whose window has opened this
  // cycle but whose deposit is not recorded yet.
  const recorded = input.incomes.filter((i) => i.currency === currency && inCycle(i.date));
  let income = recorded.reduce((acc, i) => acc + cents(i.amount), 0);
  for (const s of active) {
    if (s.currency !== currency) continue;
    const opened = windowStartedBy(s, today);
    const seen = recorded.some((i) => i.sourceId === s.id);
    if (!seen && opened.start >= start) income += cents(s.amount);
  }

  const cycleExpenses = input.expenses.filter((e) => inCycle(e.date));
  const spent = cycleExpenses
    .filter((e) => e.currency === currency)
    .reduce((acc, e) => acc + cents(e.amount), 0);

  const committed = input.subscriptions
    .filter((s) => s.currency === currency)
    .reduce((acc, s) => acc + chargesBetween(s, today, next.end), 0);

  const left = income - spent - committed;
  const daysLeft = Math.max(1, daysBetween(today, next.end));

  return {
    currency,
    start,
    paydayConfirmed: confirmed,
    nextPaydayEarliest: next.start,
    nextPaydayLatest: next.end,
    today,
    daysElapsed: daysBetween(start, today) + 1,
    daysLeft,
    income: money(income),
    spent: money(spent),
    committed: money(committed),
    left: money(left),
    perDay: money(left > 0 ? Math.floor(left / daysLeft) : 0),
    otherCurrencyExpenses: cycleExpenses.filter((e) => e.currency !== currency).length,
  };
}
