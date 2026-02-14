import { test, expect, type Page } from '@playwright/test'
import { resetTestProfileHero, getTestProfileHeroData } from '../helpers/supabase-admin'
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

/** Wait for React hydration on the hero page. */
async function waitForHydration(page: Page) {
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(2000)
  await page.locator('h1', { hasText: 'Hero' }).waitFor({ timeout: 10_000 })
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

test.describe('Dashboard Hero', () => {
  test.beforeEach(async () => {
    await resetTestProfileHero(TEST_USER.email)
  })

  test('hero page loads with correct elements', async ({ page }) => {
    await page.goto('/dashboard/hero')
    await waitForHydration(page)

    // Page title
    await expect(page.locator('h1', { hasText: 'Hero' })).toBeVisible()

    // Hero Style section with all three style cards
    await expect(page.locator('text=Hero Style')).toBeVisible()
    await expect(page.locator('text=Fullbleed')).toBeVisible()
    await expect(page.locator('text=Contained')).toBeVisible()
    await expect(page.locator('text=Minimal')).toBeVisible()

    // Tagline input
    await expect(page.locator('input[name="tagline"]')).toBeVisible()

    // Hero Media section (visible by default since fullbleed is not minimal)
    await expect(page.locator('text=Hero Media')).toBeVisible()

    // Preview section
    await expect(page.locator('text=Preview')).toBeVisible()

    // Save button should be disabled (no changes)
    await expect(page.locator('button[type="submit"]', { hasText: 'Save' })).toBeDisabled()
  })

  test('edit tagline and save', async ({ page }) => {
    await page.goto('/dashboard/hero')
    await waitForHydration(page)

    // Edit tagline
    await fillRHFInput(page, 'input[name="tagline"]', 'Presskit / EPK')

    // Click save
    await clickSaveAndWait(page)

    // Check database
    const dbProfile = await getTestProfileHeroData(TEST_USER.email)
    expect(dbProfile?.tagline).toBe('Presskit / EPK')

    // Reload and verify
    await page.reload()
    await waitForHydration(page)
    await expect(page.locator('input[name="tagline"]')).toHaveValue('Presskit / EPK')
  })

  test('change hero style to contained and save', async ({ page }) => {
    await page.goto('/dashboard/hero')
    await waitForHydration(page)

    // Default should be fullbleed — click Contained
    const containedBtn = page.locator('button', { hasText: 'Contained' })
    await containedBtn.click()

    // Save
    await clickSaveAndWait(page)

    // Check database
    const dbProfile = await getTestProfileHeroData(TEST_USER.email)
    expect(dbProfile?.hero_style).toBe('contained')

    // Reload and verify Contained card is selected (accent border)
    await page.reload()
    await waitForHydration(page)
    const containedAfter = page.locator('button', { hasText: 'Contained' })
    await expect(containedAfter).toHaveClass(/border-accent/, { timeout: 10_000 })
  })

  test('change hero style to minimal hides media section', async ({ page }) => {
    await page.goto('/dashboard/hero')
    await waitForHydration(page)

    // Hero Media should be visible in fullbleed mode
    await expect(page.locator('text=Hero Media')).toBeVisible()

    // Switch to Minimal
    await page.locator('button', { hasText: 'Minimal' }).click()

    // Hero Media section should disappear
    await expect(page.locator('text=Hero Media')).not.toBeVisible()

    // Preview should show minimal message
    await expect(page.locator('text=Minimal style does not display hero media')).toBeVisible()

    // Save
    await clickSaveAndWait(page)

    // Check database
    const dbProfile = await getTestProfileHeroData(TEST_USER.email)
    expect(dbProfile?.hero_style).toBe('minimal')
  })

  test('change hero style and tagline together and save', async ({ page }) => {
    await page.goto('/dashboard/hero')
    await waitForHydration(page)

    // Change style to contained
    await page.locator('button', { hasText: 'Contained' }).click()

    // Set tagline
    await fillRHFInput(page, 'input[name="tagline"]', 'Live DJ Sets')

    // Save
    await clickSaveAndWait(page)

    // Verify DB
    const dbProfile = await getTestProfileHeroData(TEST_USER.email)
    expect(dbProfile?.hero_style).toBe('contained')
    expect(dbProfile?.tagline).toBe('Live DJ Sets')

    // Reload and verify both persisted
    await page.reload()
    await waitForHydration(page)
    await expect(page.locator('input[name="tagline"]')).toHaveValue('Live DJ Sets')
    const containedAfter = page.locator('button', { hasText: 'Contained' })
    await expect(containedAfter).toHaveClass(/border-accent/, { timeout: 10_000 })
  })

  test('hero media type toggle switches between image and video', async ({ page }) => {
    await page.goto('/dashboard/hero')
    await waitForHydration(page)

    // Image should be selected by default (no existing video)
    const imageBtn = page.locator('button', { hasText: 'Image' }).first()
    await expect(imageBtn).toHaveClass(/border-accent/)

    // Hero Image label should be visible
    await expect(page.locator('text=Hero Image')).toBeVisible()

    // Click Video
    const videoBtn = page.locator('button', { hasText: 'Video' }).first()
    await videoBtn.click()

    // Hero Image should disappear, Hero Video should appear
    await expect(page.locator('text=Hero Image')).not.toBeVisible()
    await expect(page.locator('text=Hero Video')).toBeVisible()

    // Video button should now have accent border
    await expect(videoBtn).toHaveClass(/border-accent/)
  })
})
