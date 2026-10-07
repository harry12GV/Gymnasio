import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { prisma } from '../../lib/prisma.js';
import { signToken } from '../../lib/jwt.js';
import { requireAuth } from '../../middleware/auth.js';
import { changePasswordSchema, loginSchema } from './auth.schemas.js';

export const authRouter = Router();

/**
 * POST /api/auth/login
 * Inicia sesión y devuelve un JWT.
 */
authRouter.post(
  '/login',
  asyncHandler(async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos' });
  }

  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.isActive) {
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }

  const token = signToken({
    sub: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
  });

    return res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    });
  })
);

/**
 * GET /api/auth/me
 * Devuelve el usuario autenticado actual.
 */
authRouter.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.sub },
    select: { id: true, email: true, name: true, role: true, isActive: true, createdAt: true },
  });

  if (!user || !user.isActive) {
    return res.status(401).json({ error: 'Usuario no encontrado o inactivo' });
  }

    return res.json({ user });
  })
);

/**
 * PATCH /api/auth/password
 * Cambio de contraseña autenticado.
 */
authRouter.patch(
  '/password',
  requireAuth,
  asyncHandler(async (req, res) => {
    const parsed = changePasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos' });
    }
    const user = await prisma.user.findUnique({ where: { id: req.user!.sub } });
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    const ok = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
    if (!ok) {
      return res.status(400).json({ error: 'La contraseña actual es incorrecta' });
    }
    const passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
    return res.json({ message: 'Contraseña actualizada' });
  })
);

/**
 * POST /api/auth/logout
 * El cierre de sesión se maneja en el cliente (descarta el token).
 * Este endpoint existe por completitud de la API.
 */
authRouter.post('/logout', (_req, res) => {
  return res.json({ message: 'Sesión cerrada' });
});
