import { test, expect } from '@playwright/test'
import { navigateTo } from '../helpers/flow-helpers'
import { FLOW_USER } from '../helpers/flow-test-data'

test.describe('Flow 14: EPK Settings', () => {
  test.describe.configure({ mode: 'serial' })

  test('load settings page and verify all sections exist', async ({ page }) => {
    await navigateTo(page, '/dashboard/settings', 'h1')

    // Page title
    await expect(page.locator('h1', { hasText: 'Settings' })).toBeVisible()

    // All section headings
    await expect(page.locator('h2', { hasText: 'Profile' })).toBeVisible()
    await expect(page.locator('h2', { hasText: 'Security' })).toBeVisible()
    await expect(page.locator('h2', { hasText: 'Account' })).toBeVisible()
    await expect(page.locator('h2', { hasText: 'Billing' })).toBeVisible()
  })

  test('profile section shows current display name', async ({ page }) => {
    await navigateTo(page, '/dashboard/settings', 'h1')

    // The profile card should show the display name in the input
    const profileCard = page.locator('div', { has: page.locator('h2', { hasText: 'Profile' }) }).first()
    const displayNameInput = profileCard.locator('input[type="text"]').first()
    await expect(displayNameInput).toHaveValue(FLOW_USER.displayName)

    // Save button in the profile card should be disabled (no changes)
    const saveButton = profileCard.locator('button', { hasText: 'Save' })
    await expect(saveButton).toBeDisabled()
  })

  test('account section shows plan and EPK URL', async ({ page }) => {
    await navigateTo(page, '/dashboard/settings', 'h1')

    // Account section should show plan info
    const accountCard = page.locator('div', { has: page.locator('h2', { hasText: 'Account' }) }).first()
    await expect(accountCard.locator('text=Plan')).toBeVisible()

    // Should show free or pro plan
    await expect(accountCard.locator('text=/free|pro/i')).toBeVisible()

    // Should show EPK URL
    await expect(accountCard.locator('text=EPK URL')).toBeVisible()
  })

  test('security: mismatched passwords show error', async ({ page }) => {
    await navigateTo(page, '/dashboard/settings', 'h1')

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

  test('security: short password shows error', async ({ page }) => {
    await navigateTo(page, '/dashboard/settings', 'h1')

    // Find the security card
    const securityCard = page.locator('div', { has: page.locator('h2', { hasText: 'Security' }) }).first()

    // Fill in a short password (same in both fields)
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
