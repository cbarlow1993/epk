import { test, expect } from '@playwright/test'
import { deleteTestUser } from '../helpers/supabase-admin'
import { TEST_USER, TEST_SIGNUP_USER } from '../helpers/test-data'

test.describe('Authentication', () => {
  test('login with valid credentials redirects to dashboard', async ({ page }) => {
    await page.goto('/login')

    await page.locator('#email').fill(TEST_USER.email)
    await page.locator('#password').fill(TEST_USER.password)
    await page.locator('button[type="submit"]').click()

    await page.waitForURL('**/dashboard', { timeout: 15_000 })
    await expect(page).toHaveURL(/\/dashboard/)
  })

  test('login with invalid credentials shows error', async ({ page }) => {
    await page.goto('/login')

    await page.locator('#email').fill(TEST_USER.email)
    await page.locator('#password').fill('wrongpassword123')
    await page.locator('button[type="submit"]').click()

    // Error message appears (Supabase returns "Invalid login credentials")
    await expect(page.locator('text=Invalid login credentials')).toBeVisible({ timeout: 10_000 })

    // Should still be on login page
    await expect(page).toHaveURL(/\/login/)
  })

  test('signup with valid credentials redirects to dashboard', async ({ page }) => {
    // Clean up signup user before test (idempotent)
    await deleteTestUser(TEST_SIGNUP_USER.email)

    await page.goto('/signup')

    await page.locator('#displayName').fill(TEST_SIGNUP_USER.displayName)
    await page.locator('#email').fill(TEST_SIGNUP_USER.email)
    await page.locator('#password').fill(TEST_SIGNUP_USER.password)
    await page.locator('button[type="submit"]').click()

    await page.waitForURL('**/dashboard', { timeout: 15_000 })
    await expect(page).toHaveURL(/\/dashboard/)
  })

  // Clean up signup user after all auth tests
  test.afterAll(async () => {
    await deleteTestUser(TEST_SIGNUP_USER.email)
  })

  test('logout redirects to login', async ({ page }) => {
    // First log in
    await page.goto('/login')
    await page.locator('#email').fill(TEST_USER.email)
    await page.locator('#password').fill(TEST_USER.password)
    await page.locator('button[type="submit"]').click()
    await page.waitForURL('**/dashboard', { timeout: 15_000 })

    // Click logout in sidebar
    await page.locator('button', { hasText: 'Log out' }).click()

    // Should redirect to login
    await page.waitForURL('**/login', { timeout: 15_000 })
    await expect(page).toHaveURL(/\/login/)
  })
})
