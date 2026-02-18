import { test, expect } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'
import { fillAndSubmitLoginForm } from '../helpers/flow-helpers'
import { FLOW_USER } from '../helpers/flow-test-data'
import { resetAllFlowTestData } from '../helpers/supabase-admin'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

test.describe('Flow 01: Authentication', () => {
  test.beforeAll(async () => {
    await resetAllFlowTestData(FLOW_USER.email)
  })

  test('login with valid credentials and save auth state', async ({ page, context }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    await fillAndSubmitLoginForm(page, FLOW_USER.email, FLOW_USER.password)

    // Wait for redirect to dashboard
    await page.waitForURL('**/dashboard**', { timeout: 15_000 })
    await expect(page).toHaveURL(/\/dashboard/)

    // Save auth state for subsequent flow tests
    const authDir = path.resolve(__dirname, '../.auth')
    await context.storageState({ path: path.join(authDir, 'flow-user.json') })
  })

  test('login with invalid password shows error', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    await fillAndSubmitLoginForm(page, FLOW_USER.email, 'wrongpassword123')

    await expect(page.locator('text=/invalid|error|incorrect/i')).toBeVisible({ timeout: 10_000 })
    await expect(page).toHaveURL(/\/login/)
  })

  test('login with empty fields shows validation', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    // Click submit without filling fields
    await page.locator('button[type="submit"]').click()

    // Should stay on login page (HTML5 validation or form error)
    await expect(page).toHaveURL(/\/login/)
  })

  test('login with nonexistent email shows error', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    await fillAndSubmitLoginForm(page, 'nonexistent@example.com', 'Test1234!')

    await expect(page.locator('text=/invalid|error|incorrect/i')).toBeVisible({ timeout: 10_000 })
    await expect(page).toHaveURL(/\/login/)
  })
})
