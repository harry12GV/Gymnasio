import jwt from 'jsonwebtoken';
import type { Role } from '@prisma/client';
import type { JwtPayload } from '../types/express.d.js';

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-me';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? '7d';

export function signToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  } as jwt.SignOptions);
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

export type { Role, JwtPayload };
