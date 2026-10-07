import { Router } from 'express';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '../../lib/prisma.js';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { forgotPasswordSchema, resetPasswordSchema } from './auth.schemas.js';

/** Almacén en memoria de tokens de recuperación (email → hash + vencimiento). */
const resetTokens = new Map<string, { tokenHash: string; expiresAt: number }>();
const TTL_MS = 30 * 60 * 1000; // 30 minutos

/** Envía el correo con Resend si hay API key; devuelve false si no se pudo enviar. */
async function sendResetEmail(to: string, subject: string, html: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return false;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM ?? 'NEW START GYM <onboarding@resend.dev>',
      to,
      subject,
      html,
    }),
  });
  return res.ok;
}

/**
 * POST /api/auth/forgot-password
 * Siempre responde genérico (no revela si el email existe).
 * Sin RESEND_API_KEY devuelve devToken para desarrollo y lo imprime en consola.
 */
export const resetPasswordRouter = Router();

resetPasswordRouter.post(
  '/forgot-password',
  asyncHandler(async (req, res) => {
    const parsed = forgotPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Email inválido' });
    }
    const { email } = parsed.data;
    const generic = { message: 'Si el email existe, te enviamos un enlace de recuperación' };

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) {
      return res.json(generic);
    }

    // Limpiar vencidos y crear el token nuevo
    const now = Date.now();
    for (const [k, v] of resetTokens) {
      if (v.expiresAt < now) resetTokens.delete(k);
    }

    const token = crypto.randomBytes(24).toString('hex');
    resetTokens.set(email, { tokenHash: bcrypt.hashSync(token, 8), expiresAt: now + TTL_MS });

    const base = process.env.CLIENT_URL ?? 'http://localhost:5173';
    const resetUrl = `${base}/reset-password?token=${token}`;
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto">
        <h2 style="color:#D4AF37">NEW START GYM</h2>
        <p>Hola ${user.name},</p>
        <p>Recibimos un pedido para restablecer tu contraseña. Hacé clic en el botón:</p>
        <p>
          <a href="${resetUrl}"
             style="background:#D4AF37;color:#0A0A0A;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block">
            Restablecer contraseña
          </a>
        </p>
        <p style="color:#888;font-size:12px">El enlace vence en 30 minutos. Si no fuiste vos, ignorá este correo.</p>
      </div>
    `;

    const sent = await sendResetEmail(email, 'Recuperación de contraseña — NEW START GYM', html);

    if (!sent) {
      // Modo desarrollo: el token va a la consola del server y en la respuesta
      console.log(`[reset] (sin RESEND_API_KEY) Token para ${email}: ${token}`);
      return res.json({ ...generic, devToken: token });
    }

    return res.json(generic);
  })
);

/**
 * POST /api/auth/reset-password
 * Consume el token y actualiza la contraseña.
 */
resetPasswordRouter.post(
  '/reset-password',
  asyncHandler(async (req, res) => {
    const parsed = resetPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos' });
    }
    const { token, password } = parsed.data;

    let email: string | null = null;
    for (const [e, entry] of resetTokens) {
      if (entry.expiresAt > Date.now() && bcrypt.compareSync(token, entry.tokenHash)) {
        email = e;
        break;
      }
    }

    if (!email) {
      return res.status(400).json({ error: 'Token inválido o expirado. Pedí uno nuevo.' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.user.update({ where: { email }, data: { passwordHash } });
    resetTokens.delete(email);

    return res.json({ message: 'Contraseña actualizada. Ya podés iniciar sesión.' });
  })
);
