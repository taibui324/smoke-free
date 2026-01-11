import { z } from 'zod';

export const createCravingSchema = z.object({
  intensity: z.number().int().min(1).max(10),
  triggers: z.array(z.string()).min(1).max(20),
  reliefTechniquesUsed: z.array(z.string()).max(20).optional(),
  notes: z.string().max(500).optional(),
});

export const updateCravingSchema = z.object({
  resolved: z.boolean().optional(),
  duration: z.number().int().min(0).max(86400).optional(), // Max 24 hours
  reliefTechniquesUsed: z.array(z.string()).max(20).optional(),
});

export type CreateCravingInput = z.infer<typeof createCravingSchema>;
export type UpdateCravingInput = z.infer<typeof updateCravingSchema>;
