import { z } from 'zod';
import { currencyInput, moneyString } from './expense.js';

/**
 * A savings target, optionally in steps (an emergency fund: 1,000 → 2,300 →
 * 7,000). Saved = the balance you last entered plus every expense paying the
 * linked set-aside since then.
 */
export const savingsGoalSchema = z.object({
  id: z.string(),
  name: z.string(),
  targetAmount: moneyString,
  currency: z.string().length(3),
  milestones: z.array(moneyString),
  baseAmount: moneyString,
  baseDate: z.string().date(),
  bucketId: z.string().nullable(),
  progress: z.object({
    saved: moneyString,
    remaining: moneyString,
    /** Contributions recognised since `baseDate`. */
    contributed: moneyString,
    /** Expected saving per month, and where the figure comes from. */
    ratePerMonth: moneyString.nullable(),
    rateSource: z.enum(['SET_ASIDE', 'HISTORY']).nullable(),
    /** Each step, the target last, with when it is reached at that rate. */
    steps: z.array(z.object({
      amount: moneyString,
      reached: z.boolean(),
      eta: z.string().date().nullable(),
    })),
  }),
});
export type SavingsGoal = z.infer<typeof savingsGoalSchema>;

const milestoneList = z.array(moneyString).max(10);

export const createSavingsGoalSchema = z.object({
  name: z.string().trim().min(1).max(80),
  targetAmount: moneyString.refine((v) => Number(v) > 0, 'Target must be more than 0'),
  currency: currencyInput,
  milestones: milestoneList.default([]),
  /** What is already saved today. */
  baseAmount: moneyString.default('0'),
  bucketId: z.string().nullish(),
});
export type CreateSavingsGoalDto = z.infer<typeof createSavingsGoalSchema>;

/** Sending `baseAmount` resets the balance as of today. */
export const updateSavingsGoalSchema = createSavingsGoalSchema.partial();
export type UpdateSavingsGoalDto = z.infer<typeof updateSavingsGoalSchema>;
