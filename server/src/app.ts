import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import spec from './lib/swagger.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { resetPasswordRouter } from './modules/auth/auth.password-reset.js';
import { membersRouter } from './modules/members/members.routes.js';
import { plansRouter } from './modules/plans/plans.routes.js';
import { membershipsRouter } from './modules/memberships/memberships.routes.js';
import { settingsRouter } from './modules/settings/settings.routes.js';
import { paymentsRouter } from './modules/payments/payments.routes.js';
import { checkinRouter } from './modules/checkin/checkin.routes.js';
import { memberPortalRouter } from './modules/portal/portal.routes.js';
import { dashboardRouter } from './modules/dashboard/dashboard.routes.js';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: process.env.CLIENT_URL ?? 'http://localhost:5173',
      credentials: true,
    })
  );
  app.use(express.json({ limit: '10mb' })); // límite ampliado para fotos base64
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

  // Salud
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'new-start-gym-api', phase: '1-mvp' });
  });

  // Documentación API
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(spec, { customSiteTitle: 'NEW START GYM API' }));

  // Rutas
  app.use('/api/auth', authRouter);
  app.use('/api/auth', resetPasswordRouter);
  app.use('/api/members', membersRouter);
  app.use('/api/plans', plansRouter);
  app.use('/api/memberships', membershipsRouter);
  app.use('/api/settings', settingsRouter);
  app.use('/api/payments', paymentsRouter);
  app.use('/api/checkin', checkinRouter);
  app.use('/api/portal', memberPortalRouter);
  app.use('/api/dashboard', dashboardRouter);

  // 404 API
  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'Endpoint no encontrado' });
  });

  // Manejador global de errores
  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err);

    // BD inaccesible (pausada/eliminada/credenciales inválidas): mensaje accionable.
    const msg = String((err as { message?: string })?.message ?? '');
    if (
      err.name === 'PrismaClientInitializationError' ||
      /ENOTFOUND|ECONNREFUSED|ETIMEDOUT|P1001|tenant\/user .* not found/i.test(msg)
    ) {
      return res.status(503).json({
        error: 'Base de datos no disponible. Verificá que el proyecto Supabase esté activo.',
      });
    }

    res.status(500).json({ error: 'Error interno del servidor' });
  });

  return app;
}
