import { Router } from 'express';
import { PaymentCategory, PlanType, Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { requireAuth, requireRoles } from '../../middleware/auth.js';
import { calcEndDate, refreshExpiredMemberships } from './membership.utils.js';
import { assignPlanSchema, updateMembershipStatusSchema } from './memberships.schemas.js';

export const membershipsRouter = Router();

membershipsRouter.use(requireAuth, requireRoles('SUPER_ADMIN', 'RECEPTION'));

function nextReceiptCode(): string {
  const year = new Date().getFullYear();
  const rand = Math.floor(Math.random() * 1_000_000).toString().padStart(6, '0');
  return `NS-${year}-${rand}`;
}

/**
 * POST /api/memberships
 * Asigna un plan a un socio (crea membresía + pago si corresponde).
 * - DAY_PASS / TRIAL_DAY: exige acceptTerms=true (exención de responsabilidad).
 * - TRIAL_DAY: NO genera registro de pago (no pasa por caja).
 * - Pase diario vencido sugerirá plan mensual en el check-in (Sprint 4).
 */
membershipsRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const parsed = assignPlanSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos' });
    }
    const input = parsed.data;

    const member = await prisma.member.findUnique({ where: { id: req.body.memberId } });
    if (!member || !member.isActive) {
      return res.status(404).json({ error: 'Socio no encontrado' });
    }

    const plan = await prisma.plan.findUnique({ where: { id: input.planId } });
    if (!plan || !plan.isActive) {
      return res.status(404).json({ error: 'Plan no encontrado o inactivo' });
    }

    // Términos y condiciones obligatorios para pases diarios y días de prueba
    if ((plan.type === PlanType.DAY_PASS || plan.type === PlanType.TRIAL_DAY) && input.acceptTerms !== true) {
      return res.status(400).json({
        error: 'Debe aceptar la exención de responsabilidad / Términos y Condiciones',
      });
    }

    // Precio: el pago debe coincidir con el precio del plan (si se envía payment)
    if (input.payment && Number(input.payment.amount) !== Number(plan.price)) {
      return res.status(400).json({
        error: `El monto no coincide con el precio del plan (${plan.price})`,
      });
    }

    const settings = await prisma.gymSettings.findUnique({ where: { id: 'main' } });
    const startDate = input.startDate ? new Date(input.startDate) : new Date();
    const endDate = calcEndDate(
      { type: plan.type, durationDays: plan.durationDays },
      settings ?? { dayPassMode: 'NATURAL_DAY' },
      startDate
    );

    const isTrial = plan.type === PlanType.TRIAL_DAY;
    const hasPayment = !isTrial && !!input.payment && Number(input.payment.amount) > 0;

    const membership = await prisma.$transaction(async (tx) => {
      // Si el socio tiene una membresía activa de tipo TIME, se cancela al renovar
      await tx.membership.updateMany({
        where: { memberId: member.id, status: 'ACTIVE', plan: { type: PlanType.TIME } },
        data: { status: 'CANCELLED', notes: 'Reemplazada por nueva membresía' },
      });

      const created = await tx.membership.create({
        data: {
          memberId: member.id,
          planId: plan.id,
          status: 'ACTIVE',
          startDate,
          endDate,
          notes: input.notes ?? null,
        },
      });

      if (hasPayment) {
        await tx.payment.create({
          data: {
            receiptCode: nextReceiptCode(),
            memberId: member.id,
            membershipId: created.id,
            category:
              plan.type === PlanType.DAY_PASS ? PaymentCategory.DAY_PASS : PaymentCategory.MEMBERSHIP,
            method: input.payment!.method,
            amount: new Prisma.Decimal(input.payment!.amount),
            notes: input.payment!.notes ?? null,
          },
        });
      }

      return created;
    });

    const full = await prisma.membership.findUnique({
      where: { id: membership.id },
      include: { plan: true },
    });

    return res.status(201).json({ membership: full });
  })
);

/**
 * GET /api/memberships/member/:memberId
 * Historial de membresías de un socio.
 */
membershipsRouter.get(
  '/member/:memberId',
  asyncHandler(async (req, res) => {
    await refreshExpiredMemberships(prisma);
    const memberships = await prisma.membership.findMany({
      where: { memberId: req.params.memberId },
      orderBy: { startDate: 'desc' },
      include: { plan: true },
    });
    return res.json({ memberships });
  })
);

/**
 * PATCH /api/memberships/:id/status
 * Cambia el estado de una membresía (suspender / reactivar / cancelar).
 */
membershipsRouter.patch(
  '/:id/status',
  asyncHandler(async (req, res) => {
    const parsed = updateMembershipStatusSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos' });
    }

    const existing = await prisma.membership.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      return res.status(404).json({ error: 'Membresía no encontrada' });
    }

    const membership = await prisma.membership.update({
      where: { id: req.params.id },
      data: {
        status: parsed.data.status,
        notes: parsed.data.notes ?? existing.notes,
      },
      include: { plan: true },
    });

    return res.json({ membership });
  })
);
