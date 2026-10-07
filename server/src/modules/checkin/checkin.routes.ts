import { Router } from 'express';
import { PlanType } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { requireAuth, requireRoles } from '../../middleware/auth.js';
import { refreshExpiredMemberships } from '../memberships/membership.utils.js';
import { z } from 'zod';

export const checkinRouter = Router();

checkinRouter.use(requireAuth, requireRoles('SUPER_ADMIN', 'RECEPTION'));

const checkinSchema = z.object({ qrToken: z.string().min(6, 'QR inválido') });
const exitSchema = z.object({ checkInId: z.string().min(1) });

/**
 * POST /api/checkin
 * Valida el QR del socio y registra el ingreso.
 *
 * Lógica del prompt:
 * - Plan mensual activo / pase diario vigente → ✅ ALLOWED
 * - Pase diario vencido → ⛔ DENIED + "Pase diario vencido. Sugerir plan mensual"
 * - Membresía vencida/suspendida/cancelada → ⛔ DENIED con motivo
 * - Si tiene un ingreso abierto, registra salida (toggle).
 */
checkinRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const parsed = checkinSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos' });
    }

    await refreshExpiredMemberships(prisma);

    const member = await prisma.member.findUnique({
      where: { qrToken: parsed.data.qrToken },
      include: {
        memberships: {
          where: { status: { in: ['ACTIVE', 'SUSPENDED', 'EXPIRED'] } },
          orderBy: { endDate: 'desc' },
          take: 1,
          include: { plan: true },
        },
        checkIns: { where: { exitAt: null, result: 'ALLOWED' }, orderBy: { entryAt: 'desc' }, take: 1 },
      },
    });

    if (!member || !member.isActive) {
      return res.status(404).json({
        result: 'DENIED',
        status: 'NOT_FOUND',
        message: 'QR no reconocido. Verificá el código o registrá al socio.',
      });
    }

    const membership = member.memberships[0];

    // Salida: si hay ingreso abierto, se cierra (toggle entrada/salida)
    const open = member.checkIns[0];
    if (open) {
      await prisma.checkIn.update({
        where: { id: open.id },
        data: { exitAt: new Date() },
      });
      return res.json({
        result: 'EXIT',
        member: { id: member.id, firstName: member.firstName, lastName: member.lastName, photoUrl: member.photoUrl, planName: membership?.plan.name ?? null },
        message: 'Salida registrada. ¡Buen entreno!',
      });
    }

    if (!membership) {
      await prisma.checkIn.create({
        data: { memberId: member.id, result: 'DENIED', notes: 'Sin membresía' },
      });
      return res.json({
        result: 'DENIED',
        status: 'NO_MEMBERSHIP',
        member: { id: member.id, firstName: member.firstName, lastName: member.lastName, photoUrl: member.photoUrl },
        message: 'Socio sin membresía activa. Ofrecer planes.',
      });
    }

    const now = new Date();
    const isDayPass = membership.plan.type !== PlanType.TIME;

    if (membership.status === 'SUSPENDED') {
      await prisma.checkIn.create({
        data: { memberId: member.id, result: 'DENIED', notes: 'Membresía suspendida' },
      });
      return res.json({
        result: 'DENIED',
        status: 'SUSPENDED',
        member: { id: member.id, firstName: member.firstName, lastName: member.lastName, photoUrl: member.photoUrl, planName: membership.plan.name },
        message: 'Membresía suspendida. Regularizar en recepción.',
      });
    }

    if (membership.endDate < now) {
      const msg = isDayPass
        ? 'Pase diario vencido. Sugerir plan mensual.'
        : 'Membresía vencida. Ofrecer renovación.';
      await prisma.checkIn.create({
        data: { memberId: member.id, result: 'DENIED', notes: isDayPass ? 'Pase diario vencido' : 'Membresía vencida' },
      });
      return res.json({
        result: 'DENIED',
        status: 'EXPIRED',
        member: { id: member.id, firstName: member.firstName, lastName: member.lastName, photoUrl: member.photoUrl, planName: membership.plan.name },
        message: msg,
      });
    }

    // ✅ Acceso permitido
    const checkIn = await prisma.checkIn.create({
      data: { memberId: member.id, result: 'ALLOWED' },
    });

    return res.json({
      result: 'ALLOWED',
      checkInId: checkIn.id,
      member: {
        id: member.id,
        firstName: member.firstName,
        lastName: member.lastName,
        photoUrl: member.photoUrl,
        planName: membership.plan.name,
      },
      membershipEnd: membership.endDate,
      message: 'Acceso permitido',
    });
  })
);

/**
 * POST /api/checkin/exit
 * Registro manual de salida.
 */
checkinRouter.post(
  '/exit',
  asyncHandler(async (req, res) => {
    const parsed = exitSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Datos inválidos' });
    }
    const existing = await prisma.checkIn.findUnique({ where: { id: parsed.data.checkInId } });
    if (!existing || existing.exitAt) {
      return res.status(404).json({ error: 'Ingreso no encontrado o ya cerrado' });
    }
    await prisma.checkIn.update({
      where: { id: parsed.data.checkInId },
      data: { exitAt: new Date() },
    });
    return res.json({ message: 'Salida registrada' });
  })
);

/**
 * GET /api/checkin/today
 * Ingresos del día para el panel de recepción.
 */
checkinRouter.get(
  '/today',
  asyncHandler(async (_req, res) => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const checkIns = await prisma.checkIn.findMany({
      where: { entryAt: { gte: start, lte: end } },
      orderBy: { entryAt: 'desc' },
      include: {
        member: { select: { firstName: true, lastName: true, documentId: true, photoUrl: true } },
      },
    });

    return res.json({
      count: checkIns.filter((c) => c.result === 'ALLOWED').length,
      inside: checkIns.filter((c) => c.result === 'ALLOWED' && !c.exitAt).length,
      denied: checkIns.filter((c) => c.result === 'DENIED').length,
      checkIns,
    });
  })
);
