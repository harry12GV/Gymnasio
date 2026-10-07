import { api } from '@/lib/api';
import type { MemberFull, MemberListItem, Membership, Plan } from '@/types';

export interface ListMembersParams {
  search?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

export const membersApi = {
  list: (params: ListMembersParams = {}) => {
    const qs = new URLSearchParams();
    if (params.search) qs.set('search', params.search);
    if (params.status && params.status !== 'ALL') qs.set('status', params.status);
    if (params.page) qs.set('page', String(params.page));
    if (params.pageSize) qs.set('pageSize', String(params.pageSize));
    const query = qs.toString();
    return api<{ data: MemberListItem[]; total: number; page: number; pageSize: number }>(
      `/members${query ? `?${query}` : ''}`
    );
  },

  get: (id: string) =>
    api<{ member: MemberFull }>(`/members/${id}`),

  create: (body: MemberInput) =>
    api<{ member: { id: string } }>('/members', { method: 'POST', body: JSON.stringify(body) }),

  update: (id: string, body: Partial<MemberInput>) =>
    api<{ member: { id: string } }>(`/members/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  remove: (id: string) => api<{ message: string }>(`/members/${id}`, { method: 'DELETE' }),

  regenerateQr: (id: string) =>
    api<{ member: { id: string; qrToken: string } }>(`/members/${id}/regenerate-qr`, {
      method: 'POST',
    }),
};

export const plansApi = {
  list: () => api<{ plans: Plan[] }>('/plans'),
};

export const membershipsApi = {
  assign: (memberId: string, body: AssignPlanBody) =>
    api<{ membership: Membership }>('/memberships', {
      method: 'POST',
      body: JSON.stringify({ ...body, memberId }),
    }),

  setStatus: (id: string, status: string, notes?: string | null) =>
    api<{ membership: Membership }>(`/memberships/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, notes }),
    }),
};

export interface AssignPlanBody {
  planId: string;
  acceptTerms?: boolean;
  notes?: string | null;
  payment?: {
    method: 'CASH' | 'TRANSFER' | 'CARD' | 'DIGITAL_WALLET';
    amount: number;
    notes?: string | null;
  };
}

interface MemberInput {
  firstName: string;
  lastName: string;
  documentId: string;
  phone: string;
  email?: string | null;
  photoUrl?: string | null;
  birthDate?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  notes?: string | null;
}
