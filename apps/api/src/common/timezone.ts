export function isValidTimezone(tz: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/**
 * The user's current calendar day as YYYY-MM-DD, falling back to UTC when no
 * timezone is set. "Is this subscription due?" must be answered against the
 * user's today, not the server's.
 *
 * `en-CA` is the locale whose numeric date format is already YYYY-MM-DD.
 */
export function todayInTimezone(tz: string | null | undefined, now = new Date()): string {
  const zone = tz && isValidTimezone(tz) ? tz : 'UTC';
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: zone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}
