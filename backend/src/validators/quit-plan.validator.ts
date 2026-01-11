import { z } from 'zod';

export const createQuitPlanSchema = z.object({
  quitDate: z.string().datetime().or(z.date()),
  cigarettesPerDay: z.number().int().min(1).max(200),
  costPerPack: z.number().positive().max(1000),
  cigarettesPerPack: z.number().int().min(1).max(50).optional(),
  motivations: z.array(z.string()).min(1).max(20),
});

export const updateQuitPlanSchema = z.object({
  quitDate: z.string().datetime().or(z.date()).optional(),
  cigarettesPerDay: z.number().int().min(1).max(200).optional(),
  costPerPack: z.number().positive().max(1000).optional(),
  cigarettesPerPack: z.number().int().min(1).max(50).optional(),
  motivations: z.array(z.string()).min(1).max(20).optional(),
});

export const updateQuitDateSchema = z.object({
  quitDate: z.string().datetime().or(z.date()),
});

export type CreateQuitPlanInput = z.infer<typeof createQuitPlanSchema>;
export type UpdateQuitPlanInput = z.infer<typeof updateQuitPlanSchema>;
export type UpdateQuitDateInput = z.infer<typeof updateQuitDateSchema>;
