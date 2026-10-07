import { FormEvent, useEffect, useRef, useState } from 'react';
import { CheckCircle2, Download, FileText, Printer, Zap } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { paymentsApi, type QuickSaleResult } from '@/lib/api.payments';
import { generateReceiptPdf } from '@/lib/receipt';
import { downloadQrCredential, drawWatermark } from '@/lib/qr';
import { formatCurrency, formatDateTime } from '@/lib/format';

export default function QuickSalePage() {
  const [form, setForm] = useState({ firstName: '', lastName: '', documentId: '', phone: '' });
  const [method, setMethod] = useState('CASH');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [price, setPrice] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<QuickSaleResult | null>(null);
  const qrWrapRef = useRef<HTMLDivElement>(null);

  // Precio del pase diario (primer plan DAY_PASS activo)
  useEffect(() => {
    api_getDayPassPrice().then(setPrice).catch(() => setPrice(null));
  }, []);

  // Pintar marca de agua sobre el QR cuando aparece el resultado
  useEffect(() => {
    if (result && qrWrapRef.current) {
      const canvas = qrWrapRef.current.querySelector('canvas');
      if (canvas) drawWatermark(canvas as HTMLCanvasElement);
    }
  }, [result]);

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!acceptTerms) {
      setError('Debes aceptar la exención de responsabilidad / Términos y Condiciones');
      return;
    }
    setSaving(true);
    try {
      const res = await paymentsApi.quickSale({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim() || undefined,
        documentId: form.documentId.trim(),
        phone: form.phone.trim(),
        method: method as 'CASH',
        acceptTerms: true,
      });
      setResult(res);
    } catch (e2) {
      setError((e2 as { message?: string }).message ?? 'Error en la venta');
    } finally {
      setSaving(false);
    }
  }

  function handleReceipt() {
    if (!result) return;
    generateReceiptPdf({
      receiptCode: result.payment.receiptCode,
      date: formatDateTime(result.payment.createdAt),
      memberName: `${result.member.firstName} ${result.member.lastName}`.trim(),
      documentId: result.member.documentId,
      planName: result.plan.name,
      method: result.payment.method,
      amount: result.payment.amount,
    });
  }

  function handleCredential() {
    if (!result || !qrWrapRef.current) return;
    const canvas = qrWrapRef.current.querySelector('canvas');
    if (!canvas) return;
    downloadQrCredential({
      canvas: canvas as HTMLCanvasElement,
      memberName: `${result.member.firstName} ${result.member.lastName}`.trim(),
      documentId: result.member.documentId,
      qrToken: result.member.qrToken,
      planName: result.plan.name,
      endDate: new Date(result.membership.endDate).toLocaleDateString('es-AR'),
    });
  }

  function reset() {
    setResult(null);
    setForm({ firstName: '', lastName: '', documentId: '', phone: '' });
    setMethod('CASH');
    setAcceptTerms(false);
    setError(null);
  }

  const inputCls =
    'w-full rounded-lg border border-line bg-background px-3 py-2.5 text-sm outline-none transition-colors placeholder:text-zinc-600 focus:border-gold focus:ring-1 focus:ring-gold';
  const labelCls = 'mb-1 block text-xs font-medium uppercase tracking-wider text-zinc-400';

  // ── Pantalla de éxito con QR ──
  if (result) {
    return (
      <div className="mx-auto max-w-md">
        <div className="rounded-xl border border-success/40 bg-card p-6 text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-success" />
          <h1 className="mt-3 text-2xl">¡PASE ACTIVADO!</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {result.member.firstName} {result.member.lastName} · {result.member.documentId}
          </p>

          <div ref={qrWrapRef} className="mx-auto mt-5 w-fit rounded-xl bg-white p-4">
            <QRCodeCanvas
              value={result.member.qrToken}
              size={220}
              level="M"
              includeMargin={false}
            />
          </div>
          <p className="mt-2 text-xs text-zinc-500">
            Válido hasta:{' '}
            <span className="text-gold">
              {new Date(result.membership.endDate).toLocaleString('es-AR')}
            </span>
          </p>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <button
              onClick={handleReceipt}
              className="flex items-center justify-center gap-2 rounded-lg border border-gold/50 py-2.5 text-sm text-gold hover:bg-gold/10"
            >
              <FileText className="h-4 w-4" /> Recibo PDF
            </button>
            <button
              onClick={handleCredential}
              className="flex items-center justify-center gap-2 rounded-lg border border-gold/50 py-2.5 text-sm text-gold hover:bg-gold/10"
            >
              <Download className="h-4 w-4" /> Credencial
            </button>
          </div>

          <button
            onClick={reset}
            className="mt-4 w-full rounded-lg bg-gold py-3 font-display text-lg tracking-widest text-background transition-all hover:bg-gold-bright hover:shadow-gold-glow"
          >
            NUEVA VENTA
          </button>
          <p className="mt-2 flex items-center justify-center gap-1 text-xs text-zinc-600">
            <Printer className="h-3 w-3" /> Imprimí desde el PDF si necesitás ticket físico
          </p>
        </div>
      </div>
    );
  }

  // ── Formulario ──
  return (
    <div className="mx-auto max-w-md">
      <header className="mb-6">
        <h1 className="flex items-center gap-2 text-3xl text-gold">
          <Zap className="h-7 w-7" /> VENTA RÁPIDA
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Pase diario · {price !== null ? formatCurrency(price) : 'cargando precio...'} · solo 4 datos
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-line bg-card p-6">
        {error && (
          <div className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className={labelCls}>Nombre *</span>
            <input
              className={inputCls}
              value={form.firstName}
              onChange={(e) => set('firstName', e.target.value)}
              placeholder="Juan"
              required
              autoFocus
            />
          </label>
          <label className="block">
            <span className={labelCls}>Apellido</span>
            <input
              className={inputCls}
              value={form.lastName}
              onChange={(e) => set('lastName', e.target.value)}
              placeholder="Pérez"
            />
          </label>
        </div>

        <label className="block">
          <span className={labelCls}>DNI / Cédula *</span>
          <input
            className={inputCls}
            value={form.documentId}
            onChange={(e) => set('documentId', e.target.value)}
            placeholder="30123456"
            required
          />
        </label>

        <label className="block">
          <span className={labelCls}>Teléfono *</span>
          <input
            className={inputCls}
            value={form.phone}
            onChange={(e) => set('phone', e.target.value)}
            placeholder="1144445555"
            required
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className={labelCls}>Cobrar</span>
            <select className={inputCls} value={method} onChange={(e) => setMethod(e.target.value)}>
              <option value="CASH">Efectivo</option>
              <option value="TRANSFER">Transferencia</option>
              <option value="CARD">Tarjeta</option>
              <option value="DIGITAL_WALLET">Billetera</option>
            </select>
          </label>
          <div>
            <span className={labelCls}>Total</span>
            <div className="rounded-lg border border-gold/40 bg-gold/5 px-3 py-2.5 text-center font-display text-xl text-gold">
              {price !== null ? formatCurrency(price) : '—'}
            </div>
          </div>
        </div>

        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-warning/40 bg-warning/5 p-3">
          <input
            type="checkbox"
            checked={acceptTerms}
            onChange={(e) => setAcceptTerms(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-[#D4AF37]"
          />
          <span className="text-xs leading-relaxed text-zinc-300">
            El cliente firma la <strong className="text-warning">exención de responsabilidad</strong> y
            acepta los Términos y Condiciones. Obligatorio para activar el pase.
          </span>
        </label>

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-lg bg-gold py-4 font-display text-2xl tracking-widest text-background transition-all hover:bg-gold-bright hover:shadow-gold-glow-strong disabled:opacity-50"
        >
          {saving ? 'PROCESANDO...' : 'COBRAR Y ACTIVAR'}
        </button>
      </form>
    </div>
  );
}

/** Trae el precio del pase diario desde /plans */
async function api_getDayPassPrice(): Promise<number | null> {
  const { api } = await import('@/lib/api');
  const { plans } = await api<{ plans: { type: string; price: string }[] }>('/plans');
  const pass = plans.find((p) => p.type === 'DAY_PASS');
  return pass ? Number(pass.price) : null;
}
