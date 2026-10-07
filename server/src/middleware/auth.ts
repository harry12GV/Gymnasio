import type { NextFunction, Request, Response } from 'express';
import { verifyToken } from '../lib/jwt.js';
import type { Role } from '@prisma/client';

/**
 * Middleware de autenticación: valida el header Authorization: Bearer <token>
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token no proporcionado' });
  }

  const payload = verifyToken(header.slice(7));
  if (!payload) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }

  req.user = payload;
  next();
}

/**
 * Middleware de autorización por roles.
 * Uso: router.get('/admin-only', requireAuth, requireRoles('SUPER_ADMIN'), handler)
 */
export function requireRoles(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'No tienes permisos para esta acción' });
    }
    next();
  };
}
