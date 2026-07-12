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

El backend hoy solo valida la capacidad por evento (50/500/2000/∞) al crearlo; no hay contador
mensual. El backend devuelve mensajes de error de plan en el `detail` del 400 — mostrarlos al usuario.

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
