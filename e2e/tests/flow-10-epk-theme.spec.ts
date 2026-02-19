import { test, expect } from '@playwright/test'
import { fillRHFInput, navigateTo, clickSaveAndWait } from '../helpers/flow-helpers'
import { FLOW_USER, THEME_DATA } from '../helpers/flow-test-data'
import { getTestThemeData } from '../helpers/supabase-admin'

test.describe('Flow 10: EPK Theme', () => {
  test.describe.configure({ mode: 'serial' })

  test('load theme page', async ({ page }) => {
    await navigateTo(page, '/dashboard/theme', 'h1')

    // Page title
    await expect(page.locator('h1', { hasText: 'Theme' })).toBeVisible()

    // Template section should be visible
    await expect(page.locator('label', { hasText: 'Template' })).toBeVisible()

    // Accordion section headers should be visible (use button locator to avoid matching ProGate text)
    await expect(page.locator('button', { hasText: 'Typography' })).toBeVisible()
    await expect(page.locator('button', { hasText: 'Colours' })).toBeVisible()
    await expect(page.locator('button', { hasText: 'Animation' })).toBeVisible()

    // Save button should be disabled (no changes)
    await expect(page.locator('button[type="submit"]', { hasText: 'Save' })).toBeDisabled()
  })

  test('set accent and background colours', async ({ page }) => {
    await navigateTo(page, '/dashboard/theme', 'h1')

    // Colours is the defaultOpen accordion section — no need to click
    // Wait for the accent colour input to appear
    const accentInput = page.locator('input[name="accent_color"]')
    await expect(accentInput).toBeVisible({ timeout: 5_000 })

    // Set accent colour
    await fillRHFInput(page, 'input[name="accent_color"]', THEME_DATA.accentColor)

    // Set background colour
    await fillRHFInput(page, 'input[name="bg_color"]', THEME_DATA.bgColor)

    // Save
    await clickSaveAndWait(page)

    // Verify DB colours
    const dbTheme = await getTestThemeData(FLOW_USER.email)
    expect(dbTheme?.accent_color).toBe(THEME_DATA.accentColor)
    expect(dbTheme?.bg_color).toBe(THEME_DATA.bgColor)
  })

  test('select Dark template from dropdown', async ({ page }) => {
    await navigateTo(page, '/dashboard/theme', 'h1')

    // Click the template dropdown trigger
    const templateTrigger = page.locator('button[aria-haspopup="listbox"]')
    await templateTrigger.click()

    // Wait for dropdown to be expanded
    await expect(templateTrigger).toHaveAttribute('aria-expanded', 'true')

    // Find the Dark template option by its unique description text
    // (the trigger shows the current template, not Dark, so this only matches the dropdown)
    const darkOption = page.locator('button', { hasText: 'Refined dark theme' })
    await expect(darkOption).toBeVisible({ timeout: 5_000 })

    // The click triggers window.confirm() — register handler BEFORE click
    // (must use page.on pattern, NOT Promise.all with waitForEvent, which deadlocks)
    page.once('dialog', (dialog) => dialog.accept())
    await darkOption.click()

    // Wait for setValue calls to propagate through React state
    await page.waitForTimeout(500)

    // Save
    await clickSaveAndWait(page)

    // Verify DB template (id is 'underground')
    const dbTheme = await getTestThemeData(FLOW_USER.email)
    expect(dbTheme?.template).toBe('underground')
  })

  test('verify animation toggle is on', async ({ page }) => {
    await navigateTo(page, '/dashboard/theme', 'h1')

    // Open Animation accordion
    const animationButton = page.locator('button', { hasText: /^Animation$/ })
    await animationButton.click()

    // Toggle should be on (animate_sections defaults to true)
    const toggle = page.locator('button[role="switch"][aria-label="Animate sections on scroll"]')
    await expect(toggle).toBeVisible({ timeout: 5_000 })
    await expect(toggle).toHaveAttribute('aria-checked', 'true')
  })

  test('verify all theme values in database', async () => {
    const dbTheme = await getTestThemeData(FLOW_USER.email)
    expect(dbTheme).toBeTruthy()
    expect(dbTheme?.template).toBe('underground')
    expect(dbTheme?.animate_sections).toBe(true)
  })
})
