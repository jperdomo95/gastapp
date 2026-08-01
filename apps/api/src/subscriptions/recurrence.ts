/**
 * Recurrence maths over plain `YYYY-MM-DD` calendar days.
 *
 * Deliberately string/UTC-only: commit c706d27 removed timezone conversion from
 * date logic across the app, and every date library that works on local `Date`
 * getters would reintroduce it (`addMonths(new Date('2026-01-31'), 1)` reads
 * Jan 30 in a UTC-4 runtime and returns the wrong month).
 */

export type Frequency = 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';

/** Frequencies that step by whole days. Zero means the frequency steps by months. */
const DAYS_PER_PERIOD: Record<Frequency, number> = {
  WEEKLY: 7,
  BIWEEKLY: 14,
  MONTHLY: 0,
  QUARTERLY: 0,
  YEARLY: 0,
};

const MONTHS_PER_PERIOD: Record<Frequency, number> = {
  WEEKLY: 0,
  BIWEEKLY: 0,
  MONTHLY: 1,
  QUARTERLY: 3,
  YEARLY: 12,
};

const MS_PER_DAY = 86_400_000;

const pad = (n: number) => String(n).padStart(2, '0');

function parse(date: string): { y: number; m: number; d: number } {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!m) throw new RangeError(`Not a YYYY-MM-DD calendar day: ${date}`);
  return { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) };
}

const format = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;

/** `month` is 1-based. */
function daysInMonth(year: number, month: number): number {
  // Day 0 of the next month is the last day of this one.
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/**
 * The nth occurrence of a schedule anchored at `startDate` (n = 0 is
 * `startDate` itself).
 *
 * Always computed from the anchor, never from the previous occurrence: adding
 * a month repeatedly turns Jan 31 into Feb 28 and then Mar 28, drifting the
 * billing day permanently. Anchoring gives Jan 31 -> Feb 28 -> Mar 31.
 */
export function occurrenceOn(startDate: string, freq: Frequency, n: number): string {
  if (!Number.isInteger(n) || n < 0) {
    throw new RangeError(`Occurrence index must be a non-negative integer, got ${n}`);
  }
  const { y, m, d } = parse(startDate);

  const dayStep = DAYS_PER_PERIOD[freq];
  if (dayStep > 0) {
    const t = new Date(Date.UTC(y, m - 1, d + dayStep * n));
    return format(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate());
  }

  const monthsFromYearZero = (m - 1) + MONTHS_PER_PERIOD[freq] * n;
  const targetYear = y + Math.floor(monthsFromYearZero / 12);
  const targetMonth = (monthsFromYearZero % 12) + 1;
  // Clamp the billing day into the target month: Jan 31 -> Feb 28/29.
  return format(targetYear, targetMonth, Math.min(d, daysInMonth(targetYear, targetMonth)));
}

/**
 * The first occurrence on or after `floor`, with its index.
 *
 * Estimated arithmetically and then nudged at most one period in either
 * direction, so it stays O(1) even for a start date decades in the past.
 */
export function nextOccurrenceOnOrAfter(
  startDate: string,
  freq: Frequency,
  floor: string,
): { date: string; index: number } {
  parse(floor);
  if (floor <= startDate) return { date: startDate, index: 0 };

  const dayStep = DAYS_PER_PERIOD[freq];
  let n: number;
  if (dayStep > 0) {
    n = Math.ceil(daysBetween(startDate, floor) / dayStep);
  } else {
    const s = parse(startDate);
    const f = parse(floor);
    n = Math.floor((f.y * 12 + f.m - (s.y * 12 + s.m)) / MONTHS_PER_PERIOD[freq]);
  }

  while (n > 0 && occurrenceOn(startDate, freq, n - 1) >= floor) n -= 1;
  while (occurrenceOn(startDate, freq, n) < floor) n += 1;

  return { date: occurrenceOn(startDate, freq, n), index: n };
}

/** Whole days from `from` to `to`. Negative when `to` precedes `from`. */
export function daysBetween(from: string, to: string): number {
  const a = parse(from);
  const b = parse(to);
  return (Date.UTC(b.y, b.m - 1, b.d) - Date.UTC(a.y, a.m - 1, a.d)) / MS_PER_DAY;
}

/** The calendar day after `date`. */
export function dayAfter(date: string): string {
  const { y, m, d } = parse(date);
  const t = new Date(Date.UTC(y, m - 1, d + 1));
  return format(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate());
}

/** The later of two calendar days. `YYYY-MM-DD` sorts correctly as a string. */
export const maxDateString = (a: string, b: string): string => (a >= b ? a : b);

/** A `@db.Date` column value as a calendar day string. */
export const toDateString = (d: Date): string =>
  `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;

/** A calendar day string as the UTC-midnight `Date` a `@db.Date` column stores. */
export const toDbDate = (date: string): Date => {
  const { y, m, d } = parse(date);
  return new Date(Date.UTC(y, m - 1, d));
};
