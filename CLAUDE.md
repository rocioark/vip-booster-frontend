# VIP Booster — Frontend

SaaS multi-tenant de venta de boletas VIP para venues (bares, teatros, clubes) en Colombia.
Este repo es el panel de administración + tienda pública + check-in.

## Stack y repos

- **Este repo (frontend)**: Next.js 14 (App Router, standalone) + TypeScript + Tailwind +
  TanStack Query + axios.
- **Backend**: repo hermano `../vip_booster` (FastAPI + PostgreSQL + Alembic).
- **Despliegue**: en transición a **Render** con Docker (`Dockerfile.render` + `render.yaml`, ver
  abajo). ⚠️ **Railway sigue siendo el deploy vivo de este repo**: auto-despliega al pushear a
  `main` con `npm run build` + `npm start`, y hasta que se haga el corte **no se puede romper esa
  ruta**. El backend ya está en Render. NO se usa Vercel — el `vercel.json` de este repo es
  **residual, ignorarlo**. Producción: https://www.kythos.vip
- Toda llamada a API va por el rewrite `/api/*` → backend (ver `next.config.js`); el cliente axios
  usa `baseURL: '/api/v1'` (`lib/api.ts`). Auth por cookies httpOnly (`vb_access`/`vb_refresh`).

## Despliegue en Render

- **Blueprint**: `render.yaml` en la raíz define el servicio web `vipbooster-web` (runtime docker,
  `dockerfilePath: ./Dockerfile.render`, plan free). Si el servicio NO se crea desde el Blueprint,
  hay que seleccionar el Dockerfile a mano (Settings → Dockerfile Path → `./Dockerfile.render`).
- **`Dockerfile.render`** es la imagen de producción: 3 etapas (deps → build → runtime) sobre
  `node:20-slim`. La etapa de build instala **también** las devDependencies (`next build` necesita
  typescript, tailwind, postcss); la imagen final solo lleva `.next/standalone`, que trae su propio
  `node_modules` podado.
- **`output: 'standalone'` NO está detrás de ninguna variable, y no debe estarlo**: ya está puesto
  sin condición en `next.config.js` y los scripts de `package.json` dependen de él — `build` copia
  `static` y `public` dentro de `.next/standalone`, y `start` arranca su `server.js`. Condicionarlo
  rompería el deploy de Railway. La imagen de Render **reusa** esa salida, no la activa, y corre el
  mismo `npm run build` que Railway para no tener dos definiciones del build.
- **Arranque**: `CMD ["node", "server.js"]` con `HOSTNAME=0.0.0.0` y `PORT=3000` por defecto.
  **`PORT` no se define a mano**: lo inyecta Render y el server de Next lo lee del entorno.

### ⚠️ Dos variables se hornean en el BUILD, no en runtime

En Render van como env vars del servicio (Render las pasa también como build args) y el Dockerfile
las declara como `ARG`. **Cambiarlas en el dashboard no basta: hay que reconstruir**
(Manual Deploy → Clear build cache & deploy).

| Variable | Por qué es de build |
|---|---|
| `NEXT_PUBLIC_API_URL` | toda `NEXT_PUBLIC_*` queda dentro del bundle del cliente. La usa `lib/api.ts` (`BASE_URL`) y, sobre todo, `app/checkin/page.tsx`, que pega **directo** al backend sin pasar por el proxy |
| `BACKEND_URL` | no es `NEXT_PUBLIC_` pero el rewrite `/api/*` de `next.config.js` se resuelve en `next build` y queda escrito en `routes-manifest.json` |

- Si falta cualquiera de las dos, **el build falla a propósito**. El alternativo sería hornear el
  fallback `http://localhost:8000`: una web que carga pero donde toda llamada a la API falla, y que
  no se arregla sin reconstruir.
- `RESEND_API_KEY` y `RESEND_FROM_EMAIL` sí son de **runtime** (las leen las rutas server-side de
  `app/api/*`). Sin ellas los formularios de `/registro` y "quiero cambiar de plan" responden error;
  el resto de la app funciona igual.

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
- `venue_owner`: administra su venue. **Todos los roles usan `/admin/*`**: el grupo `(dashboard)`
  es solo un shim que redirige a `/admin{pathname}`, y `components/layout/Sidebar.tsx` ya no lo
  importa nadie (el vivo es `AdminSidebar`). No agregar pantallas ahí.
- `venue_staff`: operación (POS, check-in).
- Los eventos se borran con **borrado lógico** en el backend: desaparecen de listados/tienda pero sus
  órdenes históricas siguen visibles en Órdenes — es comportamiento esperado, no un bug.

## Listado de clientes (`/admin/customers`)

Filtros (búsqueda con debounce, evento, rango de fechas), orden por columnas y paginación van
**al servidor**: nunca filtrar ni ordenar en el cliente sobre la página cargada, que son 30 filas
de miles. El total sale de la cabecera `X-Total-Count` de la respuesta, no de `data.length`.
"Exportar CSV" pega a `GET /customers/export` con **los mismos filtros** y se baja como blob.

## Tienda pública y checkout

- Los paquetes de pago de un venue Starter **no llegan** desde `GET /public/vip-packages`: el
  backend los filtra. Si alguien entra al checkout con `?pkg=` de uno que ya no está comprable
  (agotado, desactivado o filtrado), la página muestra "Este package ya no está disponible" en vez
  de un formulario que no se puede enviar.
- Con **total $0** (paquete gratis o descuento del 100%) el checkout no muestra métodos de pago:
  elegir cómo pagar algo que no se cobra confunde. Se muestra "Gratis" y el total sale como
  "Gratis", no como "$ 0". La orden igual viaja con el `payment_method` por defecto — para el
  backend una orden de total 0 se completa sola, sin pasarela.
- **Una orden de pago queda PENDING y sus tickets `pending`**: Wompi no cobra en línea todavía,
  así que el venue coordina el pago aparte y el check-in rechaza esos tickets. Las pantallas no
  pueden dar la compra por cerrada: el checkout avisa "Todavía no cobramos en línea… el venue te
  contacta", el paso final dice "Tu orden quedó registrada" y `/[venue-slug]/confirmacion` muestra
  banner ámbar, el badge "Pendiente de pago" y **oculta el PDF** (el backend lo devuelve 400 hasta
  que se confirme el pago).
- Etiquetas y colores de estado de ticket salen de `TICKET_STATUS` en `lib/types.ts` — una sola
  fuente para tienda y admin. No volver a escribir ternarios `status === 'valid' ? …`.

## Convenciones

- Los enums viajan por la API en minúscula (`draft`, `published`, `pending`…) — el formato en BD es
  asunto del backend, nunca escribir SQL desde aquí.
- Errores de API: leer `error.response.data.detail` (string) y mostrarlo (patrón `onError` existente).

## Tests E2E (Playwright)

Automatizan el ciclo completo de un venue Starter: registro → evento + paquete gratis →
compra en la tienda pública → check-in del ticket, más los rechazos del plan
(`e2e/flujo-completo.spec.ts` y `e2e/rechazos.spec.ts`).

```bash
npm run test:e2e            # corre la suite (levanta next dev solo; cierra tu npm run dev antes)
npx playwright show-report  # ver el último reporte HTML
```

- Corren **siempre contra el entorno local**: backend del repo hermano en Docker (si no está
  arriba, el setup ejecuta `docker compose up -d` en `../vip_booster`) + un `next dev` que
  Playwright levanta él mismo.
- ⚠️ **El `.env.local` de este repo apunta el proxy `/api/*` a PRODUCCIÓN.** Por eso
  `playwright.config.ts` fuerza `BACKEND_URL`/`NEXT_PUBLIC_API_URL` al backend local (las env
  vars reales ganan sobre `.env.local`), no reusa un dev server ya abierto, y `e2e/global-setup.ts`
  aborta si el proxy no responde con datos del backend local. **No quitar estas defensas**: sin
  ellas la suite escribió datos e2e en prod una vez (2026-07-17; ya limpiados).
- Todo dato de prueba lleva prefijo `e2e-`; el teardown los borra de la BD local vía
  `docker exec vipbooster_db psql` (venues con su cascada, y users aparte porque
  `users.venue_id` es ON DELETE SET NULL en la BD real, no CASCADE como dice el modelo).
- El backend limita el registro de venues a 5/min por IP: dos corridas en el mismo minuto
  pueden dar 429 — espera ~1 min entre corridas.

## Comandos

```bash
npm run dev     # desarrollo contra backend local (http://localhost:8000)
npm run build   # build standalone (igual que Railway)
npm run lint
npm run test:e2e

# Probar la imagen de Render en local (las dos build args son obligatorias)
docker build -f Dockerfile.render \
  --build-arg NEXT_PUBLIC_API_URL=https://api.kythos.vip \
  --build-arg BACKEND_URL=https://api.kythos.vip \
  -t vipbooster-web:render .
docker run --rm -p 13000:10000 -e PORT=10000 vipbooster-web:render
```
