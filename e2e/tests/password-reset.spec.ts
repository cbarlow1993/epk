import { test, expect } from '@playwright/test'

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

test.describe('Forgot Password', () => {
  test('renders forgot password page with form', async ({ page }) => {
    await page.goto('/forgot-password')
    await page.waitForLoadState('networkidle')

    await expect(page.locator('h1', { hasText: 'Reset Password' })).toBeVisible()
    await expect(page.locator('#email')).toBeVisible()
    await expect(page.locator('button[type="submit"]', { hasText: 'Send Reset Link' })).toBeVisible()
  })

  test('has link back to login', async ({ page }) => {
    await page.goto('/forgot-password')
    await page.waitForLoadState('networkidle')

    const loginLink = page.locator('a', { hasText: 'Log in' })
    await expect(loginLink).toBeVisible()
    await expect(loginLink).toHaveAttribute('href', /\/login/)
  })

  test('submitting email shows confirmation message', async ({ page }) => {
    await page.goto('/forgot-password')
    await page.waitForLoadState('networkidle')

    await fillAndSubmitForm(page, [
      { selector: '#email', value: 'test-reset@example.com' },
    ], 'button[type="submit"]')

    // Should show the "Check your email" confirmation
    await expect(page.locator('text=Check your email')).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('text=test-reset@example.com')).toBeVisible()
  })

  test('submit button shows loading state', async ({ page }) => {
    await page.goto('/forgot-password')
    await page.waitForLoadState('networkidle')

    await page.locator('#email').waitFor({ timeout: 15_000 })

    // Fill email
    let filled = false
    for (let attempt = 0; attempt < 5 && !filled; attempt++) {
      try {
        await page.locator('#email').fill('loading-test@example.com', { timeout: 3_000 })
        const val = await page.locator('#email').inputValue()
        if (val === 'loading-test@example.com') filled = true
        else await page.waitForTimeout(500)
      } catch {
        await page.waitForTimeout(1000)
      }
    }

    // Click and check for loading text
    await page.locator('button[type="submit"]').click()
    // The button text should briefly change to "Sending..."
    await expect(page.locator('button[type="submit"]', { hasText: /Sending/ })).toBeVisible({ timeout: 5_000 })
  })
})

test.describe('Reset Password', () => {
  test('redirects to forgot-password when not authenticated', async ({ page }) => {
    await page.goto('/reset-password')

    // The beforeLoad guard redirects unauthenticated users to /forgot-password
    await page.waitForURL('**/forgot-password', { timeout: 15_000 })
    await expect(page).toHaveURL(/\/forgot-password/)
  })
})
