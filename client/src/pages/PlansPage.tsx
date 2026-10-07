import { useEffect, useMemo, useState } from 'react';
import { Pencil, Plus, Save, Tag, X } from 'lucide-react';
import { api } from '@/lib/api';
import { plansApi } from '@/lib/api.members';
import { formatCurrency } from '@/lib/format';
import { useAuthStore } from '@/store/auth.store';
import { PLAN_TYPE_LABEL, type Plan, type PlanType } from '@/types';

export default function PlansPage() {
  const user = useAuthStore((s) => s.user);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ name: string; price: string; durationDays: string }>({
    name: '',
    price: '',
    durationDays: '',
  });
  const [showNew, setShowNew] = useState(false);

  const isAdmin = user?.role === 'SUPER_ADMIN';

  async function load() {
    setLoading(true);
    try {
      const { plans } = await plansApi.list();
      setPlans(plans);
      setError(null);
    } catch (e) {
      setError((e as { message?: string }).message ?? 'Error al cargar planes');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const grouped = useMemo(() => {
    const g: Record<string, Plan[]> = { TIME: [], DAY_PASS: [], TRIAL_DAY: [] };
    for (const p of plans) g[p.type].push(p);
    return g;
  }, [plans]);

  function startEdit(p: Plan) {
    setEditingId(p.id);
    setDraft({
      name: p.name,
      price: String(Number(p.price)),
      durationDays: p.durationDays ? String(p.durationDays) : '',
    });
  }

  async function saveEdit(id: string) {
    try {
      await api(`/plans/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: draft.name,
          price: Number(draft.price),
          durationDays: draft.durationDays ? Number(draft.durationDays) : null,
        }),
      });
      setEditingId(null);
      await load();
    } catch (e) {
      setError((e as { message?: string }).message ?? 'Error al guardar plan');
    }
  }

  const inputCls =
    'rounded-lg border border-line bg-background px-2 py-1.5 text-sm outline-none focus:border-gold focus:ring-1 focus:ring-gold';

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl text-gold">PLANES Y PRECIOS</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Mensualidades, pases diarios y días de prueba
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowNew((v) => !v)}
            className="inline-flex items-center gap-2 rounded-lg bg-gold px-4 py-2.5 font-medium text-background transition-all hover:bg-gold-bright hover:shadow-gold-glow"
          >
            <Plus className="h-4 w-4" /> Nuevo plan
          </button>
        )}
      </header>

      {error && (
        <div className="mb-4 rounded-md border border-danger/40 bg-danger/10 px-4 py-2 text-sm text-danger">
          {error}
        </div>
      )}

      {showNew && isAdmin && (
        <NewPlanForm
          onCreated={() => {
            setShowNew(false);
            load();
          }}
          onCancel={() => setShowNew(false)}
        />
      )}

      {loading ? (
        <p className="text-zinc-500">Cargando planes...</p>
      ) : (
        <div className="space-y-8">
          {(['TIME', 'DAY_PASS', 'TRIAL_DAY'] as PlanType[]).map((type) => (
            <section key={type}>
              <h2 className="mb-3 flex items-center gap-2 text-lg text-zinc-300">
                <Tag className="h-4 w-4 text-gold" />
                {PLAN_TYPE_LABEL[type]}
              </h2>
              <div className="overflow-x-auto rounded-xl border border-line bg-card">
                <table className="w-full min-w-[560px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-line text-xs uppercase tracking-wider text-zinc-500">
                      <th className="px-4 py-3 font-medium">Plan</th>
                      <th className="px-4 py-3 font-medium">Precio</th>
                      <th className="px-4 py-3 font-medium">Duración</th>
                      <th className="px-4 py-3 font-medium">Estado</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {grouped[type].length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-6 text-center text-zinc-500">
                          No hay planes de este tipo
                        </td>
                      </tr>
                    )}
                    {grouped[type].map((p) =>
                      editingId === p.id ? (
                        <tr key={p.id} className="border-b border-line/50 bg-gold/[0.04]">
                          <td className="px-4 py-2">
                            <input
                              className={`${inputCls} w-40`}
                              value={draft.name}
                              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                            />
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              className={`${inputCls} w-24`}
                              value={draft.price}
                              onChange={(e) => setDraft({ ...draft, price: e.target.value })}
                            />
                          </td>
                          <td className="px-4 py-2">
                            {type === 'TIME' ? (
                              <input
                                type="number"
                                min="1"
                                className={`${inputCls} w-20`}
                                value={draft.durationDays}
                                onChange={(e) => setDraft({ ...draft, durationDays: e.target.value })}
                              />
                            ) : (
                              <span className="text-xs text-zinc-500">
                                {type === 'DAY_PASS' ? '1 día' : '1 día'}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-2 text-xs text-zinc-500">—</td>
                          <td className="px-4 py-2">
                            <div className="flex gap-1">
                              <button
                                onClick={() => saveEdit(p.id)}
                                className="rounded p-1.5 text-success hover:bg-success/10"
                                title="Guardar"
                              >
                                <Save className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => setEditingId(null)}
                                className="rounded p-1.5 text-zinc-400 hover:bg-zinc-800"
                                title="Cancelar"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        <tr key={p.id} className="border-b border-line/50 last:border-0">
                          <td className="px-4 py-3 font-medium text-zinc-200">{p.name}</td>
                          <td className="px-4 py-3 text-gold">{formatCurrency(p.price)}</td>
                          <td className="px-4 py-3 text-zinc-400">
                            {type === 'TIME' && p.durationDays ? `${p.durationDays} días` : '1 día'}
                          </td>
                          <td className="px-4 py-3">
                            {p.isActive ? (
                              <span className="text-xs text-success">Activo</span>
                            ) : (
                              <span className="text-xs text-zinc-500">Inactivo</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {isAdmin && (
                              <button
                                onClick={() => startEdit(p)}
                                className="rounded p-1.5 text-zinc-400 hover:bg-gold/10 hover:text-gold"
                                title="Editar"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function NewPlanForm({
  onCreated,
  onCancel,
}: {
  onCreated: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState('');
  const [type, setType] = useState<PlanType>('TIME');
  const [price, setPrice] = useState('');
  const [durationDays, setDurationDays] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (type === 'TIME' && (!durationDays || Number(durationDays) < 1)) {
      setError('Los planes por tiempo requieren duración en días');
      return;
    }
    setSaving(true);
    try {
      await api('/plans', {
        method: 'POST',
        body: JSON.stringify({
          name,
          type,
          price: Number(price || 0),
          durationDays: type === 'TIME' && durationDays ? Number(durationDays) : null,
        }),
      });
      onCreated();
    } catch (e2) {
      setError((e2 as { message?: string }).message ?? 'Error al crear plan');
      setSaving(false);
    }
  }

  const inputCls =
    'w-full rounded-lg border border-line bg-background px-3 py-2.5 text-sm outline-none focus:border-gold focus:ring-1 focus:ring-gold';

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-6 space-y-4 rounded-xl border border-gold/30 bg-card p-6"
    >
      <h2 className="text-xl">NUEVO PLAN</h2>
      {error && (
        <div className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-4">
        <label className="block sm:col-span-2">
          <span className="mb-1 block text-xs uppercase tracking-wider text-zinc-400">Nombre</span>
          <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs uppercase tracking-wider text-zinc-400">Tipo</span>
          <select className={inputCls} value={type} onChange={(e) => setType(e.target.value as PlanType)}>
            <option value="TIME">Por tiempo</option>
            <option value="DAY_PASS">Pase diario</option>
            <option value="TRIAL_DAY">Día de prueba</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs uppercase tracking-wider text-zinc-400">Precio</span>
          <input
            type="number"
            step="0.01"
            min="0"
            className={inputCls}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        </label>
        {type === 'TIME' && (
          <label className="block">
            <span className="mb-1 block text-xs uppercase tracking-wider text-zinc-400">
              Duración (días)
            </span>
            <input
              type="number"
              min="1"
              className={inputCls}
              value={durationDays}
              onChange={(e) => setDurationDays(e.target.value)}
            />
          </label>
        )}
      </div>
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-gold px-6 py-2 text-sm font-medium text-background hover:bg-gold-bright disabled:opacity-50"
        >
          {saving ? 'Creando...' : 'Crear plan'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-line px-6 text-sm text-zinc-400 hover:text-zinc-200"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

