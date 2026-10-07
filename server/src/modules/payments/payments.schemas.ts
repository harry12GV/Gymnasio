import { z } from 'zod';

export const createPaymentSchema = z.object({
  memberId: z.string().min(1, 'Socio requerido'),
  method: z.enum(['CASH', 'TRANSFER', 'CARD', 'DIGITAL_WALLET']),
  amount: z.coerce.number().min(0.01, 'El monto debe ser mayor a 0'),
  category: z.enum(['MEMBERSHIP', 'DAY_PASS', 'OTHER']).optional(),
  membershipId: z.string().optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});

/**
 * Venta Rápida de Pase Diario:
 * pide datos mínimos (nombre, DNI, teléfono), método de pago y aceptación de T&C.
 * Si el DNI ya existe, reutiliza el socio; si no, lo crea al vuelo.
 */
export const quickSaleSchema = z.object({
  firstName: z.string().min(2, 'Nombre requerido').max(60),
  lastName: z.string().max(60).optional(),
  documentId: z.string().min(5, 'DNI/cédula requerido').max(30),
  phone: z.string().min(6, 'Teléfono requerido').max(30),
  method: z.enum(['CASH', 'TRANSFER', 'CARD', 'DIGITAL_WALLET']),
  planId: z.string().optional(), // por defecto: primer plan DAY_PASS activo
  amount: z.coerce.number().min(0).optional(), // por defecto: precio del plan
  acceptTerms: z.boolean(),
  notes: z.string().max(500).optional().nullable(),
});

export const dailyReportQuerySchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida (formato YYYY-MM-DD)')
    .optional(),
});
