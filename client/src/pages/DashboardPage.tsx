import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  AlertTriangle,
  CalendarClock,
  Phone,
  TrendingUp,
  UserCheck,
  UserMinus,
  UserPlus,
  Users,
} from 'lucide-react';
import { api } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/format';

interface DashboardData {
  members: { active: number; expired: number; suspended: number; newThisMonth: number };
  revenue: { month: number; memberships: number; dayPasses: number; other: number };
  signups30d: { date: string; count: number }[];
  expiringSoon: {
    id: string;
    endDate: string;
    member: { id: string; firstName: string; lastName: string; phone: string; photoUrl: string | null };
    plan: { name: string };
  }[];
  activeToday: number;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    api<DashboardData>('/dashboard/summary')
      .then(setData)
      .catch((e) => setError((e as { message?: string }).message ?? 'Error'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Auto-actualización: cada 30s y al volver a la pestaña.
  // Así los cobros de caja/venta rápida se reflejan solos, sin recargar.
  useEffect(() => {
    const interval = setInterval(load, 30_000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') load();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [load]);

  if (loading) return <p className="text-zinc-500">Cargando métricas...</p>;
  if (error || !data)
    return (
      <div className="rounded-lg border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
        {error ?? 'Error al cargar el dashboard'}
      </div>
    );

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-3xl text-gold">DASHBOARD</h1>
        <p className="mt-1 text-sm text-zinc-500">Resumen general del gimnasio</p>
      </header>

      {/* Cards principales */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card
          icon={Users}
          label="Socios activos"
          value={String(data.members.active)}
          accent="text-success"
        />
        <Card
          icon={UserMinus}
          label="Vencidos / sin membresía"
          value={String(data.members.expired)}
          accent="text-danger"
        />
        <Card
          icon={UserPlus}
          label="Nuevos del mes"
          value={String(data.members.newThisMonth)}
          accent="text-gold"
        />
        <Card
          icon={UserCheck}
          label="Ingresos de hoy"
          value={String(data.activeToday)}
          accent="text-gold"
        />
      </div>

      {/* Ingresos del mes */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-gold/40 bg-card p-5 sm:col-span-2">
          <p className="text-xs uppercase tracking-wider text-zinc-500">Ingresos del mes</p>
          <p className="mt-1 font-display text-4xl text-gold">{formatCurrency(data.revenue.month)}</p>
        </div>
        <div className="rounded-xl border border-line bg-card p-5">
          <p className="text-xs uppercase tracking-wider text-zinc-500">Mensualidades</p>
          <p className="mt-1 font-display text-2xl text-zinc-100">
            {formatCurrency(data.revenue.memberships)}
          </p>
        </div>
        <div className="rounded-xl border border-line bg-card p-5">
          <p className="text-xs uppercase tracking-wider text-zinc-500">Pases diarios</p>
          <p className="mt-1 font-display text-2xl text-zinc-100">
            {formatCurrency(data.revenue.dayPasses)}
          </p>
        </div>
      </div>

      {/* Gráfico + Por vencer */}
      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rounded-xl border border-line bg-card p-6 lg:col-span-2">
          <h2 className="mb-4 flex items-center gap-2 text-xl">
            <TrendingUp className="h-5 w-5 text-gold" /> Inscripciones últimos 30 días
          </h2>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={data.signups30d}>
              <defs>
                <linearGradient id="goldFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#D4AF37" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#D4AF37" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#2A2A2A" vertical={false} />
              <XAxis dataKey="date" stroke="#71717a" fontSize={10} tickLine={false} interval={4} />
              <YAxis stroke="#71717a" fontSize={11} tickLine={false} allowDecimals={false} width={28} />
              <Tooltip
                contentStyle={{
                  background: '#1A1A1A',
                  border: '1px solid #2A2A2A',
                  borderRadius: 8,
                  color: '#e4e4e7',
                }}
              />
              <Area
                type="monotone"
                dataKey="count"
                name="Inscripciones"
                stroke="#D4AF37"
                strokeWidth={2}
                fill="url(#goldFill)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </section>

        <section className="rounded-xl border border-line bg-card p-6">
          <h2 className="mb-4 flex items-center gap-2 text-xl">
            <CalendarClock className="h-5 w-5 text-gold" /> Por vencer (7 días)
          </h2>
          {data.expiringSoon.length === 0 ? (
            <p className="text-sm text-zinc-500">Nadie vence en los próximos 7 días 🎉</p>
          ) : (
            <ul className="max-h-[300px] space-y-3 overflow-y-auto pr-1">
              {data.expiringSoon.map((e) => (
                <li
                  key={e.id}
                  className="flex items-center gap-3 rounded-lg border border-warning/30 bg-warning/5 p-3"
                >
                  <div className="min-w-0 flex-1">
                    <Link
                      to={`/members/${e.member.id}`}
                      className="truncate text-sm font-medium text-zinc-200 hover:text-gold"
                    >
                      {e.member.lastName}, {e.member.firstName}
                    </Link>
                    <p className="text-xs text-zinc-500">
                      {e.plan.name} · vence {formatDate(e.endDate)}
                    </p>
                  </div>
                  <a
                    href={`tel:${e.member.phone}`}
                    className="rounded-lg border border-line p-2 text-zinc-400 hover:border-gold hover:text-gold"
                    title={`Llamar ${e.member.phone}`}
                  >
                    <Phone className="h-3.5 w-3.5" />
                  </a>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 flex items-start gap-1.5 text-xs text-zinc-600">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning/60" />
            Contactalos para renovar antes del vencimiento.
          </p>
        </section>
      </div>
    </div>
  );
}

function Card({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div className="rounded-xl border border-line bg-card p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-wider text-zinc-500">{label}</p>
        <Icon className={`h-5 w-5 ${accent}`} />
      </div>
      <p className={`mt-2 font-display text-4xl ${accent}`}>{value}</p>
    </div>
  );
}
