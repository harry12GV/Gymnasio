import { Router } from 'express';
import { prisma } from '../../lib/prisma.js';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { requireAuth, requireRoles } from '../../middleware/auth.js';
import { refreshExpiredMemberships } from '../memberships/membership.utils.js';

export const memberPortalRouter = Router();

memberPortalRouter.use(requireAuth, requireRoles('MEMBER'));

/**
 * GET /api/portal/me
 * Datos del socio autenticado: estado de membresía, pagos propios, QR y datos del gimnasio.
 */
memberPortalRouter.get(
  '/me',
  asyncHandler(async (req, res) => {
    await refreshExpiredMemberships(prisma);

    const user = await prisma.user.findUnique({
      where: { id: req.user!.sub },
      include: { member: true },
    });

    if (!user || !user.isActive || !user.member) {
      return res.status(404).json({ error: 'No se encontró el socio vinculado a esta cuenta' });
    }

    const member = user.member;

    const [memberships, payments, settings, lastCheckIn] = await Promise.all([
      prisma.membership.findMany({
        where: { memberId: member.id },
        orderBy: { startDate: 'desc' },
        take: 5,
        include: { plan: true },
      }),
      prisma.payment.findMany({
        where: { memberId: member.id },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      prisma.gymSettings.findUnique({ where: { id: 'main' } }),
      prisma.checkIn.findFirst({
        where: { memberId: member.id, result: 'ALLOWED' },
        orderBy: { entryAt: 'desc' },
      }),
    ]);

    return res.json({
      profile: {
        id: member.id,
        firstName: member.firstName,
        lastName: member.lastName,
        documentId: member.documentId,
        email: member.email ?? user.email,
        photoUrl: member.photoUrl,
      },
      currentMembership: memberships[0] ?? null,
      memberships,
      payments,
      qrToken: member.qrToken,
      lastVisit: lastCheckIn?.entryAt ?? null,
      gym: {
        name: settings?.name ?? 'NEW START GYM',
        address: settings?.address ?? null,
        phone: settings?.phone ?? null,
        email: settings?.email ?? null,
        openingHours: settings?.openingHours ?? null,
      },
    });
  })
);
