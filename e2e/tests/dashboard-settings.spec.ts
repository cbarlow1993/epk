import { test, expect, type Page } from '@playwright/test'
import { resetTestProfile, getTestProfileData } from '../helpers/supabase-admin'
import { TEST_USER } from '../helpers/test-data'

/**
 * Wait for React hydration on the dashboard settings page.
 */
async function waitForHydration(page: Page) {
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(2000)
  await page.locator('h1', { hasText: 'Settings' }).waitFor({ timeout: 10_000 })
}

test.describe('Dashboard Settings', () => {
  test.beforeEach(async () => {
    await resetTestProfile(TEST_USER.email)
  })

  test('settings page loads with correct sections', async ({ page }) => {
    await page.goto('/dashboard/settings')
    await waitForHydration(page)

    // Page title
    await expect(page.locator('h1', { hasText: 'Settings' })).toBeVisible()

    // Profile section
    await expect(page.locator('h2', { hasText: 'Profile' })).toBeVisible()

    // Security section
    await expect(page.locator('h2', { hasText: 'Security' })).toBeVisible()

    // Account section
    await expect(page.locator('h2', { hasText: 'Account' })).toBeVisible()

    // Billing section
    await expect(page.locator('h2', { hasText: 'Billing' })).toBeVisible()
  })

  test('profile section shows existing display name', async ({ page }) => {
    await page.goto('/dashboard/settings')
    await waitForHydration(page)

    // The profile card should show the display name in the input
    const profileCard = page.locator('div', { has: page.locator('h2', { hasText: 'Profile' }) })
    const displayNameInput = profileCard.locator('input[type="text"]').first()
    await expect(displayNameInput).toHaveValue(TEST_USER.displayName)

    // Save button in the profile card should be disabled (no changes)
    const saveButton = profileCard.locator('button', { hasText: 'Save' })
    await expect(saveButton).toBeDisabled()
  })

  test('edit display name in settings and save', async ({ page }) => {
    await page.goto('/dashboard/settings')
    await waitForHydration(page)

    // Find the display name input in the profile section
    const profileCard = page.locator('div', { has: page.locator('h2', { hasText: 'Profile' }) }).first()
    const displayNameInput = profileCard.locator('input[type="text"]').first()

    // Clear and type new name
    await displayNameInput.click()
    await page.keyboard.press('Meta+a')
    await page.keyboard.press('Backspace')
    await displayNameInput.pressSequentially('Updated Settings Name', { delay: 20 })

    // Click the profile section Save button and wait for POST
    const saveButton = profileCard.locator('button', { hasText: 'Save' })
    await expect(saveButton).toBeEnabled({ timeout: 5_000 })

    const [response] = await Promise.all([
      page.waitForResponse(
        (resp) => resp.url().includes('_serverFn') && resp.request().method() === 'POST',
        { timeout: 10_000 },
      ),
      saveButton.click(),
    ])

    // Wait for saved indicator
    await expect(profileCard.locator('span', { hasText: 'Saved!' })).toBeVisible({ timeout: 5_000 })

    // Verify DB
    const dbProfile = await getTestProfileData(TEST_USER.email)
    expect(dbProfile?.display_name).toBe('Updated Settings Name')
  })

  test('account section shows plan and slug', async ({ page }) => {
    await page.goto('/dashboard/settings')
    await waitForHydration(page)

    // Account section should show plan info
    const accountCard = page.locator('div', { has: page.locator('h2', { hasText: 'Account' }) }).first()
    await expect(accountCard.locator('text=Plan')).toBeVisible()

    // Should show free or pro plan
    await expect(accountCard.locator('text=/free|pro/i')).toBeVisible()

    // Should show EPK URL
    await expect(accountCard.locator('text=EPK URL')).toBeVisible()
  })

  test('billing section shows upgrade or manage button', async ({ page }) => {
    await page.goto('/dashboard/settings')
    await waitForHydration(page)

    // Billing section should exist
    const billingCard = page.locator('div', { has: page.locator('h2', { hasText: 'Billing' }) }).first()

    // Should show either "Upgrade to Pro" or "Manage Subscription"
    const upgradeButton = billingCard.locator('button', { hasText: /Upgrade to Pro|Manage Subscription/ })
    await expect(upgradeButton).toBeVisible()
  })

  test('security section validates password mismatch', async ({ page }) => {
    await page.goto('/dashboard/settings')
    await waitForHydration(page)

    // Find the security card
    const securityCard = page.locator('div', { has: page.locator('h2', { hasText: 'Security' }) }).first()

    // Fill in mismatched passwords
    const passwordInputs = securityCard.locator('input[type="password"]')
    const newPassword = passwordInputs.nth(0)
    const confirmPassword = passwordInputs.nth(1)

    await newPassword.fill('TestPassword1!')
    await confirmPassword.fill('DifferentPassword1!')

    // Click Update Password
    const updateButton = securityCard.locator('button', { hasText: 'Update Password' })
    await updateButton.click()

    // Should show mismatch error
    await expect(securityCard.locator('text=/do not match/i')).toBeVisible({ timeout: 5_000 })
  })

  test('security section validates short password', async ({ page }) => {
    await page.goto('/dashboard/settings')
    await waitForHydration(page)

    // Find the security card
    const securityCard = page.locator('div', { has: page.locator('h2', { hasText: 'Security' }) }).first()

    // Fill in a short password
    const passwordInputs = securityCard.locator('input[type="password"]')
    const newPassword = passwordInputs.nth(0)
    const confirmPassword = passwordInputs.nth(1)

    await newPassword.fill('short')
    await confirmPassword.fill('short')

    // Click Update Password
    const updateButton = securityCard.locator('button', { hasText: 'Update Password' })
    await updateButton.click()

    // Should show minimum length error
    await expect(securityCard.locator('text=/at least 8 characters/i')).toBeVisible({ timeout: 5_000 })
  })
})
