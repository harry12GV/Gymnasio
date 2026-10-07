import { useCallback, useEffect, useState } from 'react';
import {
  Banknote,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  FileText,
  Landmark,
  Plus,
  Smartphone,
  Wallet,
} from 'lucide-react';
import { paymentsApi, type DailyReport } from '@/lib/api.payments';
import { membersApi } from '@/lib/api.members';
import { generateReceiptPdf } from '@/lib/receipt';
import { formatCurrency, formatDateTime } from '@/lib/format';
import { PAYMENT_METHOD_LABEL } from '@/types';

const METHOD_ICON: Record<string, typeof Banknote> = {
  CASH: Banknote,
  TRANSFER: Landmark,
  CARD: CreditCard,
  DIGITAL_WALLET: Smartphone,
};

function todayStr(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function CashPage() {
  const [date, setDate] = useState(todayStr());
  const [report, setReport] = useState<DailyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showManual, setShowManual] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setReport(await paymentsApi.daily(date));
      setError(null);
    } catch (e) {
      setError((e as { message?: string }).message ?? 'Error al cargar caja');
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    load();
  }, [load]);

  function shift(days: number) {
    const d = new Date(`${date}T12:00:00`);
    d.setDate(d.getDate() + days);
    const pad = (n: number) => String(n).padStart(2, '0');
    setDate(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
  }

  function receipt(payment: DailyReport['payments'][number]) {
    generateReceiptPdf({
      receiptCode: payment.receiptCode,
      date: formatDateTime(payment.createdAt),
      memberName: `${payment.member.firstName} ${payment.member.lastName}`,
      documentId: payment.member.documentId,
      planName: payment.category === 'DAY_PASS' ? 'Pase Diario' : payment.category === 'MEMBERSHIP' ? 'Membresía' : 'Varios',
      method: payment.method,
      amount: payment.amount,
    });
  }

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl text-gold">CAJA DEL DÍA</h1>
          <p className="mt-1 text-sm text-zinc-500">Reporte de cobros y cierre para recepción</p>
        </div>
        <button
          onClick={() => setShowManual((v) => !v)}
          className="inline-flex items-center gap-2 rounded-lg bg-gold px-4 py-2.5 font-medium text-background transition-all hover:bg-gold-bright hover:shadow-gold-glow"
        >
          <Plus className="h-4 w-4" /> Pago manual
        </button>
      </header>

      {/* Selector de fecha */}
      <div className="mb-4 flex items-center gap-2">
        <button
          onClick={() => shift(-1)}
          className="rounded-lg border border-line p-2 text-zinc-400 hover:border-gold hover:text-gold"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <input
          type="date"
          value={date}
          max={todayStr()}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-lg border border-line bg-card px-3 py-2 text-sm"
        />
        <button
          onClick={() => shift(1)}
          disabled={date >= todayStr()}
          className="rounded-lg border border-line p-2 text-zinc-400 disabled:opacity-40 hover:border-gold hover:text-gold"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
        {date !== todayStr() && (
          <button onClick={() => setDate(todayStr())} className="ml-2 text-sm text-gold hover:underline">
            Volver a hoy
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-danger/40 bg-danger/10 px-4 py-2 text-sm text-danger">
          {error}
        </div>
      )}

      {showManual && <ManualPaymentForm onDone={() => { setShowManual(false); load(); }} />}

      {loading || !report ? (
        <p className="text-zinc-500">Cargando caja...</p>
      ) : (
        <>
          {/* Resumen */}
          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-xl border border-gold/40 bg-card p-5">
              <p className="text-xs uppercase tracking-wider text-zinc-500">Total del día</p>
              <p className="mt-1 font-display text-4xl text-gold">{formatCurrency(report.total)}</p>
              <p className="mt-1 text-xs text-zinc-500">{report.payments.length} cobros registrados</p>
            </div>

            <div className="rounded-xl border border-line bg-card p-5">
              <p className="mb-3 text-xs uppercase tracking-wider text-zinc-500">Por método de pago</p>
              <ul className="space-y-2 text-sm">
                {Object.entries(report.byMethod).map(([m, v]) => {
                  const Icon = METHOD_ICON[m] ?? Wallet;
                  return (
                    <li key={m} className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-zinc-400">
                        <Icon className="h-4 w-4 text-gold/70" /> {PAYMENT_METHOD_LABEL[m as keyof typeof PAYMENT_METHOD_LABEL] ?? m}
                      </span>
                      <span className="text-zinc-200">{formatCurrency(v)}</span>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="rounded-xl border border-line bg-card p-5">
              <p className="mb-3 text-xs uppercase tracking-wider text-zinc-500">Por categoría</p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center justify-between">
                  <span className="text-zinc-400">Mensualidades</span>
                  <span className="text-zinc-200">{formatCurrency(report.byCategory.MEMBERSHIP)}</span>
                </li>
                <li className="flex items-center justify-between">
                  <span className="text-zinc-400">Pases diarios</span>
                  <span className="text-zinc-200">{formatCurrency(report.byCategory.DAY_PASS)}</span>
                </li>
                <li className="flex items-center justify-between">
                  <span className="text-zinc-400">Varios</span>
                  <span className="text-zinc-200">{formatCurrency(report.byCategory.OTHER)}</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Listado */}
          <div className="overflow-x-auto rounded-xl border border-line bg-card">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs uppercase tracking-wider text-zinc-500">
                  <th className="px-4 py-3 font-medium">Hora</th>
                  <th className="px-4 py-3 font-medium">Comprobante</th>
                  <th className="px-4 py-3 font-medium">Socio</th>
                  <th className="px-4 py-3 font-medium">Concepto</th>
                  <th className="px-4 py-3 font-medium">Método</th>
                  <th className="px-4 py-3 text-right font-medium">Monto</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {report.payments.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-zinc-500">
                      Sin cobros registrados este día
                    </td>
                  </tr>
                )}
                {report.payments.map((p) => {
                  const Icon = METHOD_ICON[p.method] ?? Wallet;
                  return (
                    <tr key={p.id} className="border-b border-line/50 last:border-0">
                      <td className="px-4 py-3 text-zinc-400">
                        {formatDateTime(p.createdAt).slice(-5)}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-zinc-300">{p.receiptCode}</td>
                      <td className="px-4 py-3 text-zinc-200">
                        {p.member.lastName}, {p.member.firstName}
                        <span className="block text-xs text-zinc-500">{p.member.documentId}</span>
                      </td>
                      <td className="px-4 py-3 text-zinc-400">
                        {p.category === 'DAY_PASS' ? 'Pase diario' : p.category === 'MEMBERSHIP' ? 'Membresía' : 'Varios'}
                      </td>
                      <td className="px-4 py-3 text-zinc-400">
                        <Icon className="mr-1 inline h-4 w-4 text-gold/60" />
                        {PAYMENT_METHOD_LABEL[p.method]}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-gold">
                        {formatCurrency(p.amount)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => receipt(p)}
                          className="rounded p-1.5 text-zinc-400 hover:bg-gold/10 hover:text-gold"
                          title="Descargar recibo PDF"
                        >
                          <FileText className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

/** Formulario de pago manual (ajustes, varios, productos) */
function ManualPaymentForm({ onDone }: { onDone: () => void }) {
  const [members, setMembers] = useState<{ id: string; label: string }[]>([]);
  const [memberId, setMemberId] = useState('');
  const [method, setMethod] = useState('CASH');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    membersApi
      .list({ pageSize: 100 })
      .then(({ data }) => {
        setMembers(
          data.map((m) => ({
            id: m.id,
            label: `${m.lastName}, ${m.firstName} (${m.documentId})`,
          }))
        );
      })
      .catch(() => setError('No se pudieron cargar los socios'));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!memberId) {
      setError('Selecciona un socio');
      return;
    }
    if (Number(amount) <= 0) {
      setError('El monto debe ser mayor a 0');
      return;
    }
    setSaving(true);
    try {
      await paymentsApi.create({
        memberId,
        method,
        amount: Number(amount),
        category: 'OTHER',
        notes: notes.trim() || null,
      });
      onDone();
    } catch (e2) {
      setError((e2 as { message?: string }).message ?? 'Error al registrar pago');
      setSaving(false);
    }
  }

  const inputCls =
    'w-full rounded-lg border border-line bg-background px-3 py-2.5 text-sm outline-none focus:border-gold focus:ring-1 focus:ring-gold';

  return (
    <form onSubmit={handleSubmit} className="mb-6 space-y-4 rounded-xl border border-gold/30 bg-card p-6">
      <h2 className="text-xl">PAGO MANUAL</h2>
      {error && (
        <div className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block sm:col-span-2">
          <span className="mb-1 block text-xs uppercase tracking-wider text-zinc-400">Socio</span>
          <select className={inputCls} value={memberId} onChange={(e) => setMemberId(e.target.value)}>
            <option value="">Seleccionar...</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>{m.label}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs uppercase tracking-wider text-zinc-400">Método</span>
          <select className={inputCls} value={method} onChange={(e) => setMethod(e.target.value)}>
            <option value="CASH">Efectivo</option>
            <option value="TRANSFER">Transferencia</option>
            <option value="CARD">Tarjeta</option>
            <option value="DIGITAL_WALLET">Billetera</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs uppercase tracking-wider text-zinc-400">Monto</span>
          <input
            type="number"
            step="0.01"
            min="0"
            className={inputCls}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </label>
        <label className="block sm:col-span-2 lg:col-span-4">
          <span className="mb-1 block text-xs uppercase tracking-wider text-zinc-400">Concepto / Nota</span>
          <input
            className={inputCls}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ej: venta de proteína, reposición de credencial..."
          />
        </label>
      </div>
      <button
        type="submit"
        disabled={saving}
        className="rounded-lg bg-gold px-6 py-2.5 text-sm font-medium text-background hover:bg-gold-bright disabled:opacity-50"
      >
        {saving ? 'Registrando...' : 'Registrar pago'}
      </button>
    </form>
  );
}
