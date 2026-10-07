import { FormEvent, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { KeyRound, Lock } from 'lucide-react';
import { api } from '@/lib/api';

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError('Las contraseñas no coinciden');
      return;
    }
    setLoading(true);
    try {
      await api('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, password }),
      });
      setDone(true);
      setTimeout(() => navigate('/login', { replace: true }), 2000);
    } catch (e2) {
      setError((e2 as { message?: string }).message ?? 'Error al restablecer');
    } finally {
      setLoading(false);
    }
  }

  const inputCls =
    'w-full rounded-lg border border-line bg-background px-3 py-2.5 text-sm outline-none placeholder:text-zinc-600 focus:border-gold focus:ring-1 focus:ring-gold';

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm rounded-xl border border-danger/40 bg-card p-6 text-center">
          <p className="text-sm text-danger">Falta el token de recuperación.</p>
          <Link to="/forgot-password" className="mt-3 inline-block text-sm text-gold hover:underline">
            Pedir uno nuevo
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center">
          <img src="/assets/logo/logo.svg" alt="NEW START GYM" className="h-28 w-auto" />
        </div>

        <div className="rounded-xl border border-line bg-card p-6">
          {done ? (
            <p className="text-center text-sm text-success">
              ¡Contraseña actualizada! Te llevamos al login...
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
                  {error}
                </div>
              )}
              <div>
                <h1 className="text-xl">NUEVA CONTRASEÑA</h1>
                <p className="mt-1 text-sm text-zinc-500">Elegí una contraseña de al menos 6 caracteres.</p>
              </div>
              <label className="block">
                <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-zinc-400">
                  Nueva contraseña
                </span>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    className={`${inputCls} pl-10`}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-zinc-400">
                  Confirmar contraseña
                </span>
                <div className="relative">
                  <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    className={`${inputCls} pl-10`}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                  />
                </div>
              </label>
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-gold py-2.5 font-display text-lg tracking-widest text-background transition-all hover:bg-gold-bright disabled:opacity-50"
              >
                {loading ? 'GUARDANDO...' : 'RESTABLECER'}
              </button>
            </form>
          )}
        </div>

        <Link
          to="/login"
          className="mt-4 flex items-center justify-center gap-1 text-sm text-zinc-500 hover:text-gold"
        >
          Volver al login
        </Link>
      </div>
    </div>
  );
}
