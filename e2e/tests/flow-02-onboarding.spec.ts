import { test, expect } from '@playwright/test'
import { waitForHydration } from '../helpers/flow-helpers'
import { FLOW_USER } from '../helpers/flow-test-data'
import { getTestProfileFull } from '../helpers/supabase-admin'

test.describe('Flow 02: Onboarding & Dashboard Access', () => {
  test('already-onboarded user redirects from onboarding to dashboard', async ({ page }) => {
    await page.goto('/onboarding')
    await page.waitForURL('**/dashboard**', { timeout: 15_000 })
    await expect(page).toHaveURL(/\/dashboard/)
  })

  test('dashboard loads successfully', async ({ page }) => {
    await page.goto('/dashboard')
    await waitForHydration(page, 'h1')
    await expect(page.locator('h1').first()).toBeVisible()
  })

  test('user profile exists in database', async () => {
    const profile = await getTestProfileFull(FLOW_USER.email)
    expect(profile).toBeTruthy()
    expect(profile?.onboarding_completed).toBe(true)
  })
})
