# VIP Booster — Frontend

SaaS multi-tenant de venta de boletas VIP para venues (bares, teatros, clubes) en Colombia.
Este repo es el panel de administración + tienda pública + check-in.

## Stack y repos

- **Este repo (frontend)**: Next.js 14 (App Router, standalone) + TypeScript + Tailwind +
  TanStack Query + axios.
- **Backend**: repo hermano `../vip_booster` (FastAPI + PostgreSQL + Alembic).
- **Despliegue**: AMBOS repos auto-despliegan en **Railway** al pushear a `main`. NO se usa Vercel —
  el `vercel.json` de este repo es **residual, ignorarlo**. Producción: https://www.kythos.vip
- Toda llamada a API va por el rewrite `/api/*` → backend (ver `next.config.js`); el cliente axios
  usa `baseURL: '/api/v1'` (`lib/api.ts`). Auth por cookies httpOnly (`vb_access`/`vb_refresh`).

## Modelo comercial: 4 planes por venue

| Plan | Precio | Límite comercial |
|---|---|---|
| Starter | Gratis | 50 boletas/mes, solo eventos gratuitos |
| Grow | 9% por venta | hasta 500 boletas/mes |
| Pro Mensual | $250.000 COP/mes + 9% | hasta 2.000 boletas/mes |
| Pro Anual | $2.400.000 COP/año + 9% | ilimitado |

Los límites están aplicados en el backend (capacidad por evento en POST/PATCH, límite mensual de
boletas en los 3 canales de venta, Starter solo eventos gratuitos). Los errores llegan en el
`detail` del 400 — mostrarlos al usuario. Si un `super_admin` opera fuera del plan, el backend lo
permite y devuelve `plan_warning` en la respuesta — mostrarlo como banner (patrón en
`app/admin/events/page.tsx`).

Páginas del ciclo de venues:
- `/registro` (pública): registro self-service con selección de plan. Starter → auto-login;
  planes de pago → pantalla "te contactaremos" + email vía `/api/venue-lead` (Resend).
- `/admin/venues` (solo super_admin): listado con boletas del mes, cambio de plan,
  activar/suspender, alta manual (POST /venues/onboard).
- `/admin/mi-venue` (venue_owner): perfil público editable (descripción, logo, redes); plan solo
  lectura + "Quiero cambiar de plan" → email vía `/api/plan-change-request` (Resend).
- Rutas Resend en `app/api/*` (server-side, requieren `RESEND_API_KEY`): `contact`, `venue-lead`,
  `plan-change-request`. Los labels/límites de planes viven en `lib/types.ts`
  (`PLAN_LABELS`, `PLAN_MONTHLY_LIMIT`).

## Roles (los devuelve el backend en minúscula)

- `super_admin`: ve todos los venues; selector de "Venue activo" en el sidebar (rutas `/admin`).
- `venue_owner`: administra su venue (rutas `(dashboard)`).
- `venue_staff`: operación (POS, check-in).
- Los eventos se borran con **borrado lógico** en el backend: desaparecen de listados/tienda pero sus
  órdenes históricas siguen visibles en Órdenes — es comportamiento esperado, no un bug.

## Convenciones

- Los enums viajan por la API en minúscula (`draft`, `published`, `pending`…) — el formato en BD es
  asunto del backend, nunca escribir SQL desde aquí.
- Errores de API: leer `error.response.data.detail` (string) y mostrarlo (patrón `onError` existente).

## Comandos

```bash
npm run dev     # desarrollo contra backend local (http://localhost:8000)
npm run build   # build standalone (igual que Railway)
npm run lint
```
