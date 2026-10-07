import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Mail, MailCheck } from 'lucide-react';
import { api } from '@/lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [devToken, setDevToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await api<{ message: string; devToken?: string }>('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      setSent(true);
      setDevToken(res.devToken ?? null);
    } catch (e2) {
      setError((e2 as { message?: string }).message ?? 'Error al enviar');
    } finally {
      setLoading(false);
    }
  }

  const inputCls =
    'w-full rounded-lg border border-line bg-background px-3 py-2.5 text-sm outline-none placeholder:text-zinc-600 focus:border-gold focus:ring-1 focus:ring-gold';

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center">
          <img src="/assets/logo/logo.svg" alt="NEW START GYM" className="h-28 w-auto" />
        </div>

        <div className="rounded-xl border border-line bg-card p-6">
          {sent ? (
            <div className="text-center">
              <MailCheck className="mx-auto h-12 w-12 text-success" />
              <h1 className="mt-3 text-xl">REVISÁ TU CORREO</h1>
              <p className="mt-2 text-sm text-zinc-400">
                Si el email está registrado, te enviamos un enlace para restablecer la contraseña.
              </p>
              {devToken && (
                <div className="mt-4 rounded-lg border border-gold/40 bg-gold/5 p-3 text-left">
                  <p className="text-xs text-gold">MODO DESARROLLO (sin servidor de correo):</p>
                  <p className="mt-1 break-all font-mono text-xs text-zinc-300">{devToken}</p>
                  <Link
                    to={`/reset-password?token=${devToken}`}
                    className="mt-2 inline-block text-xs text-gold hover:underline"
                  >
                    Continuar al reseteo →
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
                  {error}
                </div>
              )}
              <div>
                <h1 className="text-xl">RECUPERAR CONTRASEÑA</h1>
                <p className="mt-1 text-sm text-zinc-500">
                  Ingresá tu email y te enviaremos un enlace de recuperación.
                </p>
              </div>
              <label className="block">
                <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-zinc-400">
                  Email
                </span>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="email"
                    required
                    className={`${inputCls} pl-10`}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tu@email.com"
                  />
                </div>
              </label>
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-gold py-2.5 font-display text-lg tracking-widest text-background transition-all hover:bg-gold-bright disabled:opacity-50"
              >
                {loading ? 'ENVIANDO...' : 'ENVIAR ENLACE'}
              </button>
            </form>
          )}
        </div>

        <Link
          to="/login"
          className="mt-4 flex items-center justify-center gap-1 text-sm text-zinc-500 hover:text-gold"
        >
          <ArrowLeft className="h-4 w-4" /> Volver al login
        </Link>
      </div>
    </div>
  );
}
