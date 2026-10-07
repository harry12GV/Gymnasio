import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Ban,
  CalendarClock,
  CheckCircle2,
  Download,
  Pencil,
  Phone,
  PlayCircle,
  QrCode,
  RefreshCw,
  ShieldAlert,
  UserX,
} from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { downloadQrCredential, drawWatermark } from '@/lib/qr';
import { membersApi, membershipsApi } from '@/lib/api.members';
import { StatusBadge } from '@/components/ui/StatusBadge';
import AssignPlanModal from '@/components/members/AssignPlanModal';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/format';
import {
  PAYMENT_METHOD_LABEL,
  type MemberFull,
  type MembershipStatus,
} from '@/types';

export default function MemberDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [member, setMember] = useState<MemberFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAssign, setShowAssign] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const qrRef = useRef<HTMLDivElement>(null);

  // Pintar la marca de agua sobre el QR cuando carga el socio
  useEffect(() => {
    if (member && qrRef.current) {
      const canvas = qrRef.current.querySelector('canvas');
      if (canvas) drawWatermark(canvas as HTMLCanvasElement);
    }
  }, [member]);

  function handleCredential() {
    if (!member || !qrRef.current) return;
    const canvas = qrRef.current.querySelector('canvas');
    if (!canvas) return;
    downloadQrCredential({
      canvas: canvas as HTMLCanvasElement,
      memberName: `${member.firstName} ${member.lastName}`,
      documentId: member.documentId,
      qrToken: member.qrToken,
      planName: member.memberships[0]?.plan.name ?? 'Sin plan',
      endDate: member.memberships[0]
        ? new Date(member.memberships[0].endDate).toLocaleDateString('es-AR')
        : '—',
    });
  }

  async function handleRegenerateQr() {
    if (!member) return;
    const ok = window.confirm(
      `¿Regenerar el QR de ${member.firstName} ${member.lastName}?\n\n` +
        'La credencial anterior deja de funcionar en la entrada. ' +
        'Descargá la nueva credencial después de confirmar.'
    );
    if (!ok) return;
    setActionError(null);
    try {
      const { member: updated } = await membersApi.regenerateQr(member.id);
      setMember((prev) => (prev ? { ...prev, qrToken: updated.qrToken } : prev));
    } catch (e) {
      setActionError((e as { message?: string }).message ?? 'Error al regenerar QR');
    }
  }

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const { member } = await membersApi.get(id);
      setMember(member);
      setError(null);
    } catch (e) {
      setError((e as { message?: string }).message ?? 'Error al cargar socio');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function changeStatus(membershipId: string, status: MembershipStatus) {
    setActionError(null);
    try {
      await membershipsApi.setStatus(membershipId, status);
      await load();
    } catch (e) {
      setActionError((e as { message?: string }).message ?? 'Error al cambiar estado');
    }
  }

  async function handleDelete() {
    if (!member) return;
    if (!window.confirm(`¿Dar de baja a ${member.firstName} ${member.lastName}? Podrás reactivarlo creando un socio nuevo con otro DNI.`)) {
      return;
    }
    try {
      await membersApi.remove(member.id);
      navigate('/members');
    } catch (e) {
      setActionError((e as { message?: string }).message ?? 'Error al dar de baja');
    }
  }

  if (loading) return <p className="text-zinc-500">Cargando socio...</p>;
  if (error || !member)
    return (
      <div className="rounded-lg border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
        {error ?? 'Socio no encontrado'}
      </div>
    );

  const current = member.memberships[0];

  return (
    <div className="mx-auto max-w-4xl">
      <button
        onClick={() => navigate('/members')}
        className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-400 hover:text-gold"
      >
        <ArrowLeft className="h-4 w-4" /> Volver a socios
      </button>

      {/* Encabezado */}
      <div className="mb-6 flex flex-wrap items-center gap-5 rounded-xl border border-line bg-card p-6">
        {member.photoUrl ? (
          <img
            src={member.photoUrl}
            alt={`${member.firstName} ${member.lastName}`}
            className="h-20 w-20 rounded-full border-2 border-gold/50 object-cover"
          />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-full border border-line bg-background font-display text-2xl text-gold">
            {member.firstName[0]}
            {member.lastName[0]}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl">
              {member.lastName.toUpperCase()}, {member.firstName}
            </h1>
            <StatusBadge status={current?.status ?? 'NO_MEMBERSHIP'} />
          </div>
          <p className="mt-1 text-sm text-zinc-500">
            DNI {member.documentId} · {member.phone}
            {member.email && ` · ${member.email}`}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowAssign(true)}
            className="rounded-lg bg-gold px-4 py-2 text-sm font-medium text-background transition-all hover:bg-gold-bright hover:shadow-gold-glow"
          >
            {current?.status === 'ACTIVE' ? 'Renovar plan' : 'Asignar plan'}
          </button>
          <Link
            to={`/members/${member.id}/edit`}
            className="rounded-lg border border-line px-4 py-2 text-sm text-zinc-300 hover:border-gold hover:text-gold"
          >
            <Pencil className="mr-1 inline h-3.5 w-3.5" /> Editar
          </Link>
          <button
            onClick={handleDelete}
            className="rounded-lg border border-line px-4 py-2 text-sm text-zinc-400 hover:border-danger hover:text-danger"
          >
            <UserX className="mr-1 inline h-3.5 w-3.5" /> Dar de baja
          </button>
        </div>
      </div>

      {actionError && (
        <div className="mb-4 rounded-md border border-danger/40 bg-danger/10 px-4 py-2 text-sm text-danger">
          {actionError}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Membresía actual */}
        <section className="rounded-xl border border-line bg-card p-6">
          <h2 className="mb-4 flex items-center gap-2 text-xl">
            <CalendarClock className="h-5 w-5 text-gold" /> Membresía actual
          </h2>

          {!current ? (
            <div className="rounded-lg border border-dashed border-line p-6 text-center">
              <p className="text-sm text-zinc-500">Este socio aún no tiene plan asignado.</p>
              <button
                onClick={() => setShowAssign(true)}
                className="mt-3 text-sm text-gold hover:underline"
              >
                Asignar el primero
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-400">Plan</span>
                <span className="font-medium">{current.plan.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-400">Inicio</span>
                <span className="text-sm">{formatDate(current.startDate)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-400">Vence</span>
                <span className="text-sm">{formatDate(current.endDate)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-400">Estado</span>
                <StatusBadge status={current.status} />
              </div>

              {/* Acciones según estado */}
              <div className="flex flex-wrap gap-2 pt-2">
                {current.status === 'ACTIVE' && (
                  <button
                    onClick={() => changeStatus(current.id, 'SUSPENDED')}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-warning/50 px-3 py-1.5 text-xs text-warning hover:bg-warning/10"
                  >
                    <Ban className="h-3.5 w-3.5" /> Suspender
                  </button>
                )}
                {(current.status === 'SUSPENDED' || current.status === 'EXPIRED') && (
                  <button
                    onClick={() => changeStatus(current.id, 'ACTIVE')}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-success/50 px-3 py-1.5 text-xs text-success hover:bg-success/10"
                  >
                    <PlayCircle className="h-3.5 w-3.5" /> Reactivar
                  </button>
                )}
                {current.status !== 'CANCELLED' && (
                  <button
                    onClick={() => changeStatus(current.id, 'CANCELLED')}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-danger/50 px-3 py-1.5 text-xs text-danger hover:bg-danger/10"
                  >
                    <Ban className="h-3.5 w-3.5" /> Cancelar membresía
                  </button>
                )}
              </div>

              <p className="flex items-start gap-1.5 pt-1 text-xs text-zinc-600">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success/60" />
                Al reactivar una membresía vencida se habilita el acceso hasta su fecha de vencimiento.
              </p>
            </div>
          )}
        </section>

        {/* Datos personales */}
        <section className="rounded-xl border border-line bg-card p-6">
          <h2 className="mb-4 flex items-center gap-2 text-xl">
            <Phone className="h-5 w-5 text-gold" /> Datos personales
          </h2>
          <dl className="space-y-2.5 text-sm">
            <Row label="Nacimiento" value={formatDate(member.birthDate)} />
            <Row label="Emergencia" value={member.emergencyContactName ?? '—'} />
            <Row label="Tel. emergencia" value={member.emergencyContactPhone ?? '—'} />
            <Row label="Socio desde" value={formatDate(member.createdAt)} />
            <Row label="Notas" value={member.notes ?? '—'} />
            <Row
              label="Token QR"
              value={
                <span className="font-mono text-xs text-gold/80">{member.qrToken.slice(0, 18)}…</span>
              }
            />
          </dl>
        </section>

        {/* QR de acceso */}
        <section className="rounded-xl border border-line bg-card p-6 text-center">
          <h2 className="mb-4 flex items-center justify-center gap-2 text-xl">
            <QrCode className="h-5 w-5 text-gold" /> QR de acceso
          </h2>
          <div ref={qrRef} className="mx-auto w-fit rounded-xl bg-white p-4">
            <QRCodeCanvas value={member.qrToken} size={180} level="M" />
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <button
              onClick={handleCredential}
              className="inline-flex items-center gap-2 rounded-lg border border-gold/50 px-4 py-2 text-sm text-gold hover:bg-gold/10"
            >
              <Download className="h-4 w-4" /> Descargar credencial
            </button>
            <button
              onClick={handleRegenerateQr}
              className="inline-flex items-center gap-2 rounded-lg border border-danger/50 px-4 py-2 text-sm text-danger hover:bg-danger/10"
            >
              <RefreshCw className="h-4 w-4" /> Regenerar QR
            </button>
          </div>
          <p className="mt-2 text-xs text-zinc-600">
            Imprimilo o reenvialo al socio si perdió su credencial. Regenerar invalida el anterior.
          </p>
        </section>

        {/* Historial de pagos */}
        <section className="rounded-xl border border-line bg-card p-6">
          <h2 className="mb-4 text-xl">Historial de pagos</h2>
          {member.payments.length === 0 ? (
            <p className="text-sm text-zinc-500">Sin pagos registrados.</p>
          ) : (
            <ul className="divide-y divide-line/60">
              {member.payments.slice(0, 8).map((p) => (
                <li key={p.id} className="flex items-center justify-between py-2.5 text-sm">
                  <div>
                    <p className="text-zinc-300">{formatCurrency(p.amount)}</p>
                    <p className="text-xs text-zinc-500">
                      {PAYMENT_METHOD_LABEL[p.method]} · {p.receiptCode}
                    </p>
                  </div>
                  <span className="text-xs text-zinc-500">{formatDateTime(p.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Historial de accesos */}
        <section className="rounded-xl border border-line bg-card p-6">
          <h2 className="mb-4 flex items-center gap-2 text-xl">
            <ShieldAlert className="h-5 w-5 text-gold" /> Accesos recientes
          </h2>
          {member.checkIns.length === 0 ? (
            <p className="text-sm text-zinc-500">Sin registros de acceso aún (Sprint 4).</p>
          ) : (
            <ul className="divide-y divide-line/60">
              {member.checkIns.slice(0, 8).map((c) => (
                <li key={c.id} className="flex items-center justify-between py-2.5 text-sm">
                  <span className={c.result === 'ALLOWED' ? 'text-success' : 'text-danger'}>
                    {c.result === 'ALLOWED' ? '✔ Ingreso' : '⛔ Bloqueado'}
                  </span>
                  <span className="text-xs text-zinc-500">{formatDateTime(c.entryAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {showAssign && (
        <AssignPlanModal
          memberId={member.id}
          memberName={`${member.firstName} ${member.lastName}`}
          onClose={() => setShowAssign(false)}
          onDone={() => {
            setShowAssign(false);
            load();
          }}
        />
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="shrink-0 text-zinc-400">{label}</dt>
      <dd className="truncate text-right text-zinc-200">{value}</dd>
    </div>
  );
}
