import { z } from 'zod';

export const monthlyTotalSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/),
  total: z.string(),
});
export type MonthlyTotal = z.infer<typeof monthlyTotalSchema>;

export const categoryBreakdownSchema = z.object({
  categoryId: z.string(),
  categoryName: z.string(),
  total: z.string(),
  percentage: z.number().min(0).max(100),
});
export type CategoryBreakdown = z.infer<typeof categoryBreakdownSchema>;

export const topMerchantSchema = z.object({
  merchant: z.string(),
  count: z.number().int(),
  total: z.string(),
});
export type TopMerchant = z.infer<typeof topMerchantSchema>;

export const reportRangeQuerySchema = z.object({
  from: z.string().datetime(),
  to: z.string().datetime(),
});
export type ReportRangeQuery = z.infer<typeof reportRangeQuerySchema>;
