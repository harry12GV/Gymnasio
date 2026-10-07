import { z } from 'zod';

/** Fecha acepta ISO string o yyyy-mm-dd y se convierte a Date | null */
const optionalDate = z
  .string()
  .optional()
  .nullable()
  .transform((v) => (v ? new Date(v) : null))
  .refine((v) => v === null || !Number.isNaN(v.getTime()), 'Fecha inválida');

export const createMemberSchema = z.object({
  firstName: z.string().min(2, 'Nombre requerido').max(60),
  lastName: z.string().min(2, 'Apellido requerido').max(60),
  documentId: z.string().min(5, 'DNI/cédula requerido').max(30),
  phone: z.string().min(6, 'Teléfono requerido').max(30),
  email: z.string().email('Email inválido').optional().nullable().or(z.literal('')),
  photoUrl: z.string().max(2_000_000).optional().nullable(), // data URL para foto base64
  birthDate: optionalDate,
  emergencyContactName: z.string().max(120).optional().nullable(),
  emergencyContactPhone: z.string().max(30).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export const updateMemberSchema = createMemberSchema.partial();

export const listMembersQuerySchema = z.object({
  search: z.string().max(100).optional(),
  status: z.enum(['ALL', 'ACTIVE', 'EXPIRED', 'SUSPENDED', 'CANCELLED', 'NO_MEMBERSHIP']).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});

export type CreateMemberInput = z.infer<typeof createMemberSchema>;
export type UpdateMemberInput = z.infer<typeof updateMemberSchema>;
