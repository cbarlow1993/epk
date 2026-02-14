import { test, expect } from '@playwright/test'
import {
  createTestUser,
  deleteTestUser,
  resetOnboardingStatus,
} from '../helpers/supabase-admin'
import { TEST_USER } from '../helpers/test-data'

const ONBOARDING_USER = {
  email: 'test_playwright_onboarding@example.com',
  password: 'Test1234!',
  displayName: 'Onboarding Test DJ',
}

// Helper: wait for hydration and fill form with retry (same pattern as auth.spec.ts)
async function fillAndSubmitForm(
  page: import('@playwright/test').Page,
  fields: { selector: string; value: string }[],
  submitSelector: string,
) {
  await page.locator(fields[0].selector).waitFor({ timeout: 15_000 })

  let success = false
  for (let attempt = 0; attempt < 8 && !success; attempt++) {
    try {
      for (const field of fields) {
        const loc = page.locator(field.selector)
        await loc.fill(field.value, { timeout: 3_000 })
      }
      let valuesOk = true
      for (const field of fields) {
        const val = await page.locator(field.selector).inputValue()
        if (val !== field.value) { valuesOk = false; break }
      }
      if (!valuesOk) {
        await page.waitForTimeout(500)
        continue
      }
      await page.locator(submitSelector).click({ timeout: 3_000 })
      success = true
    } catch {
      await page.waitForTimeout(1000)
    }
  }
  if (!success) throw new Error('Failed to submit form after retries')
}

test.describe('Onboarding', () => {
  test('redirects unauthenticated users to login', async ({ page }) => {
    await page.goto('/onboarding')
    await page.waitForURL('**/login', { timeout: 15_000 })
    await expect(page).toHaveURL(/\/login/)
  })

  test('redirects already-onboarded users to dashboard', async ({ page }) => {
    // Log in as the main test user (who has completed onboarding)
    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    await fillAndSubmitForm(page, [
      { selector: '#email', value: TEST_USER.email },
      { selector: '#password', value: TEST_USER.password },
    ], 'button[type="submit"]')

    await page.waitForURL('**/dashboard', { timeout: 15_000 })

    // Now try to go to onboarding - should redirect back to dashboard
    await page.goto('/onboarding')
    await page.waitForURL('**/dashboard', { timeout: 15_000 })
    await expect(page).toHaveURL(/\/dashboard/)
  })

  test('shows onboarding wizard for new user', async ({ page }) => {
    // Create a fresh user for onboarding
    await deleteTestUser(ONBOARDING_USER.email)
    await createTestUser(ONBOARDING_USER.email, ONBOARDING_USER.password, ONBOARDING_USER.displayName)

    // Log in as the new user
    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    await fillAndSubmitForm(page, [
      { selector: '#email', value: ONBOARDING_USER.email },
      { selector: '#password', value: ONBOARDING_USER.password },
    ], 'button[type="submit"]')

    // New user should be redirected to onboarding (or dashboard, depending on state)
    await page.waitForURL(/\/(onboarding|dashboard)/, { timeout: 15_000 })

    // If redirected to dashboard, reset onboarding and navigate manually
    if (page.url().includes('/dashboard')) {
      await resetOnboardingStatus(ONBOARDING_USER.email)
      await page.goto('/onboarding')
      await page.waitForLoadState('networkidle')
    }

    // Should see the profile step heading
    await expect(page.locator('h1', { hasText: 'Set up your profile' })).toBeVisible({ timeout: 15_000 })

    // Step indicators should be visible
    await expect(page.locator('text=Profile').first()).toBeVisible()

    // Form fields should be present
    await expect(page.locator('#display_name')).toBeVisible()
    await expect(page.locator('#slug')).toBeVisible()

    // Clean up
    await deleteTestUser(ONBOARDING_USER.email)
  })

  test('profile step validates empty name', async ({ page }) => {
    await deleteTestUser(ONBOARDING_USER.email)
    await createTestUser(ONBOARDING_USER.email, ONBOARDING_USER.password, ONBOARDING_USER.displayName)

    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    await fillAndSubmitForm(page, [
      { selector: '#email', value: ONBOARDING_USER.email },
      { selector: '#password', value: ONBOARDING_USER.password },
    ], 'button[type="submit"]')

    await page.waitForURL(/\/(onboarding|dashboard)/, { timeout: 15_000 })

    if (page.url().includes('/dashboard')) {
      await resetOnboardingStatus(ONBOARDING_USER.email)
      await page.goto('/onboarding')
      await page.waitForLoadState('networkidle')
    }

    await page.locator('#display_name').waitFor({ timeout: 15_000 })

    // Clear the display name field
    await page.locator('#display_name').click()
    await page.keyboard.press('Meta+a')
    await page.keyboard.press('Backspace')

    // The Continue button should be disabled when name is empty
    const continueButton = page.locator('button', { hasText: 'Continue' })
    await expect(continueButton).toBeDisabled()

    await deleteTestUser(ONBOARDING_USER.email)
  })

  test('profile step auto-generates slug from name', async ({ page }) => {
    await deleteTestUser(ONBOARDING_USER.email)
    await createTestUser(ONBOARDING_USER.email, ONBOARDING_USER.password, ONBOARDING_USER.displayName)

    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    await fillAndSubmitForm(page, [
      { selector: '#email', value: ONBOARDING_USER.email },
      { selector: '#password', value: ONBOARDING_USER.password },
    ], 'button[type="submit"]')

    await page.waitForURL(/\/(onboarding|dashboard)/, { timeout: 15_000 })

    if (page.url().includes('/dashboard')) {
      await resetOnboardingStatus(ONBOARDING_USER.email)
      await page.goto('/onboarding')
      await page.waitForLoadState('networkidle')
    }

    await page.locator('#display_name').waitFor({ timeout: 15_000 })

    // Clear and type a new name
    await page.locator('#display_name').click()
    await page.keyboard.press('Meta+a')
    await page.keyboard.press('Backspace')
    await page.locator('#display_name').pressSequentially('My Cool DJ Name', { delay: 30 })

    // Slug should auto-generate
    await expect(page.locator('#slug')).toHaveValue('my-cool-dj-name', { timeout: 5_000 })

    await deleteTestUser(ONBOARDING_USER.email)
  })
})
