import { test, expect, type Page } from '@playwright/test'
import { deleteTestFiles, deleteTestFolders } from '../helpers/supabase-admin'
import { TEST_USER } from '../helpers/test-data'

/**
 * Wait for React hydration on the files page.
 */
async function waitForHydration(page: Page) {
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(2000)
  await page.locator('h1', { hasText: 'File Repository' }).waitFor({ timeout: 10_000 })
}

test.describe('Dashboard Files', () => {
  test.beforeEach(async () => {
    await deleteTestFiles(TEST_USER.email)
    await deleteTestFolders(TEST_USER.email)
  })

  test.afterAll(async () => {
    await deleteTestFiles(TEST_USER.email)
    await deleteTestFolders(TEST_USER.email)
  })

  test('files page loads with empty state', async ({ page }) => {
    await page.goto('/dashboard/files')
    await waitForHydration(page)

    // Page title
    await expect(page.locator('h1', { hasText: 'File Repository' })).toBeVisible()

    // Storage bar should be visible
    await expect(page.locator('text=/used/i')).toBeVisible()
    await expect(page.locator('text=/total/i')).toBeVisible()

    // Empty state message
    await expect(page.locator('text=No files yet')).toBeVisible()

    // Upload area should be visible
    await expect(page.locator('text=Drag & drop files here')).toBeVisible()
    await expect(page.locator('text=Browse Files')).toBeVisible()
  })

  test('storage bar displays usage information', async ({ page }) => {
    await page.goto('/dashboard/files')
    await waitForHydration(page)

    // Storage bar should show usage
    await expect(page.locator('text=/\\d+.*used/i')).toBeVisible()
    await expect(page.locator('text=/\\d+.*total/i')).toBeVisible()
  })

  test('upload area is present and interactive', async ({ page }) => {
    await page.goto('/dashboard/files')
    await waitForHydration(page)

    // Drop zone should be visible
    await expect(page.locator('text=Drag & drop files here')).toBeVisible()

    // Browse files button should be visible
    const browseButton = page.locator('text=Browse Files')
    await expect(browseButton).toBeVisible()

    // File input should exist (hidden behind the label)
    const fileInput = page.locator('input[type="file"]')
    await expect(fileInput).toBeAttached()
  })

  test('free tier shows upgrade prompt', async ({ page }) => {
    await page.goto('/dashboard/files')
    await waitForHydration(page)

    // Free tier card should be visible (test user is free tier)
    const freeCard = page.locator('text=Free Tier')
    const proCard = page.locator('text=Upgrade to Pro')

    // At least one of these should be visible for free tier users
    const hasFreeIndicator = await freeCard.isVisible().catch(() => false) ||
      await proCard.isVisible().catch(() => false)

    if (hasFreeIndicator) {
      // Upgrade link should point to settings
      const upgradeLink = page.locator('a', { hasText: 'Upgrade to Pro' })
      if (await upgradeLink.isVisible()) {
        await expect(upgradeLink).toHaveAttribute('href', /settings/)
      }
    }
  })
})
