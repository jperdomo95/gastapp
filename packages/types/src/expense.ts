import { z } from 'zod';

const moneyString = z
  .string()
  .regex(/^\d+(\.\d{1,2})?$/, 'Amount must be a decimal with up to 2 fraction digits');

export const expenseSchema = z.object({
  id: z.string(),
  amount: moneyString,
  currency: z.string().length(3),
  description: z.string().nullable(),
  date: z.string().date(),
  categoryId: z.string(),
  createdAt: z.string().datetime(),
});
export type Expense = z.infer<typeof expenseSchema>;

export const createExpenseSchema = z.object({
  amount: moneyString,
  currency: z.string().length(3).default('USD'),
  description: z.string().max(280).optional(),
  date: z.string().date(),
  categoryId: z.string(),
});
export type CreateExpenseDto = z.infer<typeof createExpenseSchema>;

export const updateExpenseSchema = createExpenseSchema.partial();
export type UpdateExpenseDto = z.infer<typeof updateExpenseSchema>;

export const listExpensesQuerySchema = z.object({
  from: z.string().date().optional(),
  to: z.string().date().optional(),
  categoryId: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});
export type ListExpensesQuery = z.infer<typeof listExpensesQuerySchema>;

export const importExpensesBodySchema = z.object({
  categoryId: z.string().min(1),
});
export type ImportExpensesBody = z.infer<typeof importExpensesBodySchema>;

export const importExpensesResultSchema = z.object({
  imported: z.number().int(),
  skipped: z.number().int(),
  errors: z.array(z.object({ line: z.number().int(), reason: z.string() })),
});
export type ImportExpensesResult = z.infer<typeof importExpensesResultSchema>;
