# 🏋️ NEW START GYM — Sistema Web de Gestión Integral

**Fase 1 (MVP)** — Gestión de socios, membresías y pases diarios, caja con venta rápida, check-in con QR, portal del socio y dashboard.

## Arquitectura (monorepo npm)

```
new-start-gym/
├── client/          # React 18 + Vite + TypeScript + TailwindCSS (tema dorado)
│   └── public/assets/logo/   # Logo oficial NEW START (SVG)
├── server/          # Express + TypeScript + Prisma + JWT
│   └── prisma/      # Schema, migraciones y seed
└── .github/workflows/ci.yml  # CI: typecheck + build
```

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | React 18, Vite, TypeScript, TailwindCSS, Zustand, React Router v6, Framer Motion, Lucide, Recharts, qrcode.react, html5-qrcode, jsPDF |
| Backend | Node 20 LTS, Express, TypeScript, JWT + bcrypt, Zod, Swagger (OpenAPI) |
| Base de datos | PostgreSQL (Supabase) + Prisma |
| Infra | Git + GitHub (GitFlow), Vercel (front), Render/Railway (back), GitHub Actions |

## Puesta en marcha

### 1. Base de datos (Supabase)
1. Crea el proyecto en [supabase.com/dashboard](https://supabase.com/dashboard).
2. En **Project Settings → Database** copia las cadenas de conexión:
   - **Transaction pooler** (puerto 6543) → `DATABASE_URL`
   - **Session pooler** (puerto 5432) → `DIRECT_URL`
3. Copia `server/.env.example` a `server/.env` y completa las variables.

### 2. Instalar y migrar
```bash
npm install
npm run db:migrate   # crea tablas en Supabase (prisma migrate dev)
npm run db:seed      # super admin + planes + config del gimnasio
```

### 3. Correr en desarrollo
```bash
npm run dev          # API :4000 + Web :5173 (en paralelo)
```
- Web: http://localhost:5173
- API: http://localhost:4000/api/health
- Swagger: http://localhost:4000/api/docs

Credenciales iniciales (del `.env` del server):
`admin@newstartgym.com` / `CambiaEsto123!`

## Roles

| Rol | Acceso |
|---|---|
| `SUPER_ADMIN` | Todo: socios, caja, check-in, dashboard, configuración |
| `RECEPTION` | Socios, venta rápida, pagos, check-in |
| `MEMBER` | Portal del socio: estado de membresía, pagos, QR |

## Roadmap — Fase 1 (12 semanas / 6 sprints)

- [x] **Sprint 1** — Setup, arquitectura, DB, autenticación y roles
- [x] **Sprint 2** — Gestión de socios, planes (mensuales y pases diarios)
- [x] **Sprint 3** — Caja, pagos manuales y Venta Rápida
- [x] **Sprint 4** — QR, check-in y bloqueo de pases vencidos
- [x] **Sprint 5** — Portal del socio y dashboard admin
- [ ] **Sprint 6** — Pruebas, despliegue, capacitación y entrega

### Credenciales demo (sembradas)

| Usuario | Email | Contraseña | Rol |
|---|---|---|---|
| Dueño | `admin@newstartgym.com` | `CambiaEsto123!` | Super Admin |
| Recepción | `recepcion@newstartgym.com` | `CambiaEsto123!` | Recepción |
| Socio (portal) | `socio@newstartgym.com` | `CambiaEsto123!` | Socio |

### Despliegue

- **Frontend:** Vercel (`vercel.json` incluido) — configurar `VITE_API_URL` con la URL del backend
- **Backend:** Render/Railway (`render.yaml` incluido) — configurar `DATABASE_URL`, `DIRECT_URL`, `CLIENT_URL`, `RESEND_API_KEY` (emails reales) y `TZ=America/Argentina/Buenos_Aires`
- **Recuperación de contraseña:** sin `RESEND_API_KEY` funciona en modo dev (token en consola del server)

## Modelo de negocio clave (Fase 1)

- **Planes por tiempo**: Mensual / Trimestral / Anual con activación y vencimiento.
- **Pase Diario (pagado)**: 1 día natural (vence a medianoche) o 24h exactas — configurable en `GymSettings.dayPassMode`.
- **Día de Prueba ($0)**: captación; no genera ingreso en caja.
- **Términos y Condiciones**: checkbox obligatorio al registrar Pase Diario / Día de Prueba.
- **Venta Rápida**: registro de pase diario en < 3 clics con QR inmediato.
- **Check-in**: valida membresía activa o pase vigente; bloquea pases vencidos sugiriendo plan mensual.
