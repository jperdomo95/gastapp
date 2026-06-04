import { z } from 'zod';

export const categorySchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(60),
  icon: z.string().nullable(),
  color: z.string().nullable(),
  isSystem: z.boolean(),
});
export type Category = z.infer<typeof categorySchema>;

export const createCategorySchema = z.object({
  name: z.string().min(1).max(60),
  icon: z.string().max(40).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
});
export type CreateCategoryDto = z.infer<typeof createCategorySchema>;
