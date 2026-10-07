import { useEffect, useRef, useState } from 'react';
import {
  Building2,
  CalendarClock,
  Clock,
  Download,
  KeyRound,
  QrCode,
  X,
} from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { api } from '@/lib/api';
import { drawWatermark, downloadQrCredential } from '@/lib/qr';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/format';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { PAYMENT_METHOD_LABEL, type GymSettings, type Membership, type Payment } from '@/types';

interface PortalData {
  profile: { id: string; firstName: string; lastName: string; documentId: string; email: string; photoUrl: string | null };
  currentMembership: (Membership & { plan: { id: string; name: string; type: string } }) | null;
  memberships: Membership[];
  payments: Payment[];
  qrToken: string;
  lastVisit: string | null;
  gym: GymSettings;
}

const DAY_LABEL: Record<string, string> = {
  monday: 'Lunes',
  tuesday: 'Martes',
  wednesday: 'Miércoles',
  thursday: 'Jueves',
  friday: 'Viernes',
  saturday: 'Sábado',
  sunday: 'Domingo',
};

export default function PortalPage() {
  const [data, setData] = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPwd, setShowPwd] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api<PortalData>('/portal/me')
      .then(setData)
      .catch((e) => setError((e as { message?: string }).message ?? 'Error'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (data && qrRef.current) {
      const canvas = qrRef.current.querySelector('canvas');
      if (canvas) drawWatermark(canvas as HTMLCanvasElement);
    }
  }, [data]);

  async function handleCredential() {
    if (!data || !qrRef.current) return;
    const canvas = qrRef.current.querySelector('canvas');
    if (!canvas) return;
    downloadQrCredential({
      canvas: canvas as HTMLCanvasElement,
      memberName: `${data.profile.firstName} ${data.profile.lastName}`,
      documentId: data.profile.documentId,
      qrToken: data.qrToken,
      planName: data.currentMembership?.plan.name ?? 'Sin plan',
      endDate: data.currentMembership
        ? new Date(data.currentMembership.endDate).toLocaleDateString('es-AR')
        : '—',
    });
  }

  if (loading) return <p className="text-zinc-500">Cargando tu portal...</p>;
  if (error || !data)
    return (
      <div className="rounded-lg border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
        {error ?? 'Error al cargar el portal'}
      </div>
    );

  const m = data.currentMembership;
  const mStatus = m ? m.status : 'NO_MEMBERSHIP';

  return (
    <div className="mx-auto max-w-4xl">
      {/* Bienvenida */}
      <header className="mb-6 flex items-center gap-4">
        {data.profile.photoUrl ? (
          <img src={data.profile.photoUrl} alt="" className="h-16 w-16 rounded-full border-2 border-gold/50 object-cover" />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full border border-line bg-card font-display text-xl text-gold">
            {data.profile.firstName[0]}{data.profile.lastName[0]}
          </div>
        )}
        <div>
          <h1 className="text-3xl text-gold">HOLA, {data.profile.firstName.toUpperCase()}</h1>
          <p className="text-sm text-zinc-500">Última visita: {formatDateTime(data.lastVisit)}</p>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Membresía */}
        <section className="rounded-xl border border-line bg-card p-6">
          <h2 className="mb-4 flex items-center gap-2 text-xl">
            <CalendarClock className="h-5 w-5 text-gold" /> Mi membresía
          </h2>
          {!m ? (
            <p className="text-sm text-zinc-500">No tenés membresía activa. Acercate a recepción.</p>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-400">Plan</span>
                <span className="font-medium">{m.plan.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-400">Vence</span>
                <span className={m.status === 'ACTIVE' ? 'text-success' : 'text-danger'}>
                  {formatDate(m.endDate)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-400">Estado</span>
                <StatusBadge status={mStatus} />
              </div>
            </div>
          )}
        </section>

        {/* QR */}
        <section className="rounded-xl border border-line bg-card p-6 text-center">
          <h2 className="mb-4 flex items-center justify-center gap-2 text-xl">
            <QrCode className="h-5 w-5 text-gold" /> Mi QR de acceso
          </h2>
          <div ref={qrRef} className="mx-auto w-fit rounded-xl bg-white p-4">
            <QRCodeCanvas value={data.qrToken} size={180} level="M" />
          </div>
          <button
            onClick={handleCredential}
            className="mt-4 inline-flex items-center gap-2 rounded-lg border border-gold/50 px-4 py-2 text-sm text-gold hover:bg-gold/10"
          >
            <Download className="h-4 w-4" /> Descargar credencial
          </button>
          <p className="mt-2 text-xs text-zinc-600">Mostralo en la entrada para registrar tu ingreso</p>
        </section>

        {/* Pagos */}
        <section className="rounded-xl border border-line bg-card p-6">
          <h2 className="mb-4 text-xl">Mis pagos</h2>
          {data.payments.length === 0 ? (
            <p className="text-sm text-zinc-500">Sin pagos registrados.</p>
          ) : (
            <ul className="divide-y divide-line/60">
              {data.payments.slice(0, 6).map((p) => (
                <li key={p.id} className="flex items-center justify-between py-2.5 text-sm">
                  <div>
                    <p className="text-zinc-200">{formatCurrency(p.amount)}</p>
                    <p className="text-xs text-zinc-500">
                      {PAYMENT_METHOD_LABEL[p.method]} · {formatDate(p.createdAt)}
                    </p>
                  </div>
                  <span className="rounded bg-gold/10 px-2 py-0.5 text-xs text-gold">
                    {p.category === 'DAY_PASS' ? 'Pase' : p.category === 'MEMBERSHIP' ? 'Cuota' : 'Varios'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Gimnasio */}
        <section className="rounded-xl border border-line bg-card p-6">
          <h2 className="mb-4 flex items-center gap-2 text-xl">
            <Building2 className="h-5 w-5 text-gold" /> El gimnasio
          </h2>
          <div className="space-y-2 text-sm">
            <p className="flex items-center gap-2 text-zinc-300">
              <Building2 className="h-4 w-4 text-gold/60" /> {data.gym.name}
            </p>
            {data.gym.address && <p className="text-zinc-400">{data.gym.address}</p>}
            {data.gym.phone && <p className="text-zinc-400">{data.gym.phone}</p>}
            <div className="mt-3 border-t border-line pt-3">
              <p className="mb-2 flex items-center gap-2 text-xs uppercase tracking-wider text-zinc-500">
                <Clock className="h-3.5 w-3.5 text-gold/60" /> Horarios
              </p>
              <ul className="space-y-1">
                {data.gym.openingHours &&
                  Object.entries(data.gym.openingHours).map(([d, h]) => (
                    <li key={d} className="flex justify-between text-zinc-400">
                      <span>{DAY_LABEL[d] ?? d}</span>
                      <span className="text-zinc-200">{h}</span>
                    </li>
                  ))}
              </ul>
            </div>
          </div>
        </section>
      </div>

      {/* Contraseña */}
      <div className="mt-6">
        <button
          onClick={() => setShowPwd(true)}
          className="inline-flex items-center gap-2 rounded-lg border border-line px-4 py-2 text-sm text-zinc-300 hover:border-gold hover:text-gold"
        >
          <KeyRound className="h-4 w-4" /> Cambiar contraseña
        </button>
      </div>

      {showPwd && <ChangePasswordModal onClose={() => setShowPwd(false)} />}
    </div>
  );
}

function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await api('/auth/password', {
        method: 'PATCH',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      setOk(true);
      setTimeout(onClose, 1500);
    } catch (e2) {
      setError((e2 as { message?: string }).message ?? 'Error');
      setSaving(false);
    }
  }

  const inputCls =
    'w-full rounded-lg border border-line bg-background px-3 py-2.5 text-sm outline-none focus:border-gold focus:ring-1 focus:ring-gold';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <form
        onSubmit={submit}
        className="w-full max-w-sm space-y-4 rounded-xl border border-line bg-card p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-xl">CAMBIAR CONTRASEÑA</h2>
          <button type="button" onClick={onClose} className="text-zinc-500 hover:text-zinc-300">
            <X className="h-5 w-5" />
          </button>
        </div>
        {ok ? (
          <p className="rounded-lg border border-success/40 bg-success/10 px-3 py-2 text-sm text-success">
            ¡Contraseña actualizada!
          </p>
        ) : (
          <>
            {error && (
              <div className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
                {error}
              </div>
            )}
            <label className="block">
              <span className="mb-1 block text-xs uppercase tracking-wider text-zinc-400">Contraseña actual</span>
              <input
                type="password"
                className={inputCls}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs uppercase tracking-wider text-zinc-400">Nueva contraseña</span>
              <input
                type="password"
                className={inputCls}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                minLength={6}
                required
              />
            </label>
            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-lg bg-gold py-2.5 font-display tracking-widest text-background hover:bg-gold-bright disabled:opacity-50"
            >
              {saving ? 'GUARDANDO...' : 'GUARDAR'}
            </button>
          </>
        )}
      </form>
    </div>
  );
}
