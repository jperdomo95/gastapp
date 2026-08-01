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

export const runGenerationResultSchema = z.object({
  generated: z.number().int(),
  subscriptionsProcessed: z.number().int(),
});
export type RunGenerationResult = z.infer<typeof runGenerationResultSchema>;
