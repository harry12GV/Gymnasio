import swaggerJsdoc from 'swagger-jsdoc';

const spec = swaggerJsdoc({
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'NEW START GYM API',
      version: '0.1.0',
      description:
        'API del Sistema Web de Gestión Integral para NEW START GYM — Fase 1 (MVP). ' +
        'Módulos: autenticación y roles, socios, membresías y pases, caja y venta rápida, ' +
        'check-in con QR, portal del socio y dashboard.',
      contact: { name: 'NEW START GYM' },
    },
    servers: [
      {
        url: '/api',
        description: 'API base',
      },
    ],
    tags: [
      { name: 'Auth', description: 'Autenticación y sesión' },
      { name: 'Members', description: 'Gestión de socios' },
      { name: 'Plans', description: 'Planes y membresías' },
      { name: 'Payments', description: 'Caja, pagos y venta rápida' },
      { name: 'CheckIn', description: 'Control de acceso con QR' },
      { name: 'Dashboard', description: 'Métricas del administrador' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./src/modules/**/*.routes.ts'],
});

export default spec;
