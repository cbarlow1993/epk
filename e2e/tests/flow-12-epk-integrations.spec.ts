import { test, expect } from '@playwright/test'
import { navigateTo } from '../helpers/flow-helpers'
import { FLOW_USER, INTEGRATION_DATA } from '../helpers/flow-test-data'
import { getTestIntegrations } from '../helpers/supabase-admin'

test.describe('Flow 12: EPK Integrations', () => {
  test.describe.configure({ mode: 'serial' })

  test('load integrations page and verify all cards inactive', async ({ page }) => {
    await navigateTo(page, '/dashboard/integrations', 'h1')

    // Page title
    await expect(page.locator('h1', { hasText: 'Integrations' })).toBeVisible()

    // Category headings
    await expect(page.locator('h2', { hasText: 'Analytics' })).toBeVisible()
    await expect(page.locator('h2', { hasText: 'Music Embeds' })).toBeVisible()
    await expect(page.locator('h2', { hasText: 'Marketing' })).toBeVisible()

    // All cards should show "Inactive" badge (7 total: 2 analytics + 3 embeds + 2 marketing)
    const inactiveBadges = page.locator('span', { hasText: 'Inactive' })
    await expect(inactiveBadges).toHaveCount(7)
  })

  test('expand Google Analytics card and configure', async ({ page }) => {
    await navigateTo(page, '/dashboard/integrations', 'h1')

    // Click the Google Analytics card header to expand
    const gaCard = page.locator('button', { hasText: 'Google Analytics' })
    await gaCard.click()

    // Should see the enable checkbox and measurement ID field
    await expect(page.locator('text=Enable on public EPK')).toBeVisible({ timeout: 5_000 })
    await expect(page.locator('input[placeholder="G-XXXXXXXXXX"]')).toBeVisible()

    // Enable the integration
    const enableCheckbox = page.locator('input[type="checkbox"]').first()
    await enableCheckbox.check()

    // Fill in measurement ID
    const measurementInput = page.locator('input[placeholder="G-XXXXXXXXXX"]')
    await measurementInput.fill(INTEGRATION_DATA.googleAnalytics.measurementId)

    // Click Save (card-level save, not DashboardHeader)
    const saveButton = page.locator('button', { hasText: 'Save' }).first()

    const [response] = await Promise.all([
      page.waitForResponse(
        (resp) => resp.url().includes('_serverFn') && resp.request().method() === 'POST',
        { timeout: 10_000 },
      ),
      saveButton.click(),
    ])

    // Wait for saved indicator inside the card
    await expect(page.locator('span', { hasText: 'Saved' })).toBeVisible({ timeout: 5_000 })
  })

  test('verify Google Analytics enabled in database', async () => {
    const integrations = await getTestIntegrations(FLOW_USER.email)
    const ga = integrations.find((i: { type: string }) => i.type === 'google_analytics')
    expect(ga).toBeTruthy()
    expect(ga.enabled).toBe(true)
    expect(ga.config.measurement_id).toBe(INTEGRATION_DATA.googleAnalytics.measurementId)
  })

  test('reload and verify Active badge on GA card', async ({ page }) => {
    await navigateTo(page, '/dashboard/integrations', 'h1')

    // The GA card should now show "Active" badge instead of "Inactive"
    const gaCardButton = page.locator('button', { hasText: 'Google Analytics' })
    const activeBadge = gaCardButton.locator('span', { hasText: 'Active' })
    await expect(activeBadge).toBeVisible({ timeout: 5_000 })

    // Expand and verify values persisted
    await gaCardButton.click()
    const measurementInput = page.locator('input[placeholder="G-XXXXXXXXXX"]')
    await expect(measurementInput).toHaveValue(INTEGRATION_DATA.googleAnalytics.measurementId, { timeout: 5_000 })

    // Checkbox should be checked
    const enableCheckbox = page.locator('input[type="checkbox"]').first()
    await expect(enableCheckbox).toBeChecked()
  })
})
