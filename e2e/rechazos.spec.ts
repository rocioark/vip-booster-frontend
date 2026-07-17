import { test, expect } from '@playwright/test'
import { OWNER_STORAGE, readSeed, uniqueSuffix, E2E_PASSWORD, SeedState } from './helpers'

/**
 * Rechazos que el backend debe aplicar a un venue Starter, verificados desde
 * la UI. Usa el venue semilla creado por API en global-setup (con la sesión
 * del owner en storageState) para no gastar el rate limit de registro (5/min).
 */
test.describe('Límites del plan Starter y registro duplicado', () => {
  test.use({ storageState: OWNER_STORAGE })

  let seed: SeedState
  test.beforeAll(() => {
    seed = readSeed()
  })

  test('rechaza crear un evento con capacidad mayor a 50', async ({ page }) => {
    await page.goto('/admin/events')

    await page.getByRole('button', { name: 'Nuevo evento' }).click()
    await page.fill('#ev-name', 'Evento Gigante E2E')
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    await page.fill('#ev-date', tomorrow)
    await page.fill('#ev-cap', '51')
    await page.getByRole('button', { name: 'Crear evento' }).click()

    await expect(page.getByText(/permite eventos de hasta 50 personas/)).toBeVisible()
  })

  test('rechaza crear un paquete de pago', async ({ page }) => {
    await page.goto('/admin/events')

    const row = page.getByRole('row').filter({ hasText: seed.eventName })
    await row.getByRole('button', { name: 'Boletas' }).click()
    await page.getByRole('button', { name: 'Nuevo package' }).click()
    await page.fill('#pkg-name', 'VIP Pago E2E')
    await page.fill('#pkg-price', '100000')
    await page.fill('#pkg-qty', '10')
    await page.getByRole('button', { name: 'Crear package' }).click()

    await expect(page.getByText(/solo permite eventos gratuitos/)).toBeVisible()
  })

  test('rechaza registrar un venue con email ya registrado', async ({ page }) => {
    const suffix = uniqueSuffix()
    await page.goto('/registro')

    await page.fill('#r-venue', `E2E Duplicado ${suffix}`)
    await page.fill('#r-owner', 'Owner Duplicado')
    // Email del owner semilla: ya existe
    await page.fill('#r-email', seed.ownerEmail)
    await page.fill('#r-pass', E2E_PASSWORD)
    await page.fill('#r-pass2', E2E_PASSWORD)
    await page.getByRole('button', { name: 'Crear mi venue gratis' }).click()

    await expect(page.getByText(/ya está registrado/)).toBeVisible()
  })
})
