import { STATUS_LABEL, type MembershipStatus } from '@/types';

const STYLES: Record<MembershipStatus, string> = {
  ACTIVE: 'bg-success/15 text-success border-success/30',
  EXPIRED: 'bg-danger/15 text-danger border-danger/30',
  SUSPENDED: 'bg-warning/15 text-warning border-warning/30',
  CANCELLED: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30',
  NO_MEMBERSHIP: 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20',
};

export function StatusBadge({ status }: { status: MembershipStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${STYLES[status]}`}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}
