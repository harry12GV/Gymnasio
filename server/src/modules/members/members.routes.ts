import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { prisma } from '../../lib/prisma.js';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { requireAuth, requireRoles } from '../../middleware/auth.js';
import { refreshExpiredMemberships } from '../memberships/membership.utils.js';
import {
  createMemberSchema,
  updateMemberSchema,
  listMembersQuerySchema,
} from './members.schemas.js';

export const membersRouter = Router();

// Todas las rutas de socios son para staff (Super Admin y Recepción)
membersRouter.use(requireAuth, requireRoles('SUPER_ADMIN', 'RECEPTION'));

/**
 * GET /api/members
 * Lista socios con búsqueda, filtro por estado de membresía y paginación.
 */
membersRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const q = listMembersQuerySchema.parse(req.query);
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 20;
    const search = q.search?.trim();

    await refreshExpiredMemberships(prisma);

    const where = {
      isActive: true,
      ...(search
        ? {
            OR: [
              { firstName: { contains: search, mode: 'insensitive' as const } },
              { lastName: { contains: search, mode: 'insensitive' as const } },
              { documentId: { contains: search } },
              { phone: { contains: search } },
            ],
          }
        : {}),
    };

    const [total, members] = await Promise.all([
      prisma.member.count({ where }),
      prisma.member.findMany({
        where,
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          memberships: {
            orderBy: { startDate: 'desc' },
            take: 1,
            include: { plan: true },
          },
        },
      }),
    ]);

    const data = members.map((m) => {
      const current = m.memberships[0];
      return {
        id: m.id,
        firstName: m.firstName,
        lastName: m.lastName,
        documentId: m.documentId,
        phone: m.phone,
        email: m.email,
        photoUrl: m.photoUrl,
        qrToken: m.qrToken,
        createdAt: m.createdAt,
        currentStatus: current?.status ?? 'NO_MEMBERSHIP',
        membershipEnd: current?.endDate ?? null,
        planName: current?.plan.name ?? null,
      };
    });

    // Filtro por estado (post-calculo porque depende de la membresía más reciente)
    const filtered = q.status && q.status !== 'ALL' ? data.filter((d) => d.currentStatus === q.status) : data;

    return res.json({ data: filtered, total, page, pageSize });
  })
);

/**
 * GET /api/members/:id
 * Detalle completo del socio con historial de membresías, pagos y check-ins.
 */
membersRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    await refreshExpiredMemberships(prisma);

    const member = await prisma.member.findUnique({
      where: { id: req.params.id },
      include: {
        memberships: { orderBy: { startDate: 'desc' }, include: { plan: true } },
        payments: { orderBy: { createdAt: 'desc' }, take: 50 },
        checkIns: { orderBy: { entryAt: 'desc' }, take: 50 },
      },
    });

    if (!member || !member.isActive) {
      return res.status(404).json({ error: 'Socio no encontrado' });
    }

    return res.json({ member });
  })
);

/**
 * POST /api/members
 * Registra un nuevo socio.
 */
membersRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const parsed = createMemberSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos' });
    }

    const data = parsed.data;
    const dup = await prisma.member.findUnique({ where: { documentId: data.documentId } });
    if (dup) {
      return res.status(409).json({ error: 'Ya existe un socio con ese DNI/cédula' });
    }

    const member = await prisma.member.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        documentId: data.documentId,
        phone: data.phone,
        email: data.email || null,
        photoUrl: data.photoUrl ?? null,
        birthDate: data.birthDate ?? null,
        emergencyContactName: data.emergencyContactName ?? null,
        emergencyContactPhone: data.emergencyContactPhone ?? null,
        notes: data.notes ?? null,
      },
    });

    return res.status(201).json({ member });
  })
);

/**
 * PATCH /api/members/:id
 * Edita los datos de un socio.
 */
membersRouter.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const parsed = updateMemberSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos' });
    }

    const existing = await prisma.member.findUnique({ where: { id: req.params.id } });
    if (!existing || !existing.isActive) {
      return res.status(404).json({ error: 'Socio no encontrado' });
    }

    const data = parsed.data;
    if (data.email === '') data.email = null;

    const member = await prisma.member.update({
      where: { id: req.params.id },
      data: {
        ...data,
        birthDate: data.birthDate ?? undefined,
      },
    });

    return res.json({ member });
  })
);

/**
 * POST /api/members/:id/regenerate-qr
 * Genera un nuevo qrToken para el socio (invalida el anterior).
 * Útil si la credencial se perdió o fue compartida.
 */
membersRouter.post(
  '/:id/regenerate-qr',
  asyncHandler(async (req, res) => {
    const existing = await prisma.member.findUnique({ where: { id: req.params.id } });
    if (!existing || !existing.isActive) {
      return res.status(404).json({ error: 'Socio no encontrado' });
    }

    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const member = await prisma.member.update({
          where: { id: req.params.id },
          data: { qrToken: randomUUID() },
        });
        return res.json({ member });
      } catch {
        // colisión de qrToken (improbable): reintentar
      }
    }
    return res.status(500).json({ error: 'No se pudo regenerar el QR' });
  })
);

/**
 * DELETE /api/members/:id
 * Baja lógica del socio.
 */
membersRouter.delete(
  '/:id',
  requireRoles('SUPER_ADMIN'),
  asyncHandler(async (req, res) => {
    const existing = await prisma.member.findUnique({ where: { id: req.params.id } });
    if (!existing || !existing.isActive) {
      return res.status(404).json({ error: 'Socio no encontrado' });
    }

    await prisma.member.update({ where: { id: req.params.id }, data: { isActive: false } });
    return res.json({ message: 'Socio dado de baja' });
  })
);
