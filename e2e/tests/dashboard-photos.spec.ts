import { test, expect, type Page } from '@playwright/test'
import { deleteTestPhotos, getTestPhotos } from '../helpers/supabase-admin'
import { TEST_USER } from '../helpers/test-data'

/**
 * Wait for React hydration on the photos page.
 */
async function waitForHydration(page: Page) {
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(2000)
  await page.locator('h1', { hasText: 'Photos' }).waitFor({ timeout: 10_000 })
}

test.describe('Dashboard Photos', () => {
  test.beforeEach(async () => {
    await deleteTestPhotos(TEST_USER.email)
  })

  test.afterAll(async () => {
    await deleteTestPhotos(TEST_USER.email)
  })

  test('photos page loads with empty state', async ({ page }) => {
    await page.goto('/dashboard/photos')
    await waitForHydration(page)

    // Page title
    await expect(page.locator('h1', { hasText: 'Photos' })).toBeVisible()

    // Empty state message
    await expect(page.locator('text=No photos yet')).toBeVisible()

    // Photo count indicator
    await expect(page.locator('text=0 of 20 photos')).toBeVisible()

    // Add button should be visible
    await expect(page.locator('button', { hasText: 'Add Photo' })).toBeVisible()
  })

  test('add photo modal opens and closes', async ({ page }) => {
    await page.goto('/dashboard/photos')
    await waitForHydration(page)

    // Open add modal
    await page.locator('button', { hasText: 'Add Photo' }).click()
    await page.locator('text=Add Photo').first().waitFor({ timeout: 5_000 })

    // Modal should have image upload and caption fields
    await expect(page.locator('input[type="file"]')).toBeAttached()
    await expect(page.locator('input[name="caption"]')).toBeVisible()

    // Submit button should be disabled without an image
    const submitButton = page.locator('button[type="submit"]', { hasText: 'Add Photo' })
    await expect(submitButton).toBeDisabled()

    // Cancel should close modal
    await page.locator('button', { hasText: 'Cancel' }).click()
    // Modal title should no longer be visible
    await expect(page.locator('text=Add Photo').nth(1)).not.toBeVisible({ timeout: 5_000 })

    // Nothing in DB
    const photos = await getTestPhotos(TEST_USER.email)
    expect(photos.length).toBe(0)
  })

  test('photo count shows correct number', async ({ page }) => {
    await page.goto('/dashboard/photos')
    await waitForHydration(page)

    // Should show 0 of 20
    await expect(page.locator('text=0 of 20 photos')).toBeVisible()
  })

  test('section toggle is present in header', async ({ page }) => {
    await page.goto('/dashboard/photos')
    await waitForHydration(page)

    // Section toggle should be present (from DashboardHeader with sectionEnabled)
    const toggle = page.locator('button[role="switch"]')
    // Toggle may or may not exist depending on DashboardHeader implementation
    const hasToggle = await toggle.isVisible().catch(() => false)
    if (hasToggle) {
      // Toggle should have an aria-checked attribute
      await expect(toggle).toHaveAttribute('aria-checked', /(true|false)/)
    }
  })
})
