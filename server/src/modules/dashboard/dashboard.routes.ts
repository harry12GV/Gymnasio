import { Router } from 'express';
import { PlanType } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { requireAuth, requireRoles } from '../../middleware/auth.js';
import { refreshExpiredMemberships } from '../memberships/membership.utils.js';

export const dashboardRouter = Router();

dashboardRouter.use(requireAuth, requireRoles('SUPER_ADMIN', 'RECEPTION'));

/**
 * GET /api/dashboard/summary
 * Métricas del Sprint 5 según el prompt:
 * - Total activos, vencidos y nuevos del mes
 * - Ingresos del mes separados: mensualidades vs pases diarios
 * - Inscripciones de los últimos 30 días (serie diaria)
 * - Socios con membresía por vencer en los próximos 7 días
 */
dashboardRouter.get(
  '/summary',
  asyncHandler(async (_req, res) => {
    await refreshExpiredMemberships(prisma);

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const days30Ago = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const [
      activeCount,
      expiredCount,
      suspendedCount,
      newThisMonth,
      monthPayments,
      last30CheckIns,
      expiringSoon,
      activeToday,
    ] = await Promise.all([
      prisma.membership.count({ where: { status: 'ACTIVE' } }),
      prisma.member.count({
        where: {
          isActive: true,
          memberships: { none: { status: 'ACTIVE' } },
        },
      }),
      prisma.membership.count({ where: { status: 'SUSPENDED' } }),
      prisma.member.count({ where: { createdAt: { gte: monthStart } } }),
      prisma.payment.findMany({
        where: { createdAt: { gte: monthStart, lt: monthEnd } },
        select: { amount: true, category: true },
      }),
      prisma.member.findMany({
        where: { createdAt: { gte: days30Ago } },
        select: { createdAt: true },
      }),
      prisma.membership.findMany({
        where: {
          status: 'ACTIVE',
          endDate: { gte: now, lte: in7Days },
          plan: { type: PlanType.TIME },
        },
        orderBy: { endDate: 'asc' },
        include: {
          member: { select: { id: true, firstName: true, lastName: true, phone: true, photoUrl: true } },
          plan: { select: { name: true } },
        },
      }),
      prisma.checkIn.count({
        where: { result: 'ALLOWED', entryAt: { gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()) } },
      }),
    ]);

    let membershipRevenue = 0;
    let dayPassRevenue = 0;
    let otherRevenue = 0;
    for (const p of monthPayments) {
      const amount = Number(p.amount);
      if (p.category === 'MEMBERSHIP') membershipRevenue += amount;
      else if (p.category === 'DAY_PASS') dayPassRevenue += amount;
      else otherRevenue += amount;
    }

    // Serie diaria de inscripciones (últimos 30 días)
    const series: { date: string; count: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i + 1);
      const count = last30CheckIns.filter(
        (m) => m.createdAt >= day && m.createdAt < next
      ).length;
      series.push({
        date: `${String(day.getDate()).padStart(2, '0')}/${String(day.getMonth() + 1).padStart(2, '0')}`,
        count,
      });
    }

    return res.json({
      members: {
        active: activeCount,
        expired: expiredCount,
        suspended: suspendedCount,
        newThisMonth,
      },
      revenue: {
        month: membershipRevenue + dayPassRevenue + otherRevenue,
        memberships: membershipRevenue,
        dayPasses: dayPassRevenue,
        other: otherRevenue,
      },
      signups30d: series,
      expiringSoon,
      activeToday,
    });
  })
);
