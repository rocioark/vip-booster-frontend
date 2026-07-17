import { execFileSync, execSync } from 'child_process'
import fs from 'fs'
import path from 'path'

export const BACKEND_URL = 'http://localhost:8000'

// Repo hermano con el docker compose del backend (db + redis + app)
export const BACKEND_REPO = path.resolve(__dirname, '..', '..', 'vip_booster')

export const STATE_DIR = path.join(__dirname, '.state')
export const SEED_FILE = path.join(STATE_DIR, 'seed.json')
export const OWNER_STORAGE = path.join(STATE_DIR, 'owner-storage.json')

// Contraseña de los usuarios de prueba (cumple: 8+ chars, letra y número)
export const E2E_PASSWORD = 'E2ePass1234'

// Dominio inexistente pero sintácticamente válido: Pydantic rechaza los
// dominios reservados tipo `.test`, y los emails de confirmación que el
// backend intente enviar simplemente rebotan en local.
export const E2E_EMAIL_DOMAIN = 'e2e.vipbooster.co'

/**
 * Todo lo que crean los tests lleva slug/email con prefijo `e2e-`:
 * la limpieza borra los venues por ese prefijo y las FKs ON DELETE CASCADE
 * arrastran usuarios, eventos, paquetes, órdenes, tickets y clientes.
 */
export interface SeedState {
  venueId: string
  venueSlug: string
  venueName: string
  ownerEmail: string
  eventId: string
  eventSlug: string
  eventName: string
}

export function uniqueSuffix(): string {
  return Date.now().toString(36)
}

export function readSeed(): SeedState {
  return JSON.parse(fs.readFileSync(SEED_FILE, 'utf-8'))
}

export function writeSeed(seed: SeedState): void {
  fs.mkdirSync(STATE_DIR, { recursive: true })
  fs.writeFileSync(SEED_FILE, JSON.stringify(seed, null, 2))
}

/**
 * Borra de la BD local todos los datos creados por los tests.
 * Primero los venues e2e-* (eventos, paquetes, órdenes, tickets y clientes
 * caen por ON DELETE CASCADE) y después los usuarios e2e-*: en la BD real
 * users.venue_id es ON DELETE SET NULL, no CASCADE, así que sobreviven al
 * borrado del venue.
 */
export function cleanupDb(): void {
  execFileSync(
    'docker',
    [
      'exec', 'vipbooster_db',
      'psql', '-U', 'vipbooster', '-d', 'vipbooster_dev',
      '-c', "DELETE FROM venues WHERE slug LIKE 'e2e-%';",
      '-c', "DELETE FROM users WHERE email LIKE 'e2e-%';",
    ],
    { stdio: 'pipe' },
  )
}

async function backendHealthy(): Promise<boolean> {
  try {
    const res = await fetch(`${BACKEND_URL}/health`)
    return res.ok
  } catch {
    return false
  }
}

/**
 * Garantiza que el backend local esté arriba: si /health no responde,
 * intenta `docker compose up -d` en ../vip_booster y espera hasta 120s
 * (el contenedor aplica migraciones antes de servir).
 */
export async function ensureBackend(): Promise<void> {
  if (await backendHealthy()) return

  console.log('Backend local no responde; ejecutando `docker compose up -d` en', BACKEND_REPO)
  try {
    execSync('docker compose up -d', { cwd: BACKEND_REPO, stdio: 'inherit' })
  } catch {
    throw new Error(
      `No se pudo levantar el backend. Arranca Docker Desktop y corre "docker compose up -d" en ${BACKEND_REPO}`,
    )
  }

  const deadline = Date.now() + 120_000
  while (Date.now() < deadline) {
    if (await backendHealthy()) return
    await new Promise(r => setTimeout(r, 2_000))
  }
  throw new Error(`El backend en ${BACKEND_URL} no respondió /health tras 120s`)
}
