import { test, expect } from '@playwright/test'
import {
  publishTestProfile,
  resetTestProfile,
  getTestProfileSlug,
} from '../helpers/supabase-admin'
import { TEST_USER } from '../helpers/test-data'

let testSlug: string

test.describe('Public EPK Page', () => {
  test.beforeAll(async () => {
    // Publish the test profile so the public page is accessible
    await publishTestProfile(TEST_USER.email)
    testSlug = await getTestProfileSlug(TEST_USER.email)
  })

  test.afterAll(async () => {
    // Reset the profile back to unpublished
    await resetTestProfile(TEST_USER.email)
  })

  test('renders hero with display name and tagline', async ({ page }) => {
    await page.goto(`/${testSlug}`)
    await page.waitForLoadState('networkidle')

    // Hero should show the display name
    await expect(page.locator('h1')).toContainText('Test Playwright DJ')

    // Tagline should be visible
    await expect(page.locator('text=Test tagline for E2E')).toBeVisible()
  })

  test('renders genre tags in hero', async ({ page }) => {
    await page.goto(`/${testSlug}`)
    await page.waitForLoadState('networkidle')

    // Genre tags should be visible
    await expect(page.locator('text=House').first()).toBeVisible()
    await expect(page.locator('text=Techno').first()).toBeVisible()
  })

  test('shows branded footer for free tier', async ({ page }) => {
    await page.goto(`/${testSlug}`)
    await page.waitForLoadState('networkidle')

    // "Built with myEPK" footer should be visible for free tier
    await expect(page.locator('footer')).toBeVisible()
    await expect(page.locator('text=Built with')).toBeVisible()
    await expect(page.locator('footer a', { hasText: 'myEPK' })).toBeVisible()
  })

  test('nonexistent slug shows not found message', async ({ page }) => {
    await page.goto('/this-slug-definitely-does-not-exist-abc123')
    await page.waitForLoadState('networkidle')

    // Should show the "Page not found" or "doesn't exist" message
    await expect(
      page.locator('text=/page not found|doesn\'t exist/i')
    ).toBeVisible({ timeout: 10_000 })
  })

  test('unpublished profile shows not found', async ({ page }) => {
    // Temporarily unpublish the profile
    await resetTestProfile(TEST_USER.email)

    await page.goto(`/${testSlug}`)
    await page.waitForLoadState('networkidle')

    // Should show not found because profile is unpublished
    await expect(
      page.locator('text=/page not found|doesn\'t exist/i')
    ).toBeVisible({ timeout: 10_000 })

    // Re-publish for remaining tests
    await publishTestProfile(TEST_USER.email)
  })

  test('page applies theme background color', async ({ page }) => {
    await page.goto(`/${testSlug}`)
    await page.waitForLoadState('networkidle')

    // The root div should have a backgroundColor style applied
    const rootDiv = page.locator('div.min-h-screen').first()
    await expect(rootDiv).toBeVisible()
    const bgColor = await rootDiv.evaluate((el) => el.style.backgroundColor)
    // Should have some background color set (from theme)
    expect(bgColor).toBeTruthy()
  })

  test('preview mode accepts theme params in URL', async ({ page }) => {
    await page.goto(`/${testSlug}?preview=true&accent_color=%23ff0000&bg_color=%23000000`)
    await page.waitForLoadState('networkidle')

    // Page should load without errors
    await expect(page.locator('h1')).toContainText('Test Playwright DJ')

    // The root div should reflect the custom background color
    const rootDiv = page.locator('div.min-h-screen').first()
    const bgColor = await rootDiv.evaluate((el) => el.style.backgroundColor)
    expect(bgColor).toBeTruthy()
  })
})
