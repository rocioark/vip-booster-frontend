import { defineConfig, devices } from '@playwright/test'

/**
 * Tests E2E contra el entorno LOCAL: backend en http://localhost:8000
 * (docker compose del repo hermano ../vip_booster) y este frontend en
 * http://localhost:3000, que Playwright levanta SIEMPRE él mismo.
 *
 * ⚠️ El `.env.local` de este repo apunta el proxy de `next dev` a PRODUCCIÓN.
 * Por eso el webServer fuerza BACKEND_URL/NEXT_PUBLIC_API_URL al backend local
 * (las env vars reales ganan sobre `.env.local` en Next) y NO reusa un dev
 * server ya abierto: si tienes `npm run dev` corriendo, ciérralo antes.
 * global-setup verifica además que el proxy apunte al backend local y aborta
 * si no. Nunca quitar estas defensas: sin ellas los tests escriben en prod.
 *
 * workers: 1 y sin retries: el backend limita el registro de venues a 5/min
 * por IP y los tests comparten estado (venue → evento → ticket) en orden serial.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 120_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  globalSetup: './e2e/global-setup',
  globalTeardown: './e2e/global-teardown',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: false,
    timeout: 180_000,
    env: {
      BACKEND_URL: 'http://localhost:8000',
      NEXT_PUBLIC_API_URL: 'http://localhost:8000',
    },
  },
})
