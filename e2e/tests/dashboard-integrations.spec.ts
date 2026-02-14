import { test, expect, type Page } from '@playwright/test'
import { resetTestIntegrations, getTestIntegrations } from '../helpers/supabase-admin'
import { TEST_USER } from '../helpers/test-data'

/**
 * Wait for React hydration on the dashboard integrations page.
 */
async function waitForHydration(page: Page) {
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(2000)
  await page.locator('h1', { hasText: 'Integrations' }).waitFor({ timeout: 10_000 })
}

test.describe('Dashboard Integrations', () => {
  test.beforeEach(async () => {
    await resetTestIntegrations(TEST_USER.email)
  })

  test('integrations page loads with correct sections', async ({ page }) => {
    await page.goto('/dashboard/integrations')
    await waitForHydration(page)

    // Page title
    await expect(page.locator('h1', { hasText: 'Integrations' })).toBeVisible()

    // Category headings
    await expect(page.locator('h2', { hasText: 'Analytics' })).toBeVisible()
    await expect(page.locator('h2', { hasText: 'Music Embeds' })).toBeVisible()
    await expect(page.locator('h2', { hasText: 'Marketing' })).toBeVisible()
  })

  test('integration cards show expected titles', async ({ page }) => {
    await page.goto('/dashboard/integrations')
    await waitForHydration(page)

    // Analytics integrations
    await expect(page.locator('span', { hasText: 'Google Analytics' })).toBeVisible()
    await expect(page.locator('span', { hasText: 'Plausible Analytics' })).toBeVisible()

    // Music embed integrations
    await expect(page.locator('span', { hasText: 'SoundCloud' })).toBeVisible()
    await expect(page.locator('span', { hasText: 'Spotify' })).toBeVisible()
    await expect(page.locator('span', { hasText: 'Mixcloud' })).toBeVisible()

    // Marketing integrations
    await expect(page.locator('span', { hasText: 'Mailchimp' })).toBeVisible()
    await expect(page.locator('span', { hasText: 'Custom Embed' })).toBeVisible()
  })

  test('all integration cards show Inactive by default', async ({ page }) => {
    await page.goto('/dashboard/integrations')
    await waitForHydration(page)

    // All cards should show "Inactive" status
    const inactiveBadges = page.locator('span', { hasText: 'Inactive' })
    await expect(inactiveBadges).toHaveCount(7) // 2 analytics + 3 embeds + 2 marketing
  })

  test('expand Google Analytics card and see fields', async ({ page }) => {
    await page.goto('/dashboard/integrations')
    await waitForHydration(page)

    // Click the Google Analytics card header to expand
    const gaCard = page.locator('button', { hasText: 'Google Analytics' })
    await gaCard.click()

    // Should see the enable checkbox
    await expect(page.locator('text=Enable on public EPK')).toBeVisible({ timeout: 5_000 })

    // Should see the measurement ID field
    await expect(page.locator('label', { hasText: 'Measurement ID' })).toBeVisible()
    await expect(page.locator('input[placeholder="G-XXXXXXXXXX"]')).toBeVisible()

    // Should see a Save button
    await expect(page.locator('button', { hasText: 'Save' })).toBeVisible()
  })

  test('save Google Analytics integration', async ({ page }) => {
    await page.goto('/dashboard/integrations')
    await waitForHydration(page)

    // Expand the Google Analytics card
    const gaCard = page.locator('button', { hasText: 'Google Analytics' })
    await gaCard.click()

    // Enable the integration
    const enableCheckbox = page.locator('input[type="checkbox"]').first()
    await enableCheckbox.check()

    // Fill in measurement ID
    const measurementInput = page.locator('input[placeholder="G-XXXXXXXXXX"]')
    await measurementInput.fill('G-ABC1234567')

    // Click Save and wait for response
    const saveButton = page.locator('button', { hasText: 'Save' }).first()

    const [response] = await Promise.all([
      page.waitForResponse(
        (resp) => resp.url().includes('_serverFn') && resp.request().method() === 'POST',
        { timeout: 10_000 },
      ),
      saveButton.click(),
    ])

    // Wait for saved indicator
    await expect(page.locator('span', { hasText: 'Saved' })).toBeVisible({ timeout: 5_000 })

    // Verify DB
    const integrations = await getTestIntegrations(TEST_USER.email)
    const ga = integrations.find((i: { type: string }) => i.type === 'google_analytics')
    expect(ga).toBeTruthy()
    expect(ga.enabled).toBe(true)
    expect(ga.config.measurement_id).toBe('G-ABC1234567')
  })

  test('save Plausible Analytics integration', async ({ page }) => {
    await page.goto('/dashboard/integrations')
    await waitForHydration(page)

    // Expand the Plausible card
    const plausibleCard = page.locator('button', { hasText: 'Plausible Analytics' })
    await plausibleCard.click()

    // Enable the integration
    const expandedContent = page.locator('label', { hasText: 'Enable on public EPK' })
    await expect(expandedContent).toBeVisible({ timeout: 5_000 })
    const enableCheckbox = expandedContent.locator('input[type="checkbox"]')
    await enableCheckbox.check()

    // Fill in domain
    const domainInput = page.locator('input[placeholder="myepk.bio"]')
    await domainInput.fill('test-dj.example.com')

    // Click Save
    const saveButton = page.locator('button', { hasText: 'Save' }).first()

    const [response] = await Promise.all([
      page.waitForResponse(
        (resp) => resp.url().includes('_serverFn') && resp.request().method() === 'POST',
        { timeout: 10_000 },
      ),
      saveButton.click(),
    ])

    await expect(page.locator('span', { hasText: 'Saved' })).toBeVisible({ timeout: 5_000 })

    // Verify DB
    const integrations = await getTestIntegrations(TEST_USER.email)
    const plausible = integrations.find((i: { type: string }) => i.type === 'plausible')
    expect(plausible).toBeTruthy()
    expect(plausible.enabled).toBe(true)
    expect(plausible.config.domain).toBe('test-dj.example.com')
  })

  test('integration persists after reload', async ({ page }) => {
    await page.goto('/dashboard/integrations')
    await waitForHydration(page)

    // Expand Google Analytics
    const gaCard = page.locator('button', { hasText: 'Google Analytics' })
    await gaCard.click()

    // Enable and fill in measurement ID
    const enableCheckbox = page.locator('input[type="checkbox"]').first()
    await enableCheckbox.check()
    const measurementInput = page.locator('input[placeholder="G-XXXXXXXXXX"]')
    await measurementInput.fill('G-TEST123456')

    // Save
    const saveButton = page.locator('button', { hasText: 'Save' }).first()
    await Promise.all([
      page.waitForResponse(
        (resp) => resp.url().includes('_serverFn') && resp.request().method() === 'POST',
        { timeout: 10_000 },
      ),
      saveButton.click(),
    ])
    await expect(page.locator('span', { hasText: 'Saved' })).toBeVisible({ timeout: 5_000 })

    // Reload
    await page.reload()
    await waitForHydration(page)

    // The GA card should now show "Active" badge
    const gaCardAfter = page.locator('button', { hasText: 'Google Analytics' })
    const activeLabel = gaCardAfter.locator('span', { hasText: 'Active' })
    await expect(activeLabel).toBeVisible({ timeout: 5_000 })

    // Expand and verify values persisted
    await gaCardAfter.click()
    const measurementInputAfter = page.locator('input[placeholder="G-XXXXXXXXXX"]')
    await expect(measurementInputAfter).toHaveValue('G-TEST123456', { timeout: 5_000 })
  })

  test('expand Spotify card and see embed URL field', async ({ page }) => {
    await page.goto('/dashboard/integrations')
    await waitForHydration(page)

    // Click the Spotify card header to expand
    const spotifyCard = page.locator('button', { hasText: 'Spotify' })
    await spotifyCard.click()

    // Should see the embed URL field
    await expect(page.locator('label', { hasText: 'Track / Playlist URL' })).toBeVisible({ timeout: 5_000 })

    // Should see the Preview Embed button
    await expect(page.locator('button', { hasText: 'Preview Embed' })).toBeVisible()
  })
})
