/**
 * Recurring-charge finder.
 *
 * Looks at expenses that are NOT already linked to a subscription (hand-entered
 * and CSV-imported rows) and finds merchants that charge a similar amount on a
 * regular schedule — the subscriptions hiding in a bank export.
 *
 * Pure functions over plain data so the rules can be tested without Prisma.
 * Dates are `YYYY-MM-DD` strings throughout (see recurrence.ts for why).
 */
import type { RecurringCandidate, RecurringCandidateStatus } from '@gastapp/types';
import { dayAfter, daysBetween, nextOccurrenceOnOrAfter, type Frequency } from './recurrence';

export interface DetectorExpense {
  date: string;
  /** Positive decimal string, e.g. "5.99". */
  amount: string;
  currency: string;
  description: string | null;
  categoryId: string;
}

export interface DetectorSubscription {
  id: string;
  name: string;
  amount: string;
  status: 'ACTIVE' | 'PAUSED' | 'ARCHIVED';
}

/**
 * Words that say how a charge was paid or where the merchant sits, not who the
 * merchant is. Bank exports pad descriptions with these ("POS Payment
 * NETFLIX.COM 866 579 7172 US"), and they would otherwise split one merchant
 * into several or merge different ones.
 */
const NOISE_WORDS = new Set([
  'POS', 'PAYMENT', 'PAGO', 'PAGOS', 'COMPRA', 'PURCHASE', 'CARD', 'DEBIT', 'DEBITO', 'TDD', 'TDC',
  'VISA', 'MASTERCARD', 'US', 'USA', 'PA', 'VE', 'CA', 'CCS', 'LLC', 'INC', 'LTD', 'SA', 'CO',
  'COM', 'WWW', 'HTTP', 'HTTPS', 'BILL', 'BILLING', 'AMZN', 'AMZNCOMBILL', 'SUB', 'THE', 'DE',
  'LA', 'EL', 'WL', 'NET', 'ORG', 'IO', 'APP', 'CARACAS', 'PANAMA', 'MIRANDA', 'CHACAO',
]);

/** How many words of the cleaned description identify the merchant. */
const KEY_WORDS = 2;

interface FrequencyRule {
  /** Inclusive range of days between charges that counts as one period. */
  min: number;
  max: number;
  /** Days a charge may run late before the schedule counts as stopped. */
  grace: number;
  /** Fewest charges needed before the pattern is believable. */
  minCharges: number;
}

/**
 * Ordered from shortest to longest period. Monthly is wide (26–35 days) on
 * purpose: billing days drift around short months and weekends.
 */
const RULES: Array<[Frequency, FrequencyRule]> = [
  ['WEEKLY', { min: 6, max: 8, grace: 3, minCharges: 3 }],
  ['BIWEEKLY', { min: 13, max: 16, grace: 5, minCharges: 3 }],
  ['MONTHLY', { min: 26, max: 35, grace: 10, minCharges: 3 }],
  ['QUARTERLY', { min: 85, max: 98, grace: 20, minCharges: 2 }],
  ['YEARLY', { min: 350, max: 380, grace: 30, minCharges: 2 }],
];

/** Charges whose amounts differ by more than this are different price tiers. */
const PRICE_TIER_RATIO = 1.25;

/** Share of gaps that must fit the schedule (a skipped period still fits). */
const MIN_REGULARITY = 0.75;

const stripAccents = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');

/**
 * The merchant a bank description points at, as an upper-case key such as
 * `NETFLIX` or `GOOGLE ONE`. Null when nothing identifying is left.
 */
export function normalizeMerchant(description: string | null): string | null {
  if (!description) return null;
  const words = stripAccents(description)
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .split(' ')
    // Phone numbers, terminal ids and order numbers change between charges.
    .filter((w) => w.length > 1 && !/\d/.test(w))
    // "NETFLIXCOM" and "NETFLIX COM" are the same merchant.
    .map((w) => (w.length > 6 && w.endsWith('COM') ? w.slice(0, -3) : w))
    .filter((w) => !NOISE_WORDS.has(w));

  // "GOOGLE Google One" -> "GOOGLE ONE".
  const deduped = words.filter((w, i) => w !== words[i - 1]);
  if (deduped.length === 0) return null;
  return deduped.slice(0, KEY_WORDS).join(' ');
}

const titleCase = (key: string) =>
  key
    .toLowerCase()
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  const hi = s[mid] ?? 0;
  return s.length % 2 ? hi : ((s[mid - 1] ?? hi) + hi) / 2;
};

const byDate = (a: DetectorExpense, b: DetectorExpense) => a.date.localeCompare(b.date);

/**
 * Splits one merchant's charges into plans. Amounts far apart are separate
 * price tiers (e.g. $2.99 vs $29.99) when they are billed over the same
 * stretch of time. A tier that only starts after another ends is the same plan
 * after a price change, so the two are joined when together they still keep a
 * schedule. Each plan comes back sorted by date.
 */
function priceTiers(charges: DetectorExpense[]): DetectorExpense[][] {
  const byAmount = [...charges].sort((a, b) => Number(a.amount) - Number(b.amount));
  const tiers: DetectorExpense[][] = [];
  for (const c of byAmount) {
    const tier = tiers.at(-1);
    const floor = tier?.[0];
    if (tier && floor && Number(c.amount) <= Number(floor.amount) * PRICE_TIER_RATIO) {
      tier.push(c);
    } else {
      tiers.push([c]);
    }
  }

  // Oldest plan first; merge each into the previous one when they don't overlap in time.
  const ordered = tiers.map((t) => t.sort(byDate)).sort((a, b) => byDate(a[0]!, b[0]!));
  const plans: DetectorExpense[][] = [];
  for (const tier of ordered) {
    const prev = plans.at(-1);
    if (prev && prev.at(-1)!.date < tier[0]!.date) {
      const joined = [...prev, ...tier];
      if (findSchedule(joined.map((c) => c.date))) {
        plans[plans.length - 1] = joined;
        continue;
      }
    }
    plans.push(tier);
  }
  return plans;
}

/** Does a gap fit one period, or two (a single missed or failed charge)? */
const gapFits = (gap: number, rule: FrequencyRule) =>
  (gap >= rule.min && gap <= rule.max) || (gap >= rule.min * 2 && gap <= rule.max * 2);

interface Schedule {
  frequency: Frequency;
  rule: FrequencyRule;
  regularity: number;
}

function findSchedule(dates: string[]): Schedule | null {
  const gaps: number[] = [];
  dates.forEach((d, i) => {
    const prev = dates[i - 1];
    if (prev) gaps.push(daysBetween(prev, d));
  });
  if (gaps.length === 0) return null;

  const typical = median(gaps);
  const match = RULES.find(([, r]) => typical >= r.min && typical <= r.max);
  if (!match) return null;
  const [frequency, rule] = match;
  if (dates.length < rule.minCharges) return null;

  const regularity = gaps.filter((g) => gapFits(g, rule)).length / gaps.length;
  return regularity >= MIN_REGULARITY ? { frequency, rule, regularity } : null;
}

function mostCommon(values: string[]): string {
  const counts = new Map<string, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? '';
}

/** Coefficient of variation of the amounts: 0 = identical every time. */
function amountSpread(charges: DetectorExpense[]): number {
  const xs = charges.map((c) => Number(c.amount));
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
  if (mean === 0) return 0;
  const variance = xs.reduce((a, x) => a + (x - mean) ** 2, 0) / xs.length;
  return Math.sqrt(variance) / mean;
}

function confidenceOf(regularity: number, spread: number, charges: number): number {
  const steadyAmount = 1 - Math.min(1, spread * 4);
  const enoughHistory = Math.min(1, (charges - 1) / 5);
  return Math.round((0.5 * regularity + 0.3 * steadyAmount + 0.2 * enoughHistory) * 100) / 100;
}

/** The brand: the first word of the merchant key ("APPLE" in "APPLE ONE"). */
const brandOf = (merchantKey: string) => merchantKey.split(' ')[0] ?? '';

/**
 * The subscription that already covers a candidate: the same brand (first
 * merchant word — a shared generic word like ONE or PLUS is not enough), and,
 * when the merchant has several price tiers, a similar amount, so a tracked
 * $2.99 plan does not hide an untracked $19.99 one.
 */
function trackedBy(
  merchant: string,
  amount: number,
  hasSeveralTiers: boolean,
  subscriptions: DetectorSubscription[],
): string | null {
  const brand = brandOf(merchant);
  for (const s of subscriptions) {
    if (s.status === 'ARCHIVED') continue;
    const subBrand = brandOf(normalizeMerchant(s.name) ?? '');
    if (!subBrand || subBrand !== brand) continue;
    const subAmount = Number(s.amount);
    const similar =
      Math.max(subAmount, amount) <= Math.min(subAmount, amount) * PRICE_TIER_RATIO;
    if (!hasSeveralTiers || similar) return s.id;
  }
  return null;
}

/**
 * The next charge, anchored on the plan's usual billing day rather than the
 * last charge: a charge clamped into a short month (31st → Feb 28) must not
 * move every later prediction to the 28th. For monthly-or-longer plans the
 * anchor is the latest charge on the most common day of the month (ties go to
 * the later day, since clamping only ever moves a day earlier).
 */
function nextCharge(sorted: DetectorExpense[], frequency: Frequency): string {
  const last = sorted.at(-1)!;
  let anchor = last;
  if (frequency !== 'WEEKLY' && frequency !== 'BIWEEKLY') {
    const counts = new Map<number, number>();
    for (const c of sorted) {
      const d = Number(c.date.slice(8));
      counts.set(d, (counts.get(d) ?? 0) + 1);
    }
    const usualDay = [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0])[0]![0];
    anchor = [...sorted].reverse().find((c) => Number(c.date.slice(8)) === usualDay) ?? last;
  }
  return nextOccurrenceOnOrAfter(anchor.date, frequency, dayAfter(last.date)).date;
}

/**
 * Finds recurring charges among `expenses`. USD only, like the rest of the app.
 *
 * @param expenses  Expenses not linked to a subscription, any order.
 * @param subscriptions  The user's subscriptions, to mark candidates already tracked.
 * @param today  The user's calendar day, `YYYY-MM-DD`.
 */
export function detectRecurringCharges(
  expenses: DetectorExpense[],
  subscriptions: DetectorSubscription[],
  today: string,
): RecurringCandidate[] {
  const byMerchant = new Map<string, { merchant: string; charges: DetectorExpense[] }>();
  for (const e of expenses) {
    const merchant = normalizeMerchant(e.description);
    if (!merchant || Number(e.amount) <= 0 || e.currency !== 'USD') continue;
    const group = byMerchant.get(merchant) ?? { merchant, charges: [] };
    group.charges.push(e);
    byMerchant.set(merchant, group);
  }

  const candidates: RecurringCandidate[] = [];

  for (const { merchant, charges } of byMerchant.values()) {
    const tiers = priceTiers(charges);
    const found: RecurringCandidate[] = [];

    for (const sorted of tiers) {
      const schedule = findSchedule(sorted.map((c) => c.date));
      if (!schedule) continue;

      const first = sorted[0];
      const last = sorted.at(-1);
      if (!first || !last) continue;
      const nextExpectedDate = nextCharge(sorted, schedule.frequency);
      const status: RecurringCandidateStatus =
        daysBetween(nextExpectedDate, today) > schedule.rule.grace ? 'STOPPED' : 'ACTIVE';

      const currency = last.currency;
      // The dismiss list stores this key, so it must not change as charges come
      // in: the plan's first charge date stays put through price changes and
      // when another plan from the same merchant appears.
      const key = `${merchant}@${first.date}`;

      found.push({
        key,
        name: titleCase(merchant),
        amount: Number(last.amount).toFixed(2),
        currency,
        frequency: schedule.frequency,
        status,
        firstChargeDate: first.date,
        lastChargeDate: last.date,
        nextExpectedDate,
        chargeCount: sorted.length,
        categoryId: mostCommon(sorted.map((c) => c.categoryId)),
        confidence: confidenceOf(schedule.regularity, amountSpread(sorted), sorted.length),
        trackedSubscriptionId: trackedBy(
          merchant, Number(last.amount), tiers.length > 1, subscriptions,
        ),
        possibleDuplicate: false,
      });
    }

    // Two live schedules from one merchant at different prices: likely paying twice.
    const live = found.filter((c) => c.status === 'ACTIVE');
    if (live.length > 1) for (const c of live) c.possibleDuplicate = true;

    candidates.push(...found);
  }

  // Live ones first, then the most money per month.
  const perMonth: Record<Frequency, number> = {
    WEEKLY: 52 / 12, BIWEEKLY: 26 / 12, MONTHLY: 1, QUARTERLY: 1 / 3, YEARLY: 1 / 12,
  };
  return candidates.sort(
    (a, b) =>
      (a.status === b.status ? 0 : a.status === 'ACTIVE' ? -1 : 1) ||
      Number(b.amount) * perMonth[b.frequency] - Number(a.amount) * perMonth[a.frequency],
  );
}
