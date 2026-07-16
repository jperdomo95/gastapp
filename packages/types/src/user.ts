import { z } from 'zod';

export const userSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
  timezone: z.string().nullable(),
  createdAt: z.string().datetime(),
});
export type User = z.infer<typeof userSchema>;

export const updateUserSchema = z.object({
  timezone: z.string().min(1).max(100),
});
export type UpdateUserDto = z.infer<typeof updateUserSchema>;
