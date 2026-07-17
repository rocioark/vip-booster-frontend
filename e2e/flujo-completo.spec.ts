import { test, expect, BrowserContext, Page } from '@playwright/test'
import { E2E_EMAIL_DOMAIN, E2E_PASSWORD, uniqueSuffix } from './helpers'

/**
 * Ciclo completo del venue Starter, todo desde la UI:
 * registro → auto-login → evento + paquete gratis + publicar →
 * compra en la tienda pública → check-in del ticket (y rechazo del reintento).
 *
 * Los tests son serial y comparten un mismo contexto de navegador: la sesión
 * del owner (cookies del registro) y los datos creados fluyen de un paso al
 * siguiente, igual que en la prueba manual.
 */
test.describe.serial('Ciclo completo de un venue Starter', () => {
  let context: BrowserContext
  let page: Page

  const suffix = uniqueSuffix()
  // El slug se autogenera desde el nombre: "E2E Bar x" → "e2e-bar-x",
  // que es el prefijo que borra la limpieza global.
  const venueName = `E2E Bar ${suffix}`
  const venueSlug = `e2e-bar-${suffix}`
  const ownerEmail = `e2e-owner-${suffix}@${E2E_EMAIL_DOMAIN}`
  const eventName = `Fiesta E2E ${suffix}`
  const eventSlug = `fiesta-e2e-${suffix}`
  let ticketCode = ''

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext()
    page = await context.newPage()
  })

  test.afterAll(async () => {
    await context.close()
  })

  test('(a) registro de venue Starter entra directo al panel', async () => {
    await page.goto('/registro')

    // Starter viene seleccionado por defecto; el slug se sugiere desde el nombre
    await page.fill('#r-venue', venueName)
    await expect(page.locator('#r-slug')).toHaveValue(venueSlug)
    await page.fill('#r-owner', 'Owner E2E')
    await page.fill('#r-email', ownerEmail)
    await page.fill('#r-pass', E2E_PASSWORD)
    await page.fill('#r-pass2', E2E_PASSWORD)

    await page.getByRole('button', { name: 'Crear mi venue gratis' }).click()

    // Starter → auto-login → panel
    await expect(page).toHaveURL(/\/admin\/dashboard/, { timeout: 30_000 })
  })

  test('(b) crear evento con paquete gratis y publicarlo', async () => {
    await page.goto('/admin/events')

    await page.getByRole('button', { name: 'Nuevo evento' }).click()
    await page.fill('#ev-name', eventName)
    await expect(page.locator('#ev-slug')).toHaveValue(eventSlug)
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    await page.fill('#ev-date', tomorrow)
    await page.fill('#ev-cap', '50')
    await page.getByRole('button', { name: 'Crear evento' }).click()

    const row = page.getByRole('row').filter({ hasText: eventName })
    await expect(row).toBeVisible()
    await expect(row.getByText('Borrador')).toBeVisible()

    // Paquete gratuito (precio 0: lo único que permite Starter)
    await row.getByRole('button', { name: 'Boletas' }).click()
    await page.getByRole('button', { name: 'Nuevo package' }).click()
    await page.fill('#pkg-name', 'Entrada General')
    await page.fill('#pkg-price', '0')
    await page.fill('#pkg-qty', '30')
    await page.getByRole('button', { name: 'Crear package' }).click()
    await expect(page.getByText('Gratis · 0/30 vendidos')).toBeVisible()

    // Con boletas creadas, publicar no muestra advertencia
    await row.getByRole('button', { name: 'Publicar' }).click()
    await expect(row.getByText('Publicado')).toBeVisible()
  })

  test('(c) compra de boleta en la tienda pública termina con ticket', async () => {
    await page.goto(`/${venueSlug}/${eventSlug}`)

    await page.getByRole('button', { name: /Entrada General/ }).click()
    await page.getByRole('button', { name: 'Comprar ahora →' }).click()

    await expect(page).toHaveURL(/\/checkout/)
    await page.getByPlaceholder('Juan Rodríguez').fill('Cliente E2E')
    await page.getByPlaceholder('juan@email.com').fill(`e2e-cliente-${suffix}@${E2E_EMAIL_DOMAIN}`)
    await page.getByRole('button', { name: /Confirmar orden/ }).click()

    // Orden gratuita: el backend la completa al crearse, sin pasar por Wompi
    await expect(page.getByText('¡Boletas confirmadas!')).toBeVisible()
    await page.getByRole('button', { name: 'Ver mis tickets →' }).click()

    await expect(page).toHaveURL(/\/confirmacion\?order=/)
    await expect(page.getByText('¡Gracias por tu compra!')).toBeVisible()
    await expect(page.getByText('Pagado')).toBeVisible()

    const codeEl = page.getByText(/^TKT-[A-Z0-9]+$/).first()
    await expect(codeEl).toBeVisible()
    await expect(page.getByText('Válido')).toBeVisible()
    ticketCode = (await codeEl.textContent())!.trim()
  })

  test('(d) check-in valida el ticket y rechaza el segundo intento', async () => {
    expect(ticketCode).toMatch(/^TKT-/)
    await page.goto('/checkin')

    // La página de check-in tiene su propio login (token Bearer en sessionStorage)
    await page.getByPlaceholder('staff@venue.com').fill(ownerEmail)
    await page.getByPlaceholder('••••••••').fill(E2E_PASSWORD)
    await page.getByRole('button', { name: 'Entrar' }).click()

    await page.getByRole('button', { name: /Manual \/ Lector/ }).click()
    const codeInput = page.getByPlaceholder('TKT-XXXXXXXX')

    await codeInput.fill(ticketCode)
    await page.getByRole('button', { name: 'Validar' }).click()
    await expect(page.getByText('✓ ACCESO PERMITIDO')).toBeVisible()
    await expect(page.getByText('Cliente E2E').first()).toBeVisible()

    // Mismo ticket otra vez: denegado
    await codeInput.fill(ticketCode)
    await page.getByRole('button', { name: 'Validar' }).click()
    await expect(page.getByText('✗ ACCESO DENEGADO')).toBeVisible()
    // El mensaje sale en el panel de resultado y en el historial: basta el primero
    await expect(page.getByText('Este ticket ya fue usado para check-in').first()).toBeVisible()
  })
})
