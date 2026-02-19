import { chromium, type FullConfig } from '@playwright/test'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import { createTestUser, deleteTestUser, completeOnboarding } from './helpers/supabase-admin'
import { TEST_USER } from './helpers/test-data'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

dotenv.config({ path: path.resolve(__dirname, '../.env') })

export default async function globalSetup(_config: FullConfig) {
  // Clean up any leftover test user from previous failed runs
  await deleteTestUser(TEST_USER.email)

  // Create fresh test user and mark onboarding complete so login redirects to /dashboard
  await createTestUser(TEST_USER.email, TEST_USER.password, TEST_USER.displayName)
  await completeOnboarding(TEST_USER.email)

  // Log in via browser to capture auth cookies
  const browser = await chromium.launch()
  const context = await browser.newContext()
  const page = await context.newPage()

  // Navigate to login page with retry (SSR may 500 on first load)
  for (let navAttempt = 0; navAttempt < 5; navAttempt++) {
    await page.goto('http://localhost:3000/login')
    await page.waitForLoadState('networkidle')

    const bodyText = await page.locator('body').innerText().catch(() => 'EMPTY')
    console.log(`[global-setup] Attempt ${navAttempt + 1}: Body preview: ${bodyText.substring(0, 200)}`)

    // Check if we got the actual login page (has form fields)
    const hasForm = await page.locator('#email').isVisible().catch(() => false)
    if (hasForm) break

    // If we got an error page, wait and retry
    console.log(`[global-setup] Login page not ready, retrying in 3s...`)
    await page.waitForTimeout(3000)
  }

  // Wait for the form to appear
  await page.locator('#email').waitFor({ timeout: 15_000 })

  // Retry loop to handle SSR hydration replacing DOM nodes
  let success = false
  for (let attempt = 0; attempt < 5 && !success; attempt++) {
    try {
      await page.locator('#email').fill(TEST_USER.email, { timeout: 3_000 })
      await page.locator('#password').fill(TEST_USER.password, { timeout: 3_000 })
      await page.locator('button[type="submit"]').click({ timeout: 3_000 })
      success = true
    } catch {
      await page.waitForTimeout(1000)
    }
  }
  if (!success) throw new Error('Failed to submit login form after retries')

  // Wait for redirect to dashboard
  await page.waitForURL('**/dashboard', { timeout: 15_000 })

  // Save auth state
  const authDir = path.resolve(__dirname, '.auth')
  await context.storageState({ path: path.join(authDir, 'user.json') })

  await browser.close()
}
