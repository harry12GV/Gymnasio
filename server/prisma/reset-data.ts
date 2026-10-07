/**
 * Reset de datos operativos: borra check-ins, pagos, membresías y socios.
 * Conserva: usuarios (login), planes y configuración del gimnasio.
 *
 * Uso: npm run db:reset-data -w server   (o: tsx prisma/reset-data.ts)
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Orden: primero los que dependen de miembros/membresías
  const checkIns = await prisma.checkIn.deleteMany({});
  const payments = await prisma.payment.deleteMany({});
  const memberships = await prisma.membership.deleteMany({});
  const members = await prisma.member.deleteMany({});

  console.log(
    `✔ Datos borrados: ${checkIns.count} check-ins, ${payments.count} pagos, ${memberships.count} membresías, ${members.count} socios`
  );
  console.log('✔ Se conservaron: usuarios, planes y configuración del gimnasio');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
