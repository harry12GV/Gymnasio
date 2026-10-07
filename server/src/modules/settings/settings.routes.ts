import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { requireAuth, requireRoles } from '../../middleware/auth.js';

export const settingsRouter = Router();

const updateSettingsSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  address: z.string().max(200).optional().nullable(),
  phone: z.string().max(30).optional().nullable(),
  email: z.string().email().optional().nullable(),
  openingHours: z.record(z.string()).optional(),
  dayPassMode: z.enum(['NATURAL_DAY', 'HOURS_24']).optional(),
});

settingsRouter.use(requireAuth, requireRoles('SUPER_ADMIN', 'RECEPTION'));

/**
 * GET /api/settings
 * Configuración del gimnasio (horarios, contacto, modo de pase diario).
 */
settingsRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    let settings = await prisma.gymSettings.findUnique({ where: { id: 'main' } });
    if (!settings) {
      settings = await prisma.gymSettings.create({ data: { id: 'main' } });
    }
    return res.json({ settings });
  })
);

/**
 * PATCH /api/settings  (solo Super Admin)
 */
settingsRouter.patch(
  '/',
  requireRoles('SUPER_ADMIN'),
  asyncHandler(async (req, res) => {
    const parsed = updateSettingsSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos' });
    }

    await prisma.gymSettings.upsert({
      where: { id: 'main' },
      update: parsed.data,
      create: { id: 'main', ...parsed.data },
    });

    const settings = await prisma.gymSettings.findUnique({ where: { id: 'main' } });
    return res.json({ settings });
  })
);
