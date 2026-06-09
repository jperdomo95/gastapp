import { z } from 'zod';

export const categorySchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(60),
  icon: z.string().nullable(),
  color: z.string().nullable(),
  isSystem: z.boolean(),
  expenseCount: z.number(),
});
export type Category = z.infer<typeof categorySchema>;

export const createCategorySchema = z.object({
  name: z.string().min(1).max(60),
  icon: z.string().max(40).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
});
export type CreateCategoryDto = z.infer<typeof createCategorySchema>;

export const updateCategorySchema = createCategorySchema.partial();
export type UpdateCategoryDto = z.infer<typeof updateCategorySchema>;

export const deleteCategorySchema = z.object({
  reassignTo: z.string().optional(),
});
export type DeleteCategoryDto = z.infer<typeof deleteCategorySchema>;
