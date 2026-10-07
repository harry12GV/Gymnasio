import { z } from 'zod';

/**
 * Asignar plan a un socio.
 * - acceptTerms es OBLIGATORIO para DAY_PASS y TRIAL_DAY (exención de responsabilidad);
 *   se valida en el servicio contra el tipo de plan.
 * - payment se registra en caja salvo para TRIAL_DAY (no pasa por caja) o amount 0.
 */
export const assignPlanSchema = z.object({
  planId: z.string().min(1, 'Plan requerido'),
  startDate: z.string().datetime().optional(),
  notes: z.string().max(1000).optional().nullable(),
  acceptTerms: z.boolean().optional(),
  payment: z
    .object({
      method: z.enum(['CASH', 'TRANSFER', 'CARD', 'DIGITAL_WALLET']),
      amount: z.coerce.number().min(0),
      notes: z.string().max(500).optional().nullable(),
    })
    .optional(),
});

export const updateMembershipStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'SUSPENDED', 'CANCELLED']),
  notes: z.string().max(1000).optional().nullable(),
});

export type AssignPlanInput = z.infer<typeof assignPlanSchema>;
