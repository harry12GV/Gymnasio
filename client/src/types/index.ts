export type Role = 'SUPER_ADMIN' | 'RECEPTION' | 'MEMBER';

export type MembershipStatus =
  | 'ACTIVE'
  | 'EXPIRED'
  | 'SUSPENDED'
  | 'CANCELLED'
  | 'NO_MEMBERSHIP';

export type PlanType = 'TIME' | 'DAY_PASS' | 'TRIAL_DAY';

export type PaymentMethod = 'CASH' | 'TRANSFER' | 'CARD' | 'DIGITAL_WALLET';

export interface Plan {
  id: string;
  name: string;
  type: PlanType;
  price: string; // Decimal serializado como string
  durationDays: number | null;
  isActive: boolean;
}

export interface Membership {
  id: string;
  memberId: string;
  planId: string;
  status: Exclude<MembershipStatus, 'NO_MEMBERSHIP'>;
  startDate: string;
  endDate: string;
  notes: string | null;
  plan: Plan;
}

export interface MemberListItem {
  id: string;
  firstName: string;
  lastName: string;
  documentId: string;
  phone: string;
  email: string | null;
  photoUrl: string | null;
  qrToken: string;
  createdAt: string;
  currentStatus: MembershipStatus;
  membershipEnd: string | null;
  planName: string | null;
}

export interface MemberFull {
  id: string;
  firstName: string;
  lastName: string;
  documentId: string;
  phone: string;
  email: string | null;
  photoUrl: string | null;
  birthDate: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  notes: string | null;
  qrToken: string;
  isActive: boolean;
  createdAt: string;
  memberships: Membership[];
  payments: Payment[];
  checkIns: CheckIn[];
}

export interface Payment {
  id: string;
  receiptCode: string;
  memberId: string;
  membershipId: string | null;
  category: 'MEMBERSHIP' | 'DAY_PASS' | 'OTHER';
  method: PaymentMethod;
  amount: string;
  notes: string | null;
  createdAt: string;
}

export interface CheckIn {
  id: string;
  memberId: string;
  entryAt: string;
  exitAt: string | null;
  result: string;
  notes: string | null;
}

export interface GymSettings {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  openingHours: Record<string, string> | null;
  dayPassMode: 'NATURAL_DAY' | 'HOURS_24';
}

export const PLAN_TYPE_LABEL: Record<PlanType, string> = {
  TIME: 'Por tiempo',
  DAY_PASS: 'Pase diario',
  TRIAL_DAY: 'Día de prueba',
};

export const STATUS_LABEL: Record<MembershipStatus, string> = {
  ACTIVE: 'Activo',
  EXPIRED: 'Vencido',
  SUSPENDED: 'Suspendido',
  CANCELLED: 'Cancelado',
  NO_MEMBERSHIP: 'Sin membresía',
};

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  CASH: 'Efectivo',
  TRANSFER: 'Transferencia',
  CARD: 'Tarjeta',
  DIGITAL_WALLET: 'Billetera digital',
};
