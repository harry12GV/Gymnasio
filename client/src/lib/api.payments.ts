import { api } from '@/lib/api';
import type { Payment } from '@/types';

export interface DailyReport {
  date: string;
  total: number;
  byMethod: Record<string, number>;
  byCategory: Record<string, number>;
  payments: (Payment & { member: { firstName: string; lastName: string; documentId: string } })[];
}

export interface QuickSaleResult {
  member: {
    id: string;
    firstName: string;
    lastName: string;
    documentId: string;
    qrToken: string;
  };
  plan: { id: string; name: string; price: string };
  membership: { id: string; endDate: string };
  payment: Payment;
}

export interface QuickSaleInput {
  firstName: string;
  lastName?: string;
  documentId: string;
  phone: string;
  method: 'CASH' | 'TRANSFER' | 'CARD' | 'DIGITAL_WALLET';
  acceptTerms: true;
  amount?: number;
  notes?: string | null;
}

export const paymentsApi = {
  daily: (date?: string) =>
    api<DailyReport>(`/payments/daily${date ? `?date=${date}` : ''}`),

  memberHistory: (memberId: string) =>
    api<{ payments: Payment[] }>(`/payments/member/${memberId}`),

  create: (body: {
    memberId: string;
    method: string;
    amount: number;
    category?: 'MEMBERSHIP' | 'DAY_PASS' | 'OTHER';
    notes?: string | null;
  }) => api<{ payment: Payment }>('/payments', { method: 'POST', body: JSON.stringify(body) }),

  quickSale: (body: QuickSaleInput) =>
    api<QuickSaleResult>('/payments/quick-sale', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
};
