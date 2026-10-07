import { FormEvent, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Camera, Save } from 'lucide-react';
import { membersApi } from '@/lib/api.members';
import { fileToDataUrl } from '@/lib/photo';
import { toDateInput } from '@/lib/format';

interface FormState {
  firstName: string;
  lastName: string;
  documentId: string;
  phone: string;
  email: string;
  birthDate: string; // yyyy-mm-dd
  emergencyContactName: string;
  emergencyContactPhone: string;
  notes: string;
  photoUrl: string | null;
}

const EMPTY: FormState = {
  firstName: '',
  lastName: '',
  documentId: '',
  phone: '',
  email: '',
  birthDate: '',
  emergencyContactName: '',
  emergencyContactPhone: '',
  notes: '',
  photoUrl: null,
};

export default function MemberFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<FormState>(EMPTY);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    membersApi
      .get(id)
      .then(({ member }) => {
        setForm({
          firstName: member.firstName,
          lastName: member.lastName,
          documentId: member.documentId,
          phone: member.phone,
          email: member.email ?? '',
          birthDate: toDateInput(member.birthDate),
          emergencyContactName: member.emergencyContactName ?? '',
          emergencyContactPhone: member.emergencyContactPhone ?? '',
          notes: member.notes ?? '',
          photoUrl: member.photoUrl,
        });
      })
      .catch((e) => setError((e as { message?: string }).message ?? 'Error al cargar socio'))
      .finally(() => setLoading(false));
  }, [id]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handlePhoto(file: File | undefined) {
    if (!file) return;
    try {
      const dataUrl = await fileToDataUrl(file);
      set('photoUrl', dataUrl);
    } catch (e) {
      setError((e as { message?: string }).message ?? 'Error al procesar la foto');
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.firstName.trim() || !form.lastName.trim()) {
      setError('Nombre y apellido son obligatorios');
      return;
    }
    if (form.documentId.trim().length < 5) {
      setError('El DNI/cédula debe tener al menos 5 caracteres');
      return;
    }
    if (form.phone.trim().length < 6) {
      setError('El teléfono debe tener al menos 6 caracteres');
      return;
    }

    const payload = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      documentId: form.documentId.trim(),
      phone: form.phone.trim(),
      email: form.email.trim() || null,
      birthDate: form.birthDate ? new Date(`${form.birthDate}T12:00:00`).toISOString() : null,
      emergencyContactName: form.emergencyContactName.trim() || null,
      emergencyContactPhone: form.emergencyContactPhone.trim() || null,
      notes: form.notes.trim() || null,
      photoUrl: form.photoUrl,
    };

    setSaving(true);
    try {
      if (isEdit) {
        await membersApi.update(id!, payload);
        navigate(`/members/${id}`);
      } else {
        const { member } = await membersApi.create(payload);
        navigate(`/members/${member.id}`);
      }
    } catch (e2) {
      setError((e2 as { message?: string }).message ?? 'Error al guardar');
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-zinc-500">Cargando socio...</p>;
  }

  const inputCls =
    'w-full rounded-lg border border-line bg-background px-3 py-2.5 text-sm outline-none transition-colors placeholder:text-zinc-600 focus:border-gold focus:ring-1 focus:ring-gold';
  const labelCls = 'mb-1 block text-xs font-medium uppercase tracking-wider text-zinc-400';

  return (
    <div className="mx-auto max-w-2xl">
      <button
        onClick={() => navigate(-1)}
        className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-400 hover:text-gold"
      >
        <ArrowLeft className="h-4 w-4" /> Volver
      </button>

      <h1 className="mb-6 text-3xl text-gold">
        {isEdit ? 'EDITAR SOCIO' : 'NUEVO SOCIO'}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6 rounded-xl border border-line bg-card p-6">
        {error && (
          <div className="rounded-md border border-danger/40 bg-danger/10 px-4 py-2 text-sm text-danger">
            {error}
          </div>
        )}

        {/* Foto */}
        <div className="flex items-center gap-4">
          <div className="relative">
            {form.photoUrl ? (
              <img
                src={form.photoUrl}
                alt="Foto del socio"
                className="h-20 w-20 rounded-full border-2 border-gold/50 object-cover"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full border border-line bg-background">
                <Camera className="h-7 w-7 text-zinc-600" />
              </div>
            )}
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="absolute -bottom-1 -right-1 rounded-full bg-gold p-1.5 text-background hover:bg-gold-bright"
              title="Cambiar foto"
            >
              <Camera className="h-3.5 w-3.5" />
            </button>
          </div>
          <div>
            <p className="text-sm text-zinc-300">Foto del socio</p>
            <p className="text-xs text-zinc-500">JPG o PNG. Se recorta automáticamente.</p>
            {form.photoUrl && (
              <button
                type="button"
                onClick={() => set('photoUrl', null)}
                className="mt-1 text-xs text-danger hover:underline"
              >
                Quitar foto
              </button>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handlePhoto(e.target.files?.[0])}
          />
        </div>

        {/* Datos personales */}
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className={labelCls}>Nombre *</span>
            <input
              className={inputCls}
              value={form.firstName}
              onChange={(e) => set('firstName', e.target.value)}
              placeholder="Juan"
              required
            />
          </label>
          <label className="block">
            <span className={labelCls}>Apellido *</span>
            <input
              className={inputCls}
              value={form.lastName}
              onChange={(e) => set('lastName', e.target.value)}
              placeholder="Pérez"
              required
            />
          </label>
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
              placeholder="+54 9 11 5555-5555"
              required
            />
          </label>
          <label className="block">
            <span className={labelCls}>Email</span>
            <input
              type="email"
              className={inputCls}
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
              placeholder="juan@email.com"
            />
          </label>
          <label className="block">
            <span className={labelCls}>Fecha de nacimiento</span>
            <input
              type="date"
              className={inputCls}
              value={form.birthDate}
              onChange={(e) => set('birthDate', e.target.value)}
            />
          </label>
        </div>

        {/* Contacto de emergencia */}
        <fieldset className="rounded-lg border border-line p-4">
          <legend className="px-2 text-xs font-medium uppercase tracking-wider text-gold">
            Contacto de emergencia
          </legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className={labelCls}>Nombre</span>
              <input
                className={inputCls}
                value={form.emergencyContactName}
                onChange={(e) => set('emergencyContactName', e.target.value)}
                placeholder="María Pérez"
              />
            </label>
            <label className="block">
              <span className={labelCls}>Teléfono</span>
              <input
                className={inputCls}
                value={form.emergencyContactPhone}
                onChange={(e) => set('emergencyContactPhone', e.target.value)}
                placeholder="+54 9 11 4444-4444"
              />
            </label>
          </div>
        </fieldset>

        <label className="block">
          <span className={labelCls}>Notas internas</span>
          <textarea
            className={`${inputCls} min-h-[80px] resize-y`}
            value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
            placeholder="Lesiones, observaciones, preferencias..."
          />
        </label>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-gold py-3 font-display text-lg tracking-widest text-background transition-all hover:bg-gold-bright hover:shadow-gold-glow disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {saving ? 'GUARDANDO...' : 'GUARDAR SOCIO'}
          </button>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-lg border border-line px-6 text-sm text-zinc-400 hover:border-zinc-500 hover:text-zinc-200"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
