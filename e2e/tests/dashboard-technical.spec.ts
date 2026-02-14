import { test, expect, type Page } from '@playwright/test'
import { resetTestTechnicalRider, getTestTechnicalRider } from '../helpers/supabase-admin'
import { TEST_USER } from '../helpers/test-data'

/**
 * Fill a react-hook-form registered input reliably.
 */
async function fillRHFInput(page: Page, selector: string, value: string) {
  const input = page.locator(selector)
  await input.click()
  await page.keyboard.press('Meta+a')
  await page.keyboard.press('Backspace')
  await input.pressSequentially(value, { delay: 20 })
}

/** Wait for React hydration on the technical rider page. */
async function waitForHydration(page: Page) {
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(2000)
  await page.locator('h1', { hasText: 'Technical Rider' }).waitFor({ timeout: 10_000 })
}

/** Locator for the green "Saved" indicator in the DashboardHeader. */
function savedIndicator(page: Page) {
  return page.locator('span.text-green-600', { hasText: 'Saved' })
}

/**
 * Click save and wait for the server function POST to complete.
 */
async function clickSaveAndWait(page: Page) {
  const saveButton = page.locator('button[type="submit"]', { hasText: 'Save' })
  await expect(saveButton).toBeEnabled({ timeout: 5_000 })

  const [response] = await Promise.all([
    page.waitForResponse(
      (resp) => resp.url().includes('_serverFn') && resp.request().method() === 'POST',
      { timeout: 10_000 },
    ),
    saveButton.click(),
  ])

  await expect(savedIndicator(page)).toBeVisible({ timeout: 5_000 })

  return response
}

test.describe('Dashboard Technical Rider', () => {
  test.beforeEach(async () => {
    await resetTestTechnicalRider(TEST_USER.email)
  })

  test('technical rider page loads with correct elements', async ({ page }) => {
    await page.goto('/dashboard/technical')
    await waitForHydration(page)

    // Page title
    await expect(page.locator('h1', { hasText: 'Technical Rider' })).toBeVisible()

    // Section headings
    await expect(page.locator('h2', { hasText: 'Decks' })).toBeVisible()
    await expect(page.locator('h2', { hasText: 'Mixer' })).toBeVisible()
    await expect(page.locator('h2', { hasText: 'Monitoring' })).toBeVisible()

    // Select fields should exist with placeholder options
    await expect(page.locator('select[name="deck_model"]')).toBeVisible()
    await expect(page.locator('select[name="deck_quantity"]')).toBeVisible()
    await expect(page.locator('select[name="mixer_model"]')).toBeVisible()
    await expect(page.locator('select[name="monitor_type"]')).toBeVisible()

    // Additional notes textarea
    await expect(page.locator('textarea[name="additional_notes"]')).toBeVisible()
  })

  test('select deck model and quantity then save', async ({ page }) => {
    await page.goto('/dashboard/technical')
    await waitForHydration(page)

    // Select deck model
    await page.locator('select[name="deck_model"]').selectOption('CDJ-3000')

    // Select deck quantity
    await page.locator('select[name="deck_quantity"]').selectOption('3')

    // Click save and wait
    await clickSaveAndWait(page)

    // Check database directly
    const dbRider = await getTestTechnicalRider(TEST_USER.email)
    expect(dbRider?.deck_model).toBe('CDJ-3000')
    expect(dbRider?.deck_quantity).toBe(3)

    // Reload and verify persistence
    await page.reload()
    await waitForHydration(page)
    await expect(page.locator('select[name="deck_model"]')).toHaveValue('CDJ-3000')
    await expect(page.locator('select[name="deck_quantity"]')).toHaveValue('3')
  })

  test('select mixer model and save', async ({ page }) => {
    await page.goto('/dashboard/technical')
    await waitForHydration(page)

    // Select mixer model
    await page.locator('select[name="mixer_model"]').selectOption('DJM-A9')

    // Click save and wait
    await clickSaveAndWait(page)

    // Check database
    const dbRider = await getTestTechnicalRider(TEST_USER.email)
    expect(dbRider?.mixer_model).toBe('DJM-A9')

    // Reload and verify
    await page.reload()
    await waitForHydration(page)
    await expect(page.locator('select[name="mixer_model"]')).toHaveValue('DJM-A9')
  })

  test('select monitor type and add notes then save', async ({ page }) => {
    await page.goto('/dashboard/technical')
    await waitForHydration(page)

    // Select monitor type
    await page.locator('select[name="monitor_type"]').selectOption('Booth Monitors')

    // Monitor quantity field should appear when Booth Monitors selected
    const monitorQtyInput = page.locator('input[name="monitor_quantity"]')
    await expect(monitorQtyInput).toBeVisible({ timeout: 5_000 })

    // Fill monitor quantity
    await fillRHFInput(page, 'input[name="monitor_quantity"]', '2')

    // Fill monitor notes
    await fillRHFInput(page, 'input[name="monitor_notes"]', 'Wedge style preferred')

    // Click save
    await clickSaveAndWait(page)

    // Check database
    const dbRider = await getTestTechnicalRider(TEST_USER.email)
    expect(dbRider?.monitor_type).toBe('Booth Monitors')
    expect(dbRider?.monitor_quantity).toBe(2)
    expect(dbRider?.monitor_notes).toBe('Wedge style preferred')

    // Reload and verify
    await page.reload()
    await waitForHydration(page)
    await expect(page.locator('select[name="monitor_type"]')).toHaveValue('Booth Monitors')
    await expect(page.locator('input[name="monitor_quantity"]')).toHaveValue('2')
    await expect(page.locator('input[name="monitor_notes"]')).toHaveValue('Wedge style preferred')
  })

  test('fill additional notes and save', async ({ page }) => {
    await page.goto('/dashboard/technical')
    await waitForHydration(page)

    // Fill additional notes textarea
    const textarea = page.locator('textarea[name="additional_notes"]')
    await textarea.click()
    await page.keyboard.press('Meta+a')
    await page.keyboard.press('Backspace')
    await textarea.pressSequentially('Need USB access and power strip near booth', { delay: 10 })

    // Click save
    await clickSaveAndWait(page)

    // Check database
    const dbRider = await getTestTechnicalRider(TEST_USER.email)
    expect(dbRider?.additional_notes).toBe('Need USB access and power strip near booth')

    // Reload and verify
    await page.reload()
    await waitForHydration(page)
    await expect(page.locator('textarea[name="additional_notes"]')).toHaveValue('Need USB access and power strip near booth')
  })

  test('fill all fields and save', async ({ page }) => {
    await page.goto('/dashboard/technical')
    await waitForHydration(page)

    // Decks
    await page.locator('select[name="deck_model"]').selectOption('CDJ-2000NXS2')
    await page.locator('select[name="deck_quantity"]').selectOption('2')

    // Mixer
    await page.locator('select[name="mixer_model"]').selectOption('DJM-900NXS2')

    // Monitoring — select "Both" to show quantity field
    await page.locator('select[name="monitor_type"]').selectOption('Both')
    await page.locator('input[name="monitor_quantity"]').waitFor({ timeout: 5_000 })
    await fillRHFInput(page, 'input[name="monitor_quantity"]', '2')
    await fillRHFInput(page, 'input[name="monitor_notes"]', 'DJ booth wedges preferred')

    // Additional notes
    const textarea = page.locator('textarea[name="additional_notes"]')
    await textarea.click()
    await textarea.pressSequentially('Standard DJ booth setup', { delay: 10 })

    // Save
    await clickSaveAndWait(page)

    // Verify all fields in DB
    const dbRider = await getTestTechnicalRider(TEST_USER.email)
    expect(dbRider?.deck_model).toBe('CDJ-2000NXS2')
    expect(dbRider?.deck_quantity).toBe(2)
    expect(dbRider?.mixer_model).toBe('DJM-900NXS2')
    expect(dbRider?.monitor_type).toBe('Both')
    expect(dbRider?.monitor_quantity).toBe(2)
    expect(dbRider?.monitor_notes).toBe('DJ booth wedges preferred')
    expect(dbRider?.additional_notes).toBe('Standard DJ booth setup')
  })
})
