import { z } from 'zod';

export const updateProfileSchema = z.object({
  firstName: z.string().max(100).optional(),
  lastName: z.string().max(100).optional(),
  profilePictureUrl: z.string().url().optional().or(z.literal('')),
});

export const updatePreferencesSchema = z.object({
  notificationsEnabled: z.boolean().optional(),
  dailyCheckInTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Time must be in HH:MM format')
    .optional()
    .or(z.literal('')),
  cravingAlertsEnabled: z.boolean().optional(),
  aiChatbotTone: z.enum(['empathetic', 'motivational', 'direct']).optional(),
  language: z.string().min(2).max(10).optional(),
  theme: z.enum(['light', 'dark', 'auto']).optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type UpdatePreferencesInput = z.infer<typeof updatePreferencesSchema>;
