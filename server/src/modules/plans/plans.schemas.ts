import { z } from 'zod';

export const createPlanSchema = z.object({
  name: z.string().min(2, 'Nombre del plan requerido').max(60),
  type: z.enum(['TIME', 'DAY_PASS', 'TRIAL_DAY']),
  price: z.coerce.number().min(0, 'El precio no puede ser negativo').max(1_000_000),
  durationDays: z.coerce.number().int().min(1).max(3650).optional().nullable(),
  isActive: z.boolean().optional(),
});

export const updatePlanSchema = createPlanSchema.partial();

export type CreatePlanInput = z.infer<typeof createPlanSchema>;
export type UpdatePlanInput = z.infer<typeof updatePlanSchema>;
