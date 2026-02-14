import { test, expect, type Page } from '@playwright/test'
import { resetTestTheme, getTestThemeData } from '../helpers/supabase-admin'
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

/**
 * Wait for React hydration on the dashboard theme page.
 */
async function waitForHydration(page: Page) {
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(2000)
  await page.locator('h1', { hasText: 'Theme' }).waitFor({ timeout: 10_000 })
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

test.describe('Dashboard Theme', () => {
  test.beforeEach(async () => {
    await resetTestTheme(TEST_USER.email)
  })

  test('theme page loads with correct elements', async ({ page }) => {
    await page.goto('/dashboard/theme')
    await waitForHydration(page)

    // Page title
    await expect(page.locator('h1', { hasText: 'Theme' })).toBeVisible()

    // Template section should be visible
    await expect(page.locator('label', { hasText: 'Template' })).toBeVisible()

    // Accordion sections should be visible
    await expect(page.getByText('Typography')).toBeVisible()
    await expect(page.getByText('Colours')).toBeVisible()
    await expect(page.getByText('Layout')).toBeVisible()
    await expect(page.getByText('Animation')).toBeVisible()

    // Save button should be disabled (no changes)
    await expect(page.locator('button[type="submit"]', { hasText: 'Save' })).toBeDisabled()
  })

  test('edit accent colour and save', async ({ page }) => {
    await page.goto('/dashboard/theme')
    await waitForHydration(page)

    // Open the Colours accordion section
    const coloursButton = page.locator('button', { hasText: /^Colours$/ })
    await coloursButton.click()

    // Wait for the accent colour input to appear
    const accentInput = page.locator('input[name="accent_color"]')
    await expect(accentInput).toBeVisible({ timeout: 5_000 })

    // Change accent colour
    await fillRHFInput(page, 'input[name="accent_color"]', '#ff5500')

    // Save
    await clickSaveAndWait(page)

    // Verify DB
    const dbTheme = await getTestThemeData(TEST_USER.email)
    expect(dbTheme?.accent_color).toBe('#ff5500')

    // Reload and verify persistence
    await page.reload()
    await waitForHydration(page)

    // Open Colours accordion again
    const coloursButtonAfter = page.locator('button', { hasText: /^Colours$/ })
    await coloursButtonAfter.click()
    await expect(page.locator('input[name="accent_color"]')).toHaveValue('#ff5500')
  })

  test('edit background colour and save', async ({ page }) => {
    await page.goto('/dashboard/theme')
    await waitForHydration(page)

    // Open the Colours accordion
    const coloursButton = page.locator('button', { hasText: /^Colours$/ })
    await coloursButton.click()

    const bgInput = page.locator('input[name="bg_color"]')
    await expect(bgInput).toBeVisible({ timeout: 5_000 })

    // Change background colour
    await fillRHFInput(page, 'input[name="bg_color"]', '#1a1a2e')

    // Save
    await clickSaveAndWait(page)

    // Verify DB
    const dbTheme = await getTestThemeData(TEST_USER.email)
    expect(dbTheme?.bg_color).toBe('#1a1a2e')
  })

  test('toggle animate sections and save', async ({ page }) => {
    await page.goto('/dashboard/theme')
    await waitForHydration(page)

    // Find the Animation accordion and expand it
    const animationButton = page.locator('button', { hasText: /^Animation$/ })
    await animationButton.click()

    // Toggle should default to on (animate_sections defaults to true)
    const toggle = page.locator('button[role="switch"][aria-label="Animate sections on scroll"]')
    await expect(toggle).toBeVisible({ timeout: 5_000 })
    await expect(toggle).toHaveAttribute('aria-checked', 'true')

    // Click toggle to disable
    await toggle.click()
    await expect(toggle).toHaveAttribute('aria-checked', 'false')

    // Save
    await clickSaveAndWait(page)

    // Verify DB
    const dbTheme = await getTestThemeData(TEST_USER.email)
    expect(dbTheme?.animate_sections).toBe(false)

    // Reload and verify persistence
    await page.reload()
    await waitForHydration(page)

    const animationButtonAfter = page.locator('button', { hasText: /^Animation$/ })
    await animationButtonAfter.click()

    const toggleAfter = page.locator('button[role="switch"][aria-label="Animate sections on scroll"]')
    await expect(toggleAfter).toHaveAttribute('aria-checked', 'false', { timeout: 10_000 })
  })

  test('template dropdown opens and shows options', async ({ page }) => {
    await page.goto('/dashboard/theme')
    await waitForHydration(page)

    // Click the template dropdown trigger
    const templateTrigger = page.locator('button[aria-haspopup="listbox"]')
    await templateTrigger.click()

    // Dropdown should be expanded
    await expect(templateTrigger).toHaveAttribute('aria-expanded', 'true')

    // Should show multiple template options
    const templateCards = page.locator('button', { hasText: /Swiss|Minimal|Festival|Underground|Neon/i })
    await expect(templateCards.first()).toBeVisible({ timeout: 5_000 })
  })
})
