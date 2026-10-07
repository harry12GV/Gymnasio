import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Plus, Printer, Search, UserPlus } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { membersApi } from '@/lib/api.members';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { downloadQrCredentialsBatch, drawWatermark } from '@/lib/qr';
import { formatDate } from '@/lib/format';
import type { MemberListItem } from '@/types';

const STATUS_FILTERS = [
  { value: 'ALL', label: 'Todos' },
  { value: 'ACTIVE', label: 'Activos' },
  { value: 'EXPIRED', label: 'Vencidos' },
  { value: 'SUSPENDED', label: 'Suspendidos' },
  { value: 'NO_MEMBERSHIP', label: 'Sin membresía' },
];

export default function MembersPage() {
  const [members, setMembers] = useState<MemberListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [printTargets, setPrintTargets] = useState<MemberListItem[] | null>(null);
  const qrWrapRefs = useRef(new Map<string, HTMLDivElement>());

  // Cuando hay socios a imprimir: esperar el render de los QR, pintar marca de agua y generar el PDF
  useEffect(() => {
    if (!printTargets) return;
    let cancelled = false;
    (async () => {
      // doble frame: garantiza que los QRCodeCanvas ya montaron
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      if (cancelled) return;
      const items = printTargets
        .map((m) => {
          const wrap = qrWrapRefs.current.get(m.id);
          const canvas = wrap?.querySelector('canvas');
          if (!canvas) return null;
          drawWatermark(canvas as HTMLCanvasElement);
          return {
            memberName: `${m.firstName} ${m.lastName}`.trim(),
            documentId: m.documentId,
            qrToken: m.qrToken,
            planName: m.planName ?? 'Sin plan',
            endDate: m.membershipEnd
              ? new Date(m.membershipEnd).toLocaleDateString('es-AR')
              : '—',
            canvas: canvas as HTMLCanvasElement,
          };
        })
        .filter((it): it is NonNullable<typeof it> => it !== null);
      if (items.length > 0) downloadQrCredentialsBatch(items);
      setPrintTargets(null);
    })();
    return () => {
      cancelled = true;
    };
  }, [printTargets]);

  useEffect(() => {
    const t = setTimeout(() => {
      loadMembers();
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, status, page]);

  async function loadMembers() {
    setLoading(true);
    setError(null);
    try {
      const res = await membersApi.list({ search, status, page, pageSize });
      setMembers(res.data);
      setTotal(res.total);
    } catch (e) {
      const err = e as { message?: string };
      setError(err.message ?? 'Error al cargar socios');
    } finally {
      setLoading(false);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const activeFilter = useMemo(
    () => STATUS_FILTERS.find((f) => f.value === status),
    [status]
  );

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl text-gold">SOCIOS</h1>
          <p className="mt-1 text-sm text-zinc-500">{total} registrados</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setPrintTargets(members)}
            disabled={loading || members.length === 0}
            className="inline-flex items-center gap-2 rounded-lg border border-gold/50 px-4 py-2.5 text-sm text-gold transition-colors hover:bg-gold/10 disabled:opacity-40"
            title="Genera un PDF con la credencial de cada socio de esta página"
          >
            <Printer className="h-4 w-4" />
            Imprimir credenciales
          </button>
          <Link
            to="/members/new"
            className="inline-flex items-center gap-2 rounded-lg bg-gold px-4 py-2.5 font-medium text-background transition-all hover:bg-gold-bright hover:shadow-gold-glow"
          >
            <UserPlus className="h-4 w-4" />
            Nuevo socio
          </Link>
        </div>
      </header>

      {/* QRs ocultos para el PDF por lote */}
      {printTargets && (
        <div aria-hidden className="pointer-events-none fixed -left-[9999px] top-0">
          {printTargets.map((m) => (
            <div
              key={m.id}
              ref={(el) => {
                if (el) qrWrapRefs.current.set(m.id, el);
                else qrWrapRefs.current.delete(m.id);
              }}
            >
              <QRCodeCanvas value={m.qrToken} size={184} level="M" />
            </div>
          ))}
        </div>
      )}

      {/* Controles */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[240px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Buscar por nombre, DNI o teléfono..."
            className="w-full rounded-lg border border-line bg-background py-2.5 pl-10 pr-3 text-sm outline-none transition-colors placeholder:text-zinc-600 focus:border-gold focus:ring-1 focus:ring-gold"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
            >
              <Plus className="h-4 w-4 rotate-45" />
            </button>
          )}
        </div>

        <div className="flex gap-1 rounded-lg border border-line bg-card p-1">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => {
                setStatus(f.value);
                setPage(1);
              }}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                status === f.value
                  ? 'bg-gold text-background'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-danger/40 bg-danger/10 px-4 py-2 text-sm text-danger">
          {error}
        </div>
      )}

      {/* Tabla */}
      <div className="overflow-x-auto rounded-xl border border-line bg-card">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-line text-xs uppercase tracking-wider text-zinc-500">
              <th className="px-4 py-3 font-medium">Socio</th>
              <th className="px-4 py-3 font-medium">DNI/Cédula</th>
              <th className="px-4 py-3 font-medium">Teléfono</th>
              <th className="px-4 py-3 font-medium">Plan actual</th>
              <th className="px-4 py-3 font-medium">Vence</th>
              <th className="px-4 py-3 font-medium">Estado</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-zinc-500">
                  Cargando socios...
                </td>
              </tr>
            )}
            {!loading && members.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-zinc-500">
                  No hay socios que coincidan {activeFilter && `con "${activeFilter.label}"`}.{' '}
                  <Link to="/members/new" className="text-gold hover:underline">
                    Registrar el primero
                  </Link>
                </td>
              </tr>
            )}
            {!loading &&
              members.map((m) => (
                <tr
                  key={m.id}
                  className="border-b border-line/50 transition-colors last:border-0 hover:bg-gold/[0.03]"
                >
                  <td className="px-4 py-3">
                    <Link to={`/members/${m.id}`} className="flex items-center gap-3 group">
                      <Avatar member={m} />
                      <div>
                        <p className="font-medium text-zinc-200 group-hover:text-gold">
                          {m.lastName}, {m.firstName}
                        </p>
                        {m.email && <p className="text-xs text-zinc-500">{m.email}</p>}
                      </div>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-zinc-400">{m.documentId}</td>
                  <td className="px-4 py-3 text-zinc-400">{m.phone}</td>
                  <td className="px-4 py-3 text-zinc-400">{m.planName ?? '—'}</td>
                  <td className="px-4 py-3 text-zinc-400">{formatDate(m.membershipEnd)}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={m.currentStatus} />
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="rounded-lg border border-line p-2 text-zinc-400 disabled:opacity-40 hover:border-gold hover:text-gold"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm text-zinc-500">
            Página {page} de {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="rounded-lg border border-line p-2 text-zinc-400 disabled:opacity-40 hover:border-gold hover:text-gold"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

function Avatar({ member }: { member: MemberListItem }) {
  if (member.photoUrl) {
    return (
      <img
        src={member.photoUrl}
        alt={`${member.firstName} ${member.lastName}`}
        className="h-10 w-10 rounded-full border border-line object-cover"
      />
    );
  }
  const initials = `${member.firstName[0] ?? ''}${member.lastName[0] ?? ''}`.toUpperCase();
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-background font-display text-sm text-gold">
      {initials}
    </div>
  );
}
