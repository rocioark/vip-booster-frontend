import { request } from '@playwright/test'
import {
  BACKEND_URL, E2E_EMAIL_DOMAIN, E2E_PASSWORD, OWNER_STORAGE,
  cleanupDb, ensureBackend, uniqueSuffix, writeSeed,
} from './helpers'

/**
 * Semilla para los tests de rechazos (e2e/rechazos.spec.ts): un venue Starter
 * con su owner logueado (storageState) y un evento en borrador, todo creado
 * por API directa al backend para no gastar el rate limit del navegador.
 *
 * El flujo feliz (e2e/flujo-completo.spec.ts) NO usa esta semilla: registra
 * su propio venue desde la UI, que es justo lo que prueba.
 */
export default async function globalSetup() {
  await ensureBackend()

  // Restos de corridas anteriores que hayan muerto sin teardown
  try {
    cleanupDb()
  } catch {
    console.warn('Aviso: no se pudo pre-limpiar la BD (¿contenedor vipbooster_db abajo?)')
  }

  const suffix = uniqueSuffix()
  const venueSlug = `e2e-seed-${suffix}`
  const venueName = `E2E Seed ${suffix}`
  const ownerEmail = `e2e-seed-${suffix}@${E2E_EMAIL_DOMAIN}`

  const api = await request.newContext({ baseURL: BACKEND_URL })

  const reg = await api.post('/api/v1/public/venues/register', {
    data: {
      name: venueName,
      slug: venueSlug,
      owner_name: 'Owner E2E',
      owner_email: ownerEmail,
      plan: 'starter',
      owner_user: {
        email: ownerEmail,
        full_name: 'Owner E2E',
        password: E2E_PASSWORD,
        phone: null,
      },
    },
  })
  if (!reg.ok()) {
    throw new Error(`Registro del venue semilla falló (${reg.status()}): ${await reg.text()}`)
  }
  const venueId: string = (await reg.json()).venue.id

  const login = await api.post('/api/v1/auth/login', {
    data: { email: ownerEmail, password: E2E_PASSWORD },
  })
  if (!login.ok()) {
    throw new Error(`Login del owner semilla falló (${login.status()}): ${await login.text()}`)
  }
  const accessToken: string = (await login.json()).access_token

  // Evento en borrador (capacidad válida para Starter): lo usa el test del
  // paquete de pago rechazado.
  const eventSlug = `evento-seed-${suffix}`
  const eventName = `Evento Seed ${suffix}`
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const ev = await api.post('/api/v1/events', {
    headers: { Authorization: `Bearer ${accessToken}` },
    data: {
      venue_id: venueId,
      name: eventName,
      slug: eventSlug,
      event_date: tomorrow,
      event_start_time: '20:00',
      capacity: 50,
    },
  })
  if (!ev.ok()) {
    throw new Error(`Creación del evento semilla falló (${ev.status()}): ${await ev.text()}`)
  }
  const eventId: string = (await ev.json()).id

  // ⚠️ Guard anti-producción: el `.env.local` de este repo apunta el proxy de
  // `next dev` a prod. El webServer de Playwright fuerza el backend local por
  // env vars, pero verificamos de verdad: el venue semilla (que solo existe en
  // la BD local) debe ser visible A TRAVÉS del proxy del frontend. Si no lo
  // es, el proxy apunta a otro backend y correr los tests escribiría en prod.
  const viaProxy = await api.get(`http://localhost:3000/api/v1/public/venues/${venueSlug}`)
  const proxyOk = viaProxy.ok() && (await viaProxy.json()).id === venueId
  if (!proxyOk) {
    throw new Error(
      'ABORTADO: el proxy /api/* del frontend en localhost:3000 NO apunta al backend local ' +
      `(GET /public/venues/${venueSlug} → ${viaProxy.status()}). ` +
      'Probablemente hay un `npm run dev` viejo o el `.env.local` (que apunta a PRODUCCIÓN) ' +
      'está ganando. Cierra cualquier dev server y vuelve a correr los tests.',
    )
  }

  // Las cookies vb_access/vb_refresh quedaron en el contexto tras el login;
  // el dominio es localhost (las cookies no distinguen puerto), así que
  // sirven para las páginas en localhost:3000.
  await api.storageState({ path: OWNER_STORAGE })
  await api.dispose()

  writeSeed({ venueId, venueSlug, venueName, ownerEmail, eventId, eventSlug, eventName })
}
