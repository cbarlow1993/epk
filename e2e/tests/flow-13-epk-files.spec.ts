import { test, expect } from '@playwright/test'
import { navigateTo, uploadFixture } from '../helpers/flow-helpers'
import { FLOW_USER } from '../helpers/flow-test-data'
import { deleteTestFiles, deleteTestFolders } from '../helpers/supabase-admin'

test.describe('Flow 13: EPK Files', () => {
  test.describe.configure({ mode: 'serial' })

  test.beforeAll(async () => {
    // Clean up any leftover files from previous runs
    await deleteTestFiles(FLOW_USER.email)
    await deleteTestFolders(FLOW_USER.email)
  })

  test('load files page and verify empty state', async ({ page }) => {
    await navigateTo(page, '/dashboard/files', 'h1')

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

  test('upload test PDF and verify it appears', async ({ page }) => {
    await navigateTo(page, '/dashboard/files', 'h1')

    // Verify empty state before upload
    await expect(page.locator('text=No files yet')).toBeVisible()

    // Upload the test PDF fixture
    await uploadFixture(page, 'input[type="file"]', 'test-file.pdf')

    // Wait for the upload server response
    await page.waitForResponse(
      (resp) => resp.url().includes('_serverFn') && resp.request().method() === 'POST',
      { timeout: 15_000 },
    )

    // Wait for the file to appear in the list (empty state should disappear)
    await expect(page.locator('text=No files yet')).not.toBeVisible({ timeout: 10_000 })

    // File name should appear in the file card
    await expect(page.locator('text=test-file.pdf')).toBeVisible({ timeout: 5_000 })
  })

  test('verify storage bar updated after upload', async ({ page }) => {
    await navigateTo(page, '/dashboard/files', 'h1')

    // Storage bar should show non-zero usage
    await expect(page.locator('text=/used/i')).toBeVisible()
    await expect(page.locator('text=/total/i')).toBeVisible()

    // File should still be visible after reload
    await expect(page.locator('text=test-file.pdf')).toBeVisible({ timeout: 10_000 })

    // Empty state should not be visible (we have at least one file)
    await expect(page.locator('text=No files yet')).not.toBeVisible()
  })
})
