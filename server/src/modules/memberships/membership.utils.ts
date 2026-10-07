import { DayPassMode, PlanType, type GymSettings, type PrismaClient } from '@prisma/client';

/**
 * Calcula la fecha de vencimiento (endDate) de una membresía según el plan.
 *
 * - Planes por tiempo: startDate + durationDays.
 * - Pase Diario / Día de Prueba con modo NATURAL_DAY: fin del día natural (23:59:59.999).
 * - Pase Diario con modo HOURS_24: startDate + 24 horas exactas.
 */
export function calcEndDate(
  plan: { type: PlanType; durationDays: number | null },
  settings: Pick<GymSettings, 'dayPassMode'>,
  startDate = new Date()
): Date {
  if (plan.type === PlanType.TIME && plan.durationDays) {
    const end = new Date(startDate);
    end.setDate(end.getDate() + plan.durationDays);
    return end;
  }

  // DAY_PASS o TRIAL_DAY
  if (plan.type === PlanType.DAY_PASS && settings.dayPassMode === DayPassMode.HOURS_24) {
    return new Date(startDate.getTime() + 24 * 60 * 60 * 1000);
  }

  // Día natural: vence a medianoche (23:59:59.999 del día de inicio)
  const end = new Date(startDate);
  end.setHours(23, 59, 59, 999);
  return end;
}

/**
 * Refresca los estados de membresías vencidas: ACTIVE con endDate < ahora → EXPIRED.
 * Se ejecuta al consultar listados y en el check-in para garantizar consistencia.
 */
export async function refreshExpiredMemberships(db: PrismaClient): Promise<void> {
  await db.membership.updateMany({
    where: { status: 'ACTIVE', endDate: { lt: new Date() } },
    data: { status: 'EXPIRED' },
  });
}
