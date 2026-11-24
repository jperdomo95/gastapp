import { z } from 'zod';
import { moneyString } from './expense.js';

export const recurrenceFrequencySchema = z.enum([
  'WEEKLY',
  'BIWEEKLY',
  'MONTHLY',
  'QUARTERLY',
  'YEARLY',
]);
export type RecurrenceFrequency = z.infer<typeof recurrenceFrequencySchema>;

export const subscriptionStatusSchema = z.enum(['ACTIVE', 'PAUSED', 'ARCHIVED']);
export type SubscriptionStatus = z.infer<typeof subscriptionStatusSchema>;

export const subscriptionAmountChangeSchema = z.object({
  id: z.string(),
  amount: moneyString,
  effectiveFrom: z.string().date(),
});
export type SubscriptionAmountChange = z.infer<typeof subscriptionAmountChangeSchema>;

export const createAmountChangeSchema = z.object({
  amount: moneyString,
  effectiveFrom: z.string().date(),
});
export type CreateAmountChangeDto = z.infer<typeof createAmountChangeSchema>;

export const subscriptionSchema = z.object({
  id: z.string(),
  name: z.string(),
  amount: moneyString,
  currency: z.string().length(3),
  description: z.string().nullable(),
  frequency: recurrenceFrequencySchema,
  startDate: z.string().date(),
  endDate: z.string().date().nullable(),
  /** Next period still to be materialised. Null once the schedule is finished. */
  nextOccurrenceDate: z.string().date().nullable(),
  lastGeneratedDate: z.string().date().nullable(),
  status: subscriptionStatusSchema,
  categoryId: z.string(),
  /** How many expenses this subscription has generated so far. */
  expenseCount: z.number().int(),
  /** Scheduled price changes, oldest first. */
  amountChanges: z.array(subscriptionAmountChangeSchema),
  createdAt: z.string().datetime(),
});
export type Subscription = z.infer<typeof subscriptionSchema>;

/**
 * The editable fields, as a plain object so `.partial()` stays available —
 * `createSubscriptionSchema` refines it, and a ZodEffects has no `.partial()`.
 */
const subscriptionFields = z.object({
  name: z.string().min(1).max(80),
  amount: moneyString,
  currency: z.string().length(3).default('USD'),
  description: z.string().max(280).optional(),
  frequency: recurrenceFrequencySchema,
  startDate: z.string().date(),
  // Nullable, not just optional: a PATCH needs a way to say "no end date"
  // (omitting the key means "leave it alone").
  endDate: z.string().date().nullable().optional(),
  categoryId: z.string(),
});

export const createSubscriptionSchema = subscriptionFields
  .extend({
    /** Materialise every period between startDate and today, not just future ones. */
    backfillPastOccurrences: z.boolean().default(false),
  })
  .refine((v) => !v.endDate || v.endDate >= v.startDate, {
    message: 'End date cannot be before the start date',
    path: ['endDate'],
  });
export type CreateSubscriptionDto = z.infer<typeof createSubscriptionSchema>;

// Derived from the plain object, not from the refined create schema. The
// cross-field endDate/startDate check cannot live here — a PATCH may send only
// endDate, which has to be compared against the persisted startDate — so the
// service re-checks it.
export const updateSubscriptionSchema = subscriptionFields.partial().extend({
  status: subscriptionStatusSchema.optional(),
});
export type UpdateSubscriptionDto = z.infer<typeof updateSubscriptionSchema>;

export const listSubscriptionsQuerySchema = z.object({
  status: subscriptionStatusSchema.optional(),
});
export type ListSubscriptionsQuery = z.infer<typeof listSubscriptionsQuerySchema>;

/**
 * What the recurring-charge finder thinks a group of hand-entered or imported
 * expenses is.
 *
 * - ACTIVE: charged on schedule, next charge is still ahead (or only just due).
 * - STOPPED: the schedule held, but the last expected charge never came —
 *   usually a cancelled service, or a card that started failing.
 */
export const recurringCandidateStatusSchema = z.enum(['ACTIVE', 'STOPPED']);
export type RecurringCandidateStatus = z.infer<typeof recurringCandidateStatusSchema>;

export const recurringCandidateSchema = z.object({
  /** Stable key for the merchant + price tier, e.g. `NETFLIX` or `GOOGLE ONE@2.99`. */
  key: z.string(),
  /** Human-friendly merchant name, suitable as a subscription name. */
  name: z.string(),
  /** The most recent charge — the current price, after any increase. */
  amount: moneyString,
  currency: z.string().length(3),
  frequency: recurrenceFrequencySchema,
  status: recurringCandidateStatusSchema,
  firstChargeDate: z.string().date(),
  lastChargeDate: z.string().date(),
  /** When the next charge is due if the schedule continues. */
  nextExpectedDate: z.string().date(),
  chargeCount: z.number().int(),
  /** The category most of the matched expenses were filed under. */
  categoryId: z.string(),
  /** 0–1: how regular the dates and amounts were. */
  confidence: z.number().min(0).max(1),
  /** An existing subscription that already covers this merchant, if any. */
  trackedSubscriptionId: z.string().nullable(),
  /**
   * Another active charge from the same merchant at a different price — e.g.
   * two Google One plans billed to the same card.
   */
  possibleDuplicate: z.boolean(),
});
export type RecurringCandidate = z.infer<typeof recurringCandidateSchema>;

export const runGenerationResultSchema = z.object({
  generated: z.number().int(),
  subscriptionsProcessed: z.number().int(),
});
export type RunGenerationResult = z.infer<typeof runGenerationResultSchema>;
