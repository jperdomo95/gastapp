import { z } from 'zod';
import { currencyInput, moneyString } from './expense.js';

const dayOfMonth = z.number().int().min(1).max(31);

/**
 * Money you expect every month — a salary, a regular transfer in. The pay
 * window is the span of days it usually lands in (e.g. 28–30, because it
 * depends on who pays); `payDayTo` below `payDayFrom` means the window crosses
 * the month end (28 → 2).
 */
export const incomeSourceSchema = z.object({
  id: z.string(),
  name: z.string(),
  amount: moneyString,
  currency: z.string().length(3),
  payDayFrom: dayOfMonth,
  payDayTo: dayOfMonth,
  /** Text in the bank description of this deposit, to recognise it on import. */
  matchText: z.string().nullable(),
  active: z.boolean(),
  createdAt: z.string(),
});
export type IncomeSource = z.infer<typeof incomeSourceSchema>;

export const createIncomeSourceSchema = z.object({
  name: z.string().trim().min(1).max(80),
  amount: moneyString,
  currency: currencyInput,
  payDayFrom: dayOfMonth,
  payDayTo: dayOfMonth,
  matchText: z.string().trim().max(80).nullish(),
  active: z.boolean().default(true),
});
export type CreateIncomeSourceDto = z.infer<typeof createIncomeSourceSchema>;

export const updateIncomeSourceSchema = createIncomeSourceSchema.partial();
export type UpdateIncomeSourceDto = z.infer<typeof updateIncomeSourceSchema>;

/** Money that actually came in. */
export const incomeSchema = z.object({
  id: z.string(),
  amount: moneyString,
  currency: z.string().length(3),
  description: z.string().nullable(),
  date: z.string().date(),
  sourceId: z.string().nullable(),
  createdAt: z.string(),
});
export type Income = z.infer<typeof incomeSchema>;

export const createIncomeSchema = z.object({
  amount: moneyString,
  currency: currencyInput,
  description: z.string().trim().max(200).nullish(),
  date: z.string().date(),
  sourceId: z.string().nullish(),
});
export type CreateIncomeDto = z.infer<typeof createIncomeSchema>;

/** The deposit list returns at most this many rows, newest first. */
export const INCOME_LIST_LIMIT = 200;

export const listIncomeQuerySchema = z.object({
  from: z.string().date().optional(),
  to: z.string().date().optional(),
});
export type ListIncomeQuery = z.infer<typeof listIncomeQuerySchema>;

export const bucketKindSchema = z.enum(['TRANSFER', 'SAVINGS', 'RESERVE']);
export type BucketKind = z.infer<typeof bucketKindSchema>;

/**
 * Money taken off the top of every paycheck before day-to-day spending: a
 * fixed transfer, savings, a reserve for surprises. Expenses whose description
 * contains `matchText`, or that are in `categoryId`, count as paying it.
 */
export const budgetBucketSchema = z.object({
  id: z.string(),
  name: z.string(),
  kind: bucketKindSchema,
  amount: moneyString,
  currency: z.string().length(3),
  matchText: z.string().nullable(),
  categoryId: z.string().nullable(),
  sortOrder: z.number().int(),
});
export type BudgetBucket = z.infer<typeof budgetBucketSchema>;

export const createBudgetBucketSchema = z
  .object({
    name: z.string().trim().min(1).max(80),
    kind: bucketKindSchema,
    amount: moneyString,
    currency: currencyInput,
    // Matched as a substring of bank descriptions: one or two characters would match nearly everything.
    matchText: z.string().trim().min(3, 'At least 3 characters').max(80).nullish().or(z.literal('')),
    categoryId: z.string().nullish(),
    sortOrder: z.number().int().default(0),
  });
export type CreateBudgetBucketDto = z.infer<typeof createBudgetBucketSchema>;

export const updateBudgetBucketSchema = createBudgetBucketSchema.partial();
export type UpdateBudgetBucketDto = z.infer<typeof updateBudgetBucketSchema>;

/**
 * The stretch of days one paycheck has to cover: from the last payday to the
 * end of the next pay window. Amounts are USD (the app is USD-only for now);
 * any legacy rows in other currencies are counted separately, not converted.
 */
export const payCycleSchema = z.object({
  currency: z.string().length(3),
  /** The payday this cycle started on. */
  start: z.string().date(),
  /** Whether `start` is a recorded deposit (true) or the expected day (false). */
  paydayConfirmed: z.boolean(),
  /** The next pay window. Budget to `nextPaydayLatest` — the safe end. */
  nextPaydayEarliest: z.string().date(),
  nextPaydayLatest: z.string().date(),
  today: z.string().date(),
  /** Days so far, today included. */
  daysElapsed: z.number().int(),
  /** Days to cover: today up to, not including, the latest next payday. */
  daysLeft: z.number().int(),
  /** Money in this cycle: recorded deposits plus expected ones not yet seen. */
  income: moneyString,
  /** Spent so far this cycle (expenses dated start…today). */
  spent: moneyString,
  /** Subscription charges still to come before the latest next payday. */
  committed: moneyString,
  /** income − spent − committed. Can be negative. */
  left: moneyString,
  /** left ÷ daysLeft, or 0 when nothing is left. */
  perDay: moneyString,
  /** Expenses this cycle in other currencies, not included above. */
  otherCurrencyExpenses: z.number().int(),
  /** Spending per day of this cycle, start…today. */
  daily: z.array(z.object({ date: z.string().date(), spent: moneyString })),
  /**
   * Average day-to-day spend over the last `recentDays` full days since payday
   * (at most a week; payday, today and subscription charges left out).
   */
  recentPerDay: moneyString,
  /** 0 early in the cycle, when there are too few full days to project a pace. */
  recentDays: z.number().int(),
  /**
   * The day the money runs out at `recentPerDay`; null when it lasts until the
   * latest next payday, today when nothing is left already.
   */
  projectedZeroDate: z.string().date().nullable(),
  /** The cycle before this one: running total spent by day, for comparison. */
  previous: z
    .object({ start: z.string().date(), end: z.string().date(), cumulative: z.array(moneyString) })
    .nullable(),
  /** Each set-aside with what has gone to it this cycle. */
  buckets: z.array(z.object({
    id: z.string(), name: z.string(), kind: bucketKindSchema, amount: moneyString, paid: moneyString,
  })),
  /** Set-asides not paid yet this cycle — held back from `left`. */
  reserved: moneyString,
  /**
   * Day-to-day money: income minus set-asides and every subscription charge
   * of the cycle, spread evenly over its days and handed out by the week.
   * Spending here excludes subscription charges and set-aside payments.
   */
  allowance: z.object({
    cycleBudget: moneyString,
    cycleSpent: moneyString,
    perDay: moneyString,
    week: z.object({
      number: z.number().int(),
      start: z.string().date(),
      end: z.string().date(),
      budget: moneyString,
      spent: moneyString,
    }),
  }),
});
export type PayCycle = z.infer<typeof payCycleSchema>;
