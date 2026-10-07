import { FormEvent, useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { membershipsApi, plansApi } from '@/lib/api.members';
import { formatCurrency } from '@/lib/format';
import { PLAN_TYPE_LABEL, type Plan } from '@/types';

interface Props {
  memberId: string;
  memberName: string;
  onClose: () => void;
  onDone: () => void;
}

export default function AssignPlanModal({ memberId, memberName, onClose, onDone }: Props) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [planId, setPlanId] = useState('');
  const [method, setMethod] = useState('CASH');
  const [amount, setAmount] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const plan = useMemo(() => plans.find((p) => p.id === planId), [plans, planId]);
  const needsTerms = plan?.type === 'DAY_PASS' || plan?.type === 'TRIAL_DAY';
  const isTrial = plan?.type === 'TRIAL_DAY';

  useEffect(() => {
    plansApi
      .list()
      .then(({ plans }) => {
        setPlans(plans);
        if (plans.length > 0) selectPlan(plans[0].id);
      })
      .catch((e) => setError((e as { message?: string }).message ?? 'Error al cargar planes'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function selectPlan(id: string) {
    setPlanId(id);
    const p = plans.find((x) => x.id === id);
    setAmount(p ? String(Number(p.price)) : '');
    setAcceptTerms(false);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!planId) {
      setError('Selecciona un plan');
      return;
    }
    if (needsTerms && !acceptTerms) {
      setError('Debes aceptar la exención de responsabilidad / Términos y Condiciones');
      return;
    }

    setSaving(true);
    try {
      await membershipsApi.assign(memberId, {
        planId,
        acceptTerms: needsTerms ? true : undefined,
        notes: notes.trim() || null,
        payment:
          !isTrial && Number(amount) > 0
            ? {
                method: method as 'CASH' | 'TRANSFER' | 'CARD' | 'DIGITAL_WALLET',
                amount: Number(amount),
              }
            : undefined,
      });
      onDone();
    } catch (e2) {
      setError((e2 as { message?: string }).message ?? 'Error al asignar plan');
      setSaving(false);
    }
  }

  const inputCls =
    'w-full rounded-lg border border-line bg-background px-3 py-2.5 text-sm outline-none transition-colors placeholder:text-zinc-600 focus:border-gold focus:ring-1 focus:ring-gold';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl border border-line bg-card p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl">ASIGNAR PLAN</h2>
            <p className="text-xs text-zinc-500">{memberName}</p>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300">
            <X className="h-5 w-5" />
          </button>
        </div>

        {loading ? (
          <p className="py-8 text-center text-sm text-zinc-500">Cargando planes...</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
                {error}
              </div>
            )}

            <label className="block">
              <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-zinc-400">
                Plan
              </span>
              <select className={inputCls} value={planId} onChange={(e) => selectPlan(e.target.value)}>
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {PLAN_TYPE_LABEL[p.type]} — {formatCurrency(p.price)}
                  </option>
                ))}
              </select>
            </label>

            {plan?.type === 'TIME' && (
              <p className="rounded-lg border border-line bg-background px-3 py-2 text-xs text-zinc-400">
                Vigencia: {plan.durationDays} días desde hoy.
              </p>
            )}
            {needsTerms && (
              <p className="rounded-lg border border-gold/30 bg-gold/5 px-3 py-2 text-xs text-gold/90">
                {isTrial
                  ? 'Día de prueba: gratis, no genera cobro.'
                  : 'Pase diario: se cobra ahora y vence'}{' '}
                {plan?.type === 'DAY_PASS' ? 'a fin del día natural.' : ''}
              </p>
            )}

            {!isTrial && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-zinc-400">
                      Método de pago
                    </span>
                    <select className={inputCls} value={method} onChange={(e) => setMethod(e.target.value)}>
                      <option value="CASH">Efectivo</option>
                      <option value="TRANSFER">Transferencia</option>
                      <option value="CARD">Tarjeta</option>
                      <option value="DIGITAL_WALLET">Billetera digital</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-zinc-400">
                      Monto
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className={inputCls}
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                    />
                  </label>
                </div>
              </>
            )}

            <label className="block">
              <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-zinc-400">
                Notas (opcional)
              </span>
              <input
                className={inputCls}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Observaciones..."
              />
            </label>

            {needsTerms && (
              <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-warning/40 bg-warning/5 p-3">
                <input
                  type="checkbox"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-[#D4AF37]"
                />
                <span className="text-xs leading-relaxed text-zinc-300">
                  El cliente firma la <strong className="text-warning">exención de responsabilidad</strong>{' '}
                  y acepta los Términos y Condiciones del gimnasio. Obligatorio para pases diarios y
                  días de prueba.
                </span>
              </label>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 rounded-lg bg-gold py-2.5 font-display text-lg tracking-widest text-background transition-all hover:bg-gold-bright disabled:opacity-50"
              >
                {saving ? 'ASIGNANDO...' : 'ASIGNAR'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-line px-5 text-sm text-zinc-400 hover:text-zinc-200"
              >
                Cancelar
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
