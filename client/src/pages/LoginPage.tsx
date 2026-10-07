import { FormEvent, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertTriangle, Lock, LogIn, Mail } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';

export default function LoginPage() {
  const navigate = useNavigate();
  const { user, login, loading, error } = useAuthStore();
  const [searchParams] = useSearchParams();
  const sessionExpired = searchParams.get('expired') === '1';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  if (user) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      await login(email, password);
      navigate('/', { replace: true });
    } catch {
      // el error ya está en el store
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      {/* Textura de fondo sutil */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(45deg, #D4AF37 0, #D4AF37 1px, transparent 0, transparent 10px)',
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative w-full max-w-sm"
      >
        {/* Logo oficial centrado */}
        <div className="mb-8 flex flex-col items-center">
          <img
            src="/assets/logo/logo.svg"
            alt="NEW START GYM"
            className="h-36 w-auto drop-shadow-[0_0_25px_rgba(212,175,55,0.3)]"
          />
          <p className="mt-3 font-display text-sm tracking-[0.35em] text-gold/70">
            SISTEMA DE GESTIÓN
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-line bg-card p-6 space-y-4"
        >
          {sessionExpired && !error && (
            <div className="flex items-start gap-2 rounded-md border border-gold/40 bg-gold/10 px-3 py-2 text-sm text-gold">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>Tu sesión expiró. Ingresá de nuevo para continuar.</span>
            </div>
          )}

          {error && (
            <div className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
              {error}
            </div>
          )}

          <label className="block">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-zinc-400">
              Correo
            </span>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@newstartgym.com"
                className="w-full rounded-lg border border-line bg-background py-2.5 pl-10 pr-3 text-sm outline-none transition-colors placeholder:text-zinc-600 focus:border-gold focus:ring-1 focus:ring-gold"
              />
            </div>
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-zinc-400">
              Contraseña
            </span>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-lg border border-line bg-background py-2.5 pl-10 pr-3 text-sm outline-none transition-colors placeholder:text-zinc-600 focus:border-gold focus:ring-1 focus:ring-gold"
              />
            </div>
          </label>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-gold py-2.5 font-display text-lg tracking-widest text-background transition-all hover:bg-gold-bright hover:shadow-gold-glow disabled:cursor-not-allowed disabled:opacity-50"
          >
            <LogIn className="h-4 w-4" />
            {loading ? 'INGRESANDO...' : 'INGRESAR'}
          </button>

          <Link
            to="/forgot-password"
            className="block w-full text-center text-xs text-zinc-500 transition-colors hover:text-gold"
          >
            ¿Olvidaste tu contraseña?
          </Link>
        </form>

        <p className="mt-6 text-center text-xs text-zinc-600">
          NEW START GYM © {new Date().getFullYear()} — Fase 1
        </p>
      </motion.div>
    </div>
  );
}
