import { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2, LogOut, QrCode, RefreshCw, ScanLine, ShieldAlert, XCircle } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { api } from '@/lib/api';
import { formatDateTime } from '@/lib/format';

interface CheckinResult {
  result: 'ALLOWED' | 'DENIED' | 'EXIT';
  status?: string;
  message: string;
  member?: { id: string; firstName: string; lastName: string; photoUrl: string | null; planName?: string | null };
  membershipEnd?: string;
}

interface TodayData {
  count: number;
  inside: number;
  denied: number;
  checkIns: {
    id: string;
    result: string;
    entryAt: string;
    exitAt: string | null;
    member: { firstName: string; lastName: string; documentId: string };
  }[];
}

export default function CheckInPage() {
  const [lastResult, setLastResult] = useState<CheckinResult | null>(null);
  const [today, setToday] = useState<TodayData | null>(null);
  const [manualToken, setManualToken] = useState('');
  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastScanAt = useRef(0);
  const busy = useRef(false);

  const loadToday = useCallback(async () => {
    try {
      setToday(await api<TodayData>('/checkin/today'));
    } catch {
      /* silencioso */
    }
  }, []);

  useEffect(() => {
    loadToday();
    const t = setInterval(loadToday, 20000);
    return () => clearInterval(t);
  }, [loadToday]);

  // Limpiar scanner al desmontar
  useEffect(() => {
    return () => {
      stopScanner();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleToken(token: string) {
    if (busy.current) return;
    busy.current = true;
    try {
      const res = await api<CheckinResult>('/checkin', {
        method: 'POST',
        body: JSON.stringify({ qrToken: token }),
      });
      setLastResult(res);
      await loadToday();
    } catch (e) {
      const err = e as { message?: string };
      setLastResult({ result: 'DENIED', message: err.message ?? 'Error al validar' });
    } finally {
      setTimeout(() => {
        busy.current = false;
      }, 1200);
    }
  }

  async function startScanner() {
    setCameraError(null);
    try {
      const scanner = new Html5Qrcode('qr-reader', { verbose: false });
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 230, height: 230 } },
        (decodedText) => {
          const now = Date.now();
          if (now - lastScanAt.current < 3000) return; // anti doble-lectura
          lastScanAt.current = now;
          handleToken(decodedText.trim());
        },
        () => {
          /* frames sin QR: ignorar */
        }
      );
      setScanning(true);
    } catch (e) {
      setCameraError(
        (e as { message?: string }).message ??
          'No se pudo abrir la cámara. Usá un lector USB o la entrada manual.'
      );
      setScanning(false);
    }
  }

  async function stopScanner() {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch {
        /* ya detenido */
      }
      scannerRef.current = null;
    }
    setScanning(false);
  }

  async function handleExit(checkInId: string) {
    try {
      await api('/checkin/exit', { method: 'POST', body: JSON.stringify({ checkInId }) });
      await loadToday();
    } catch {
      /* noop */
    }
  }

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-3xl text-gold">CHECK-IN</h1>
        <p className="mt-1 text-sm text-zinc-500">Escaneá el QR del socio en la entrada</p>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Escáner */}
        <section className="rounded-xl border border-line bg-card p-6">
          <div id="qr-reader" className="mx-auto max-w-[300px] overflow-hidden rounded-xl" />

          {!scanning ? (
            <div className="mt-4 flex flex-col items-center gap-3">
              <button
                onClick={startScanner}
                className="inline-flex items-center gap-2 rounded-lg bg-gold px-6 py-3 font-display text-lg tracking-widest text-background transition-all hover:bg-gold-bright hover:shadow-gold-glow"
              >
                <ScanLine className="h-5 w-5" /> ABRIR CÁMARA
              </button>
              {cameraError && <p className="text-xs text-warning">{cameraError}</p>}
            </div>
          ) : (
            <div className="mt-4 flex justify-center">
              <button
                onClick={stopScanner}
                className="inline-flex items-center gap-2 rounded-lg border border-danger/50 px-4 py-2 text-sm text-danger hover:bg-danger/10"
              >
                <XCircle className="h-4 w-4" /> Detener cámara
              </button>
            </div>
          )}

          {/* Entrada manual */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (manualToken.trim()) {
                handleToken(manualToken.trim());
                setManualToken('');
              }
            }}
            className="mt-5 flex gap-2 border-t border-line pt-5"
          >
            <input
              value={manualToken}
              onChange={(e) => setManualToken(e.target.value)}
              placeholder="Código manual del QR..."
              className="flex-1 rounded-lg border border-line bg-background px-3 py-2.5 text-sm outline-none focus:border-gold focus:ring-1 focus:ring-gold"
            />
            <button
              type="submit"
              className="rounded-lg border border-gold/50 px-4 text-sm text-gold hover:bg-gold/10"
            >
              Validar
            </button>
          </form>

          {/* Resultado grande */}
          {lastResult && (
            <div
              className={`mt-5 rounded-xl border-2 p-5 text-center ${
                lastResult.result === 'ALLOWED'
                  ? 'border-success bg-success/10'
                  : lastResult.result === 'EXIT'
                    ? 'border-gold bg-gold/10'
                    : 'border-danger bg-danger/10'
              }`}
            >
              {lastResult.result === 'ALLOWED' && (
                <CheckCircle2 className="mx-auto h-14 w-14 text-success" />
              )}
              {lastResult.result === 'EXIT' && <LogOut className="mx-auto h-14 w-14 text-gold" />}
              {lastResult.result === 'DENIED' && (
                <ShieldAlert className="mx-auto h-14 w-14 text-danger" />
              )}
              <p
                className={`mt-2 font-display text-2xl tracking-wider ${
                  lastResult.result === 'ALLOWED'
                    ? 'text-success'
                    : lastResult.result === 'EXIT'
                      ? 'text-gold'
                      : 'text-danger'
                }`}
              >
                {lastResult.result === 'ALLOWED'
                  ? 'ACCESO PERMITIDO'
                  : lastResult.result === 'EXIT'
                    ? 'SALIDA REGISTRADA'
                    : 'ACCESO BLOQUEADO'}
              </p>
              {lastResult.member && (
                <p className="mt-1 text-lg font-medium text-zinc-100">
                  {lastResult.member.firstName} {lastResult.member.lastName}
                  {lastResult.member.planName && (
                    <span className="ml-2 text-sm text-zinc-500">{lastResult.member.planName}</span>
                  )}
                </p>
              )}
              <p className="mt-1 text-sm text-zinc-400">{lastResult.message}</p>
              {lastResult.membershipEnd && (
                <p className="mt-1 text-xs text-zinc-600">
                  Vence: {new Date(lastResult.membershipEnd).toLocaleString('es-AR')}
                </p>
              )}
            </div>
          )}
        </section>

        {/* Panel del día */}
        <section className="rounded-xl border border-line bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-xl">
              <QrCode className="h-5 w-5 text-gold" /> Ingresos de hoy
            </h2>
            <button onClick={loadToday} className="text-zinc-500 hover:text-gold" title="Refrescar">
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>

          {today && (
            <div className="mb-4 grid grid-cols-3 gap-3 text-center">
              <div className="rounded-lg border border-success/30 bg-success/5 p-3">
                <p className="font-display text-3xl text-success">{today.count}</p>
                <p className="text-xs text-zinc-500">Ingresos</p>
              </div>
              <div className="rounded-lg border border-gold/30 bg-gold/5 p-3">
                <p className="font-display text-3xl text-gold">{today.inside}</p>
                <p className="text-xs text-zinc-500">Adentro</p>
              </div>
              <div className="rounded-lg border border-danger/30 bg-danger/5 p-3">
                <p className="font-display text-3xl text-danger">{today.denied}</p>
                <p className="text-xs text-zinc-500">Bloqueados</p>
              </div>
            </div>
          )}

          <ul className="max-h-[420px] divide-y divide-line/60 overflow-y-auto">
            {today?.checkIns.length === 0 && (
              <li className="py-8 text-center text-sm text-zinc-500">Aún no hay movimientos hoy</li>
            )}
            {today?.checkIns.map((c) => (
              <li key={c.id} className="flex items-center justify-between py-2.5 text-sm">
                <div>
                  <p className="text-zinc-200">
                    {c.member.lastName}, {c.member.firstName}
                    <span
                      className={`ml-2 rounded px-1.5 py-0.5 text-xs ${
                        c.result === 'ALLOWED'
                          ? 'bg-success/15 text-success'
                          : 'bg-danger/15 text-danger'
                      }`}
                    >
                      {c.result === 'ALLOWED' ? 'ingreso' : 'bloqueado'}
                    </span>
                  </p>
                  <p className="text-xs text-zinc-500">
                    {formatDateTime(c.entryAt)}
                    {c.exitAt && ` → salió ${formatDateTime(c.exitAt).slice(-5)}`}
                  </p>
                </div>
                {c.result === 'ALLOWED' && !c.exitAt && (
                  <button
                    onClick={() => handleExit(c.id)}
                    className="rounded border border-line px-2 py-1 text-xs text-zinc-400 hover:border-gold hover:text-gold"
                  >
                    Registrar salida
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
