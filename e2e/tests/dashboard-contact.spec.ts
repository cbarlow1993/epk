import { test, expect, type Page } from '@playwright/test'
import { resetTestBookingContact, getTestBookingContact } from '../helpers/supabase-admin'
import { TEST_USER } from '../helpers/test-data'

/**
 * Fill a react-hook-form registered input reliably.
 * Playwright's fill() doesn't trigger RHF's change detection (uncontrolled inputs).
 * Instead: focus -> select all -> delete -> type character by character.
 */
async function fillRHFInput(page: Page, selector: string, value: string) {
  const input = page.locator(selector)
  await input.click()
  await page.keyboard.press('Meta+a')
  await page.keyboard.press('Backspace')
  await input.pressSequentially(value, { delay: 20 })
}

/** Wait for React hydration on the booking contact page. */
async function waitForHydration(page: Page) {
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(2000)
  await page.locator('input[name="manager_name"]').waitFor({ timeout: 10_000 })
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

test.describe('Dashboard Booking Contact', () => {
  test.beforeEach(async () => {
    await resetTestBookingContact(TEST_USER.email)
  })

  test('contact page loads with correct elements', async ({ page }) => {
    await page.goto('/dashboard/contact')
    await waitForHydration(page)

    // Page title
    await expect(page.locator('h1', { hasText: 'Booking Contact' })).toBeVisible()

    // All four form fields should be present and empty after reset
    await expect(page.locator('input[name="manager_name"]')).toHaveValue('')
    await expect(page.locator('input[name="email"]')).toHaveValue('')
    await expect(page.locator('input[name="phone"]')).toHaveValue('')
    await expect(page.locator('input[name="address"]')).toHaveValue('')

    // Save button should be disabled (no changes)
    await expect(page.locator('button[type="submit"]', { hasText: 'Save' })).toBeDisabled()
  })

  test('edit all contact fields and save', async ({ page }) => {
    await page.goto('/dashboard/contact')
    await waitForHydration(page)

    // Fill in all fields
    await fillRHFInput(page, 'input[name="manager_name"]', 'Helen Smith')
    await fillRHFInput(page, 'input[name="email"]', 'booking@testdj.com')
    await fillRHFInput(page, 'input[name="phone"]', '+44 7123 456789')
    await fillRHFInput(page, 'input[name="address"]', 'London, UK')

    // Click save and wait for POST response
    await clickSaveAndWait(page)

    // Check database directly
    const dbContact = await getTestBookingContact(TEST_USER.email)
    expect(dbContact?.manager_name).toBe('Helen Smith')
    expect(dbContact?.email).toBe('booking@testdj.com')
    expect(dbContact?.phone).toBe('+44 7123 456789')
    expect(dbContact?.address).toBe('London, UK')

    // Reload and verify values persisted
    await page.reload()
    await waitForHydration(page)
    await expect(page.locator('input[name="manager_name"]')).toHaveValue('Helen Smith')
    await expect(page.locator('input[name="email"]')).toHaveValue('booking@testdj.com')
    await expect(page.locator('input[name="phone"]')).toHaveValue('+44 7123 456789')
    await expect(page.locator('input[name="address"]')).toHaveValue('London, UK')
  })

  test('edit single field and save preserves other fields', async ({ page }) => {
    // First save some initial data
    await page.goto('/dashboard/contact')
    await waitForHydration(page)

    await fillRHFInput(page, 'input[name="manager_name"]', 'Initial Manager')
    await fillRHFInput(page, 'input[name="email"]', 'initial@test.com')
    await clickSaveAndWait(page)

    // Reload, then only edit manager name
    await page.reload()
    await waitForHydration(page)

    await fillRHFInput(page, 'input[name="manager_name"]', 'Updated Manager')
    await clickSaveAndWait(page)

    // Verify DB has updated manager but preserved email
    const dbContact = await getTestBookingContact(TEST_USER.email)
    expect(dbContact?.manager_name).toBe('Updated Manager')
    expect(dbContact?.email).toBe('initial@test.com')
  })
})
