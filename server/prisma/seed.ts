/**
 * Seed inicial de NEW START GYM:
 * - Super Admin (dueño) y Recepción
 * - Socio demo con cuenta para el portal
 * - Planes base y configuración del gimnasio
 */
import { PrismaClient, PlanType, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('CambiaEsto123!', 12);

  // Usuarios
  const users = [
    { email: 'admin@newstartgym.com', name: 'Super Admin', role: Role.SUPER_ADMIN },
    { email: 'recepcion@newstartgym.com', name: 'Recepción NEW START', role: Role.RECEPTION },
  ];
  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: { role: u.role },
      create: { ...u, passwordHash },
    });
  }
  console.log('✔ Staff: admin@ + recepcion@ (contraseña CambiaEsto123!)');

  // Socio demo con cuenta para el portal
  const demoMember = await prisma.member.upsert({
    where: { documentId: '30000001' },
    update: {},
    create: {
      firstName: 'Demo',
      lastName: 'Socio',
      documentId: '30000001',
      phone: '1155550001',
      email: 'socio@newstartgym.com',
      emergencyContactName: 'Contacto Demo',
      emergencyContactPhone: '1155550002',
    },
  });
  await prisma.user.upsert({
    where: { email: 'socio@newstartgym.com' },
    update: {},
    create: {
      email: 'socio@newstartgym.com',
      passwordHash,
      name: 'Demo Socio',
      role: Role.MEMBER,
      member: { connect: { id: demoMember.id } },
    },
  });
  console.log('✔ Socio demo: socio@newstartgym.com (portal del socio)');

  // Planes base (precios en bolivianos — Bs)
  const plans = [
    { name: 'Mensual', type: PlanType.TIME, price: 120, durationDays: 30 },
    { name: 'Semestral', type: PlanType.TIME, price: 740, durationDays: 180 },
    { name: 'Anual', type: PlanType.TIME, price: 1480, durationDays: 0 + 365 },
    { name: 'Pase Diario', type: PlanType.DAY_PASS, price: 15, durationDays: null },
    { name: 'Día de Prueba', type: PlanType.TRIAL_DAY, price: 0, durationDays: null },
  ];
  for (const plan of plans) {
    const existing = await prisma.plan.findFirst({ where: { name: plan.name, type: plan.type } });
    if (!existing) {
      await prisma.plan.create({ data: plan });
    }
  }
  console.log('✔ Planes con precios sugeridos (editables en la app)');

  // Configuración del gimnasio
  await prisma.gymSettings.upsert({
    where: { id: 'main' },
    update: {},
    create: {
      id: 'main',
      name: 'NEW START GYM',
      address: 'Av. Siempre Viva 742',
      phone: '+54 9 11 5555-0000',
      email: 'info@newstartgym.com',
      dayPassMode: 'NATURAL_DAY',
      openingHours: {
        monday: '06:00-23:00',
        tuesday: '06:00-23:00',
        wednesday: '06:00-23:00',
        thursday: '06:00-23:00',
        friday: '06:00-23:00',
        saturday: '08:00-20:00',
        sunday: '09:00-14:00',
      },
    },
  });
  console.log('✔ Configuración del gimnasio');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
