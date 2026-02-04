import { test, expect, type Page } from '@playwright/test'
import { resetTestProfile, getTestProfileData } from '../helpers/supabase-admin'
import { TEST_USER } from '../helpers/test-data'

/**
 * Fill a react-hook-form registered input reliably.
 * Playwright's fill() doesn't trigger RHF's change detection (uncontrolled inputs).
 * Instead: focus → select all → delete → type character by character.
 */
async function fillRHFInput(page: Page, selector: string, value: string) {
  const input = page.locator(selector)
  await input.click()
  // Select all existing text and delete
  await page.keyboard.press('Meta+a')
  await page.keyboard.press('Backspace')
  // Type new value character by character (triggers proper React events)
  await input.pressSequentially(value, { delay: 20 })
}

/**
 * Wait for React hydration on the dashboard profile page.
 */
async function waitForHydration(page: Page) {
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(2000)
  await page.locator('input[name="display_name"]').waitFor({ timeout: 10_000 })
}

/** Locator for the green "Saved" indicator in the DashboardHeader. */
function savedIndicator(page: Page) {
  return page.locator('span.text-green-600', { hasText: 'Saved' })
}

/**
 * Click save and wait for the server function POST to complete.
 * Returns after the POST response is received.
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

  // Wait for the "Saved" indicator (visible for 3s after save)
  await expect(savedIndicator(page)).toBeVisible({ timeout: 5_000 })

  return response
}

test.describe('Dashboard Profile', () => {
  test.beforeEach(async () => {
    await resetTestProfile(TEST_USER.email)
  })

  test('profile page loads with existing data', async ({ page }) => {
    await page.goto('/dashboard')
    await waitForHydration(page)

    // Page title
    await expect(page.locator('h1', { hasText: 'Profile' })).toBeVisible()

    // Display name field should have the test user's name
    const displayNameInput = page.locator('input[name="display_name"]')
    await expect(displayNameInput).toHaveValue(TEST_USER.displayName)

    // Slug field should exist and have a value
    const slugInput = page.locator('input[name="slug"]')
    await expect(slugInput).not.toHaveValue('')

    // Save button should be disabled (no changes)
    await expect(page.locator('button[type="submit"]', { hasText: 'Save' })).toBeDisabled()
  })

  test('edit display name and tagline then save', async ({ page }) => {
    await page.goto('/dashboard')
    await waitForHydration(page)

    // Edit display name
    await fillRHFInput(page, 'input[name="display_name"]', 'Updated DJ Name')

    // Edit tagline
    await fillRHFInput(page, 'input[name="tagline"]', 'Test Tagline')

    // Click save and wait for POST response
    await clickSaveAndWait(page)

    // Check database directly
    const dbProfile = await getTestProfileData(TEST_USER.email)
    expect(dbProfile?.display_name).toBe('Updated DJ Name')
    expect(dbProfile?.tagline).toBe('Test Tagline')

    // Reload and verify values persisted
    await page.reload()
    await waitForHydration(page)
    await expect(page.locator('input[name="display_name"]')).toHaveValue('Updated DJ Name')
    await expect(page.locator('input[name="tagline"]')).toHaveValue('Test Tagline')
  })

  test('slug validation rejects reserved slug', async ({ page }) => {
    await page.goto('/dashboard')
    await waitForHydration(page)

    // Enter a reserved slug
    await fillRHFInput(page, 'input[name="slug"]', 'dashboard')

    // Save
    const saveButton = page.locator('button[type="submit"]')
    await saveButton.click({ force: true })

    // Should see an error (either inline validation or server error)
    await expect(page.locator('text=/error|taken|reserved|unavailable/i')).toBeVisible({ timeout: 10_000 })
  })

  test('toggle publish and verify persistence', async ({ page }) => {
    await page.goto('/dashboard')
    await waitForHydration(page)

    // Published should be off by default
    const toggle = page.locator('button[role="switch"][aria-label="Toggle published status"]')
    await expect(toggle).toHaveAttribute('aria-checked', 'false')

    // Click toggle
    await toggle.scrollIntoViewIfNeeded()
    await toggle.click()
    await expect(toggle).toHaveAttribute('aria-checked', 'true', { timeout: 5_000 })

    // Save and wait for POST
    await clickSaveAndWait(page)

    // Verify DB
    const dbProfile = await getTestProfileData(TEST_USER.email)
    expect(dbProfile?.published).toBe(true)

    // Reload and verify
    await page.reload()
    await waitForHydration(page)
    const toggleAfter = page.locator('button[role="switch"][aria-label="Toggle published status"]')
    await expect(toggleAfter).toHaveAttribute('aria-checked', 'true', { timeout: 10_000 })
  })

  test('edit genres and verify persistence', async ({ page }) => {
    await page.goto('/dashboard')
    await waitForHydration(page)

    // Click predefined genre chips to select them
    const houseChip = page.locator('button', { hasText: /^House$/ }).first()
    const techHouseChip = page.locator('button', { hasText: /^Tech House$/ }).first()

    await houseChip.scrollIntoViewIfNeeded()
    await houseChip.click()
    await techHouseChip.click()

    // Add a custom genre via the input
    const customGenreInput = page.locator('input[placeholder="Add custom genre..."]')
    await customGenreInput.click()
    await customGenreInput.pressSequentially('Melodic Techno', { delay: 20 })
    await customGenreInput.press('Enter')

    // Save and wait for POST
    await clickSaveAndWait(page)

    // Verify DB
    const dbProfile = await getTestProfileData(TEST_USER.email)
    expect(dbProfile?.genres).toContain('House')
    expect(dbProfile?.genres).toContain('Tech House')
    expect(dbProfile?.genres).toContain('Melodic Techno')

    // Reload and verify genres persisted
    await page.reload()
    await waitForHydration(page)

    // Selected predefined genres should have the accent style (bg-accent)
    const houseChipAfter = page.locator('button', { hasText: /^House$/ }).first()
    await expect(houseChipAfter).toHaveClass(/bg-accent/, { timeout: 10_000 })

    const techHouseChipAfter = page.locator('button', { hasText: /^Tech House$/ }).first()
    await expect(techHouseChipAfter).toHaveClass(/bg-accent/)

    // Custom genre should appear as a removable pill
    await expect(page.locator('button', { hasText: /Melodic Techno/ })).toBeVisible()
  })
})
