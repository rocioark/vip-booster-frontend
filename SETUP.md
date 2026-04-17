# VIP Booster Frontend — Setup

## Local

```bash
cd vip_booster_frontend
npm install
cp .env.local.example .env.local
# Edita .env.local → NEXT_PUBLIC_API_URL=http://localhost:8000
npm run dev
# → http://localhost:3000
```

## Deploy en Vercel

1. Instala Vercel CLI: `npm i -g vercel`
2. `vercel login`
3. `vercel --prod`
4. En el dashboard de Vercel → Settings → Environment Variables:
   - `NEXT_PUBLIC_API_URL` = `https://tu-api.railway.app`

O conecta el repo en vercel.com → Import Git Repository.

## CORS (crítico)

Después del primer deploy en Vercel obtienes una URL como `https://vip-booster-frontend.vercel.app`.
Debes agregarla a la variable `BACKEND_CORS_ORIGINS` en Railway:

```
BACKEND_CORS_ORIGINS=["https://vip-booster-frontend.vercel.app","https://localhost:3000"]
```

Sin este paso el browser bloqueará todas las peticiones al API.

## Variables de entorno

| Variable | Descripción |
|---|---|
| `NEXT_PUBLIC_API_URL` | URL base de la API FastAPI (sin trailing slash) |

## Rutas

| Ruta | Descripción |
|---|---|
| `/login` | Login con email + contraseña |
| `/dashboard` | KPIs + gráfico top eventos |
| `/events` | Lista de eventos + crear evento + packages VIP por evento |
| `/orders` | Gestión de órdenes + crear orden POS + ver/descargar tickets |
| `/check-in` | Validación de tickets + historial de sesión |
