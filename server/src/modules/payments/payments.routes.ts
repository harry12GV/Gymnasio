import { Router } from 'express';
import {
  PaymentCategory,
  PlanType,
  Prisma,
  type Payment,
  type Member,
  type Plan,
} from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { requireAuth, requireRoles } from '../../middleware/auth.js';
import { calcEndDate, refreshExpiredMemberships } from '../memberships/membership.utils.js';
import {
  createPaymentSchema,
  dailyReportQuerySchema,
  quickSaleSchema,
} from './payments.schemas.js';

export const paymentsRouter = Router();

paymentsRouter.use(requireAuth, requireRoles('SUPER_ADMIN', 'RECEPTION'));

function nextReceiptCode(): string {
  const year = new Date().getFullYear();
  const rand = Math.floor(Math.random() * 1_000_000).toString().padStart(6, '0');
  return `NS-${year}-${rand}`;
}

/**
 * GET /api/payments/daily?date=YYYY-MM-DD
 * Reporte de caja del día: total, desglose por método y por categoría, y listado.
 */
paymentsRouter.get(
  '/daily',
  asyncHandler(async (req, res) => {
    const q = dailyReportQuerySchema.parse(req.query);
    const dateStr = q.date ?? new Date().toISOString().slice(0, 10);
    const start = new Date(`${dateStr}T00:00:00.000`);
    const end = new Date(`${dateStr}T23:59:59.999`);

    const payments = await prisma.payment.findMany({
      where: { createdAt: { gte: start, lte: end } },
      orderBy: { createdAt: 'desc' },
      include: {
        member: { select: { firstName: true, lastName: true, documentId: true } },
      },
    });

    const byMethod: Record<string, number> = {
      CASH: 0,
      TRANSFER: 0,
      CARD: 0,
      DIGITAL_WALLET: 0,
    };
    const byCategory: Record<string, number> = {
      MEMBERSHIP: 0,
      DAY_PASS: 0,
      OTHER: 0,
    };
    let total = 0;
    for (const p of payments) {
      const amount = Number(p.amount);
      total += amount;
      byMethod[p.method] = (byMethod[p.method] ?? 0) + amount;
      byCategory[p.category] = (byCategory[p.category] ?? 0) + amount;
    }

    return res.json({ date: dateStr, total, byMethod, byCategory, payments });
  })
);

/**
 * GET /api/payments/member/:memberId
 * Historial de pagos de un socio.
 */
paymentsRouter.get(
  '/member/:memberId',
  asyncHandler(async (req, res) => {
    const payments = await prisma.payment.findMany({
      where: { memberId: req.params.memberId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return res.json({ payments });
  })
);

/**
 * POST /api/payments
 * Registro manual de un pago (ajustes, productos, cueltas sueltas).
 */
paymentsRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const parsed = createPaymentSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos' });
    }
    const input = parsed.data;

    const member = await prisma.member.findUnique({ where: { id: input.memberId } });
    if (!member || !member.isActive) {
      return res.status(404).json({ error: 'Socio no encontrado' });
    }

    if (input.membershipId) {
      const membership = await prisma.membership.findUnique({ where: { id: input.membershipId } });
      if (!membership || membership.memberId !== member.id) {
        return res.status(404).json({ error: 'Membresía no encontrada para este socio' });
      }
    }

    const payment = await prisma.payment.create({
      data: {
        receiptCode: nextReceiptCode(),
        memberId: member.id,
        membershipId: input.membershipId ?? null,
        category: input.category ?? PaymentCategory.OTHER,
        method: input.method,
        amount: new Prisma.Decimal(input.amount),
        notes: input.notes ?? null,
      },
    });

    return res.status(201).json({ payment });
  })
);

/**
 * POST /api/payments/quick-sale
 * VENTA RÁPIDA de Pase Diario: datos mínimos + cobro + QR al instante.
 * Requiere acceptTerms=true (exención de responsabilidad).
 */
paymentsRouter.post(
  '/quick-sale',
  asyncHandler(async (req, res) => {
    const parsed = quickSaleSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos' });
    }
    const input = parsed.data;

    if (!input.acceptTerms) {
      return res.status(400).json({
        error: 'Debe aceptar la exención de responsabilidad / Términos y Condiciones',
      });
    }

    // Plan: el indicado o el primer DAY_PASS activo
    const plan: Plan | null = input.planId
      ? await prisma.plan.findUnique({ where: { id: input.planId } })
      : await prisma.plan.findFirst({
          where: { type: PlanType.DAY_PASS, isActive: true },
          orderBy: { price: 'asc' },
        });

    if (!plan || !plan.isActive || plan.type !== PlanType.DAY_PASS) {
      return res.status(404).json({ error: 'No hay un plan de Pase Diario activo' });
    }

    const amount = input.amount ?? Number(plan.price);
    if (amount !== Number(plan.price)) {
      return res.status(400).json({ error: `El monto no coincide con el precio del pase (${plan.price})` });
    }

    // Socio existente por DNI o creación al vuelo
    let member: Member | null = await prisma.member.findUnique({ where: { documentId: input.documentId } });
    if (!member) {
      member = await prisma.member.create({
        data: {
          firstName: input.firstName.trim(),
          lastName: input.lastName?.trim() ?? '',
          documentId: input.documentId.trim(),
          phone: input.phone.trim(),
        },
      });
    } else if (!member.isActive) {
      member = await prisma.member.update({ where: { id: member.id }, data: { isActive: true } });
    }

    const settings = await prisma.gymSettings.findUnique({ where: { id: 'main' } });
    const startDate = new Date();
    const endDate = calcEndDate(
      { type: plan.type, durationDays: plan.durationDays },
      settings ?? { dayPassMode: 'NATURAL_DAY' },
      startDate
    );

    const result = await prisma.$transaction(async (tx) => {
      const membership = await tx.membership.create({
        data: {
          memberId: member.id,
          planId: plan.id,
          status: 'ACTIVE',
          startDate,
          endDate,
          notes: input.notes ?? 'Venta rápida',
        },
      });

      const payment = await tx.payment.create({
        data: {
          receiptCode: nextReceiptCode(),
          memberId: member.id,
          membershipId: membership.id,
          category: PaymentCategory.DAY_PASS,
          method: input.method,
          amount: new Prisma.Decimal(amount),
          notes: 'Venta rápida',
        },
      });

      return { membership, payment };
    });

    await refreshExpiredMemberships(prisma);

    return res.status(201).json({
      member: {
        id: member.id,
        firstName: member.firstName,
        lastName: member.lastName,
        documentId: member.documentId,
        qrToken: member.qrToken,
      },
      plan: { id: plan.id, name: plan.name, price: plan.price },
      membership: { id: result.membership.id, endDate: result.membership.endDate },
      payment: result.payment,
    });
  })
);
