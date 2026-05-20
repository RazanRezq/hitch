import { z } from 'zod';

export const localeSchema = z.enum(['is', 'en', 'ar']);
export const currencySchema = z.enum(['ISK', 'EUR', 'USD']);
export const userRoleSchema = z.enum(['SUPER_ADMIN', 'DISPATCHER', 'DRIVER', 'PASSENGER']);

export const userPreferencesSchema = z.object({
  preferredLocale: localeSchema,
  preferredCurrency: currencySchema,
});
export type UserPreferencesInput = z.infer<typeof userPreferencesSchema>;

export const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(120).optional(),
  phone: z.string().min(6).max(20).optional(),
  preferredLocale: localeSchema.optional(),
  preferredCurrency: currencySchema.optional(),
});
export type SignupInput = z.infer<typeof signupSchema>;

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
export type LoginInput = z.infer<typeof loginSchema>;
