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
});
export type PayCycle = z.infer<typeof payCycleSchema>;
