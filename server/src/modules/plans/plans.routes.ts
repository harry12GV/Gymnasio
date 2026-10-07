import { Router } from 'express';
import { prisma } from '../../lib/prisma.js';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { requireAuth, requireRoles } from '../../middleware/auth.js';
import { createPlanSchema, updatePlanSchema } from './plans.schemas.js';

export const plansRouter = Router();

plansRouter.use(requireAuth, requireRoles('SUPER_ADMIN', 'RECEPTION'));

/**
 * GET /api/plans
 * Lista de planes. ?includeInactive=true para ver también los desactivados.
 */
plansRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const includeInactive = req.query.includeInactive === 'true';
    const plans = await prisma.plan.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: [{ type: 'asc' }, { price: 'asc' }],
    });
    return res.json({ plans });
  })
);

/**
 * POST /api/plans  (solo Super Admin)
 */
plansRouter.post(
  '/',
  requireRoles('SUPER_ADMIN'),
  asyncHandler(async (req, res) => {
    const parsed = createPlanSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos' });
    }

    const { durationDays, ...rest } = parsed.data;
    if (rest.type === 'TIME' && (!durationDays || durationDays < 1)) {
      return res.status(400).json({ error: 'Los planes por tiempo requieren duración en días' });
    }

    const plan = await prisma.plan.create({
      data: { ...rest, durationDays: durationDays ?? null },
    });
    return res.status(201).json({ plan });
  })
);

/**
 * PATCH /api/plans/:id  (solo Super Admin)
 */
plansRouter.patch(
  '/:id',
  requireRoles('SUPER_ADMIN'),
  asyncHandler(async (req, res) => {
    const parsed = updatePlanSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos' });
    }

    const existing = await prisma.plan.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      return res.status(404).json({ error: 'Plan no encontrado' });
    }

    const { durationDays, ...rest } = parsed.data;
    const plan = await prisma.plan.update({
      where: { id: req.params.id },
      // undefined = no tocar el campo; null explícito = limpiar
      data: { ...rest, durationDays: durationDays === undefined ? undefined : durationDays },
    });
    return res.json({ plan });
  })
);
