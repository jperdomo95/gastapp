const pad = (n: number) => String(n).padStart(2, '0');

/** Formats a Date's local calendar-day components as YYYY-MM-DD. */
const toDateString = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** The current month's key, e.g. "2026-07". */
export function currentMonthKey() {
  const n = new Date();
  return `${n.getFullYear()}-${pad(n.getMonth() + 1)}`;
}

/** A Date's local calendar day, YYYY-MM-DD. Defaults to today. */
export function todayDateString(d = new Date()) {
  return toDateString(d);
}

/** Calendar-day range (YYYY-MM-DD) for a single month, `monthsBack` months before the current one. */
export function monthRange(monthsBack = 0) {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth() - monthsBack, 1);
  const to = new Date(now.getFullYear(), now.getMonth() - monthsBack + 1, 0);
  return { from: toDateString(from), to: toDateString(to) };
}

/** Calendar-day range spanning from `monthsBack` months ago through the end of the current month. */
export function trailingMonthsRange(monthsBack: number) {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth() - monthsBack, 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { from: toDateString(from), to: toDateString(to) };
}
