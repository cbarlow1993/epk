import { test, expect } from '@playwright/test'
import { navigateTo } from '../helpers/flow-helpers'

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

    // The display name input should exist and have a value
    const displayNameInput = page.locator('input[type="text"][placeholder="Your name"]')
    await expect(displayNameInput).toBeVisible()
    const value = await displayNameInput.inputValue()
    expect(value.length).toBeGreaterThan(0)
  })

  test('account section shows plan and EPK URL', async ({ page }) => {
    await navigateTo(page, '/dashboard/settings', 'h1')

    // Account heading should be visible
    await expect(page.locator('h2', { hasText: 'Account' })).toBeVisible({ timeout: 10_000 })

    // Account section should show plan info (use exact match to avoid matching "Free plan" in Billing)
    await expect(page.getByText('Plan', { exact: true }).first()).toBeVisible()

    // Should show free or pro plan (scope to avoid matching sidebar "Profile" link which contains "pro")
    const accountHeading = page.locator('h2', { hasText: 'Account' })
    const accountSection = accountHeading.locator('..')
    await expect(accountSection.getByText(/^free$|^pro$/i).first()).toBeVisible()

    // Should show EPK URL
    await expect(page.getByText('EPK URL', { exact: true }).first()).toBeVisible()
  })

  test('security: mismatched passwords show error', async ({ page }) => {
    await navigateTo(page, '/dashboard/settings', 'h1')

    // Find the password inputs (New Password and Confirm Password)
    const passwordInputs = page.locator('input[type="password"]')
    const newPassword = passwordInputs.nth(0)
    const confirmPassword = passwordInputs.nth(1)

    await newPassword.fill('TestPassword1!')
    await confirmPassword.fill('DifferentPassword1!')

    // Click Update Password
    const updateButton = page.locator('button', { hasText: 'Update Password' })
    await updateButton.click()

    // Should show mismatch error
    await expect(page.getByText(/do not match/i)).toBeVisible({ timeout: 5_000 })
  })

  test('security: short password shows error', async ({ page }) => {
    await navigateTo(page, '/dashboard/settings', 'h1')

    // Find the password inputs
    const passwordInputs = page.locator('input[type="password"]')
    const newPassword = passwordInputs.nth(0)
    const confirmPassword = passwordInputs.nth(1)

    await newPassword.fill('short')
    await confirmPassword.fill('short')

    // Click Update Password
    const updateButton = page.locator('button', { hasText: 'Update Password' })
    await updateButton.click()

    // Should show minimum length error
    await expect(page.getByText(/at least 8 characters/i)).toBeVisible({ timeout: 5_000 })
  })
})
