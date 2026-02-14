import { test, expect, type Page } from '@playwright/test'
import { resetTestProfileBio, getTestProfileHeroData } from '../helpers/supabase-admin'
import { TEST_USER } from '../helpers/test-data'

/** Wait for React hydration on the bio page. */
async function waitForHydration(page: Page) {
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(2000)
  await page.locator('h1', { hasText: 'Bio' }).waitFor({ timeout: 10_000 })
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

test.describe('Dashboard Bio', () => {
  test.beforeEach(async () => {
    await resetTestProfileBio(TEST_USER.email)
  })

  test('bio page loads with correct elements', async ({ page }) => {
    await page.goto('/dashboard/bio')
    await waitForHydration(page)

    // Page title
    await expect(page.locator('h1', { hasText: 'Bio' })).toBeVisible()

    // Bio Layout selector should be visible with Two Column and Single Column options
    await expect(page.locator('text=Bio Layout')).toBeVisible()
    await expect(page.locator('text=Two Column')).toBeVisible()
    await expect(page.locator('text=Single Column')).toBeVisible()

    // Full Bio label should be visible
    await expect(page.locator('text=Full Bio')).toBeVisible()

    // Save button should be present (bio page always enables save since Editor.js is uncontrolled)
    await expect(page.locator('button[type="submit"]', { hasText: 'Save' })).toBeVisible()
  })

  test('switch bio layout to single column and save', async ({ page }) => {
    await page.goto('/dashboard/bio')
    await waitForHydration(page)

    // Default should be two-column — click Single Column
    const singleColumnBtn = page.locator('button', { hasText: 'Single Column' })
    await singleColumnBtn.click()

    // Save
    await clickSaveAndWait(page)

    // Check database
    const dbProfile = await getTestProfileHeroData(TEST_USER.email)
    expect(dbProfile?.bio_layout).toBe('single-column')

    // Reload and verify the Single Column card is selected (has accent border)
    await page.reload()
    await waitForHydration(page)
    const singleColumnAfter = page.locator('button', { hasText: 'Single Column' })
    await expect(singleColumnAfter).toHaveClass(/border-accent/, { timeout: 10_000 })
  })

  test('side image section visible only in two-column layout', async ({ page }) => {
    await page.goto('/dashboard/bio')
    await waitForHydration(page)

    // In two-column mode (default), Side Image label should be visible
    await expect(page.locator('text=Side Image')).toBeVisible()

    // Switch to single column
    await page.locator('button', { hasText: 'Single Column' }).click()

    // Side Image label should now be hidden
    await expect(page.locator('text=Side Image')).not.toBeVisible()
  })

  test('editor.js renders and allows typing', async ({ page }) => {
    await page.goto('/dashboard/bio')
    await waitForHydration(page)

    // Wait for Editor.js to initialize — the editor container should have the ce-block class
    const editorHolder = page.locator('.ce-block')
    await expect(editorHolder.first()).toBeVisible({ timeout: 15_000 })

    // Click into the editor and type some text
    const editorArea = page.locator('[contenteditable="true"]').first()
    await editorArea.click()
    await page.keyboard.type('This is my test bio text')

    // Save
    await clickSaveAndWait(page)

    // Check database — bio should have blocks with our text
    const dbProfile = await getTestProfileHeroData(TEST_USER.email)
    expect(dbProfile?.bio).toBeTruthy()
    const bio = dbProfile?.bio as { blocks?: Array<{ data?: { text?: string } }> }
    const hasText = bio?.blocks?.some((b) => b.data?.text?.includes('This is my test bio text'))
    expect(hasText).toBe(true)
  })
})
