import { Link } from 'react-router-dom';
import { Navigate } from 'react-router-dom';
import { ArrowRight, CreditCard, QrCode, Users, Zap } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';

export default function HomePage() {
  const user = useAuthStore((s) => s.user);

  // El socio va directo a su portal
  if (user?.role === 'MEMBER') {
    return <Navigate to="/portal" replace />;
  }

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-3xl text-gold">HOLA, {user?.name.split(' ')[0].toUpperCase()}</h1>
        <p className="mt-1 text-sm text-zinc-500">Panel de gestión — NEW START GYM</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          to="/dashboard"
          className="group rounded-xl border border-line bg-card p-6 transition-colors hover:border-gold/50"
        >
          <Users className="h-8 w-8 text-gold" />
          <h2 className="mt-4 text-xl">Dashboard</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Métricas, ingresos del mes e inscripciones.
          </p>
          <span className="mt-4 inline-flex items-center gap-1 text-sm text-gold opacity-0 transition-opacity group-hover:opacity-100">
            Ver métricas <ArrowRight className="h-4 w-4" />
          </span>
        </Link>

        <Link
          to="/members"
          className="group rounded-xl border border-line bg-card p-6 transition-colors hover:border-gold/50"
        >
          <Users className="h-8 w-8 text-gold" />
          <h2 className="mt-4 text-xl">Socios</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Registrar, editar y gestionar membresías.
          </p>
          <span className="mt-4 inline-flex items-center gap-1 text-sm text-gold opacity-0 transition-opacity group-hover:opacity-100">
            Ir a socios <ArrowRight className="h-4 w-4" />
          </span>
        </Link>

        <Link
          to="/quick-sale"
          className="group rounded-xl border border-line bg-card p-6 transition-colors hover:border-gold/50"
        >
          <Zap className="h-8 w-8 text-gold" />
          <h2 className="mt-4 text-xl">Venta Rápida</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Pase diario en segundos, QR al instante.
          </p>
          <span className="mt-4 inline-flex items-center gap-1 text-sm text-gold opacity-0 transition-opacity group-hover:opacity-100">
            Cobrar pase <ArrowRight className="h-4 w-4" />
          </span>
        </Link>

        <Link
          to="/cash"
          className="group rounded-xl border border-line bg-card p-6 transition-colors hover:border-gold/50"
        >
          <CreditCard className="h-8 w-8 text-gold" />
          <h2 className="mt-4 text-xl">Caja del Día</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Reporte de cobros, totales y recibos PDF.
          </p>
          <span className="mt-4 inline-flex items-center gap-1 text-sm text-gold opacity-0 transition-opacity group-hover:opacity-100">
            Abrir caja <ArrowRight className="h-4 w-4" />
          </span>
        </Link>

        <Link
          to="/checkin"
          className="group rounded-xl border border-line bg-card p-6 transition-colors hover:border-gold/50"
        >
          <QrCode className="h-8 w-8 text-gold" />
          <h2 className="mt-4 text-xl">Check-in</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Escanear QR y controlar accesos.
          </p>
          <span className="mt-4 inline-flex items-center gap-1 text-sm text-gold opacity-0 transition-opacity group-hover:opacity-100">
            Abrir escáner <ArrowRight className="h-4 w-4" />
          </span>
        </Link>
      </div>
    </div>
  );
}
