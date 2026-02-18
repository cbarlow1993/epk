import { expect, type Page } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * Fill a react-hook-form registered input reliably.
 * Playwright's fill() doesn't trigger RHF's change detection on uncontrolled inputs.
 * Instead: focus → select all → delete → type character by character.
 */
export async function fillRHFInput(page: Page, selector: string, value: string) {
  const input = page.locator(selector)
  await input.click()
  await page.keyboard.press('Meta+a')
  await page.keyboard.press('Backspace')
  await input.pressSequentially(value, { delay: 20 })
}

/**
 * Wait for React/SSR hydration to complete on a dashboard page.
 * Waits for networkidle + a delay for TanStack Start's hydration cycle,
 * then waits for a specific element to confirm the page is interactive.
 */
export async function waitForHydration(page: Page, waitForSelector?: string) {
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(2000)
  if (waitForSelector) {
    await page.locator(waitForSelector).waitFor({ timeout: 10_000 })
  }
}

/** Locator for the green "Saved" indicator in DashboardHeader. */
export function savedIndicator(page: Page) {
  return page.locator('span.text-green-600', { hasText: 'Saved' })
}

/**
 * Click save and wait for the server function POST to complete.
 * Returns the Response object.
 */
export async function clickSaveAndWait(page: Page) {
  const saveButton = page.locator('button[type="submit"]', { hasText: 'Save' })
  await expect(saveButton).toBeEnabled({ timeout: 5_000 })

  const [response] = await Promise.all([
    page.waitForResponse(
      (resp) => resp.url().includes('_serverFn') && resp.request().method() === 'POST',
      { timeout: 10_000 },
    ),
    saveButton.click(),
  ])

  await expect(savedIndicator(page)).toBeVisible({ timeout: 5_000 })
  return response
}

/**
 * Fill a modal form field using the RHF-compatible method.
 */
export async function fillModalField(page: Page, selector: string, value: string) {
  const input = page.locator(selector)
  await input.click()
  await page.keyboard.press('Meta+a')
  await page.keyboard.press('Backspace')
  await input.pressSequentially(value, { delay: 20 })
}

/**
 * Submit a modal form and wait for the server response + modal to close.
 * @param modalTitle - The text in the modal header (e.g. "Add Mix") used to detect close.
 */
export async function submitModalAndWait(page: Page, modalTitle: string) {
  const [response] = await Promise.all([
    page.waitForResponse(
      (resp) => resp.url().includes('_serverFn') && resp.request().method() === 'POST',
      { timeout: 15_000 },
    ),
    page.locator('button[type="submit"]', { hasText: 'Save' }).click(),
  ])

  // Wait for modal to close
  await expect(page.locator(`text=${modalTitle}`).first()).not.toBeVisible({ timeout: 5_000 })
  return response
}

/**
 * Navigate to a dashboard section and wait for hydration.
 */
export async function navigateTo(page: Page, pagePath: string, waitForSelector?: string) {
  await page.goto(pagePath)
  await waitForHydration(page, waitForSelector)
}

/**
 * Upload a fixture file to a file input.
 * @param fixtureName - filename in e2e/fixtures/ (e.g. 'test-hero.jpg')
 */
export async function uploadFixture(page: Page, selector: string, fixtureName: string) {
  const fixturePath = path.resolve(__dirname, '../fixtures', fixtureName)
  await page.locator(selector).setInputFiles(fixturePath)
}

/**
 * Fill login form with retry loop for SSR hydration.
 */
export async function fillAndSubmitLoginForm(
  page: Page,
  email: string,
  password: string,
) {
  await page.locator('#email').waitFor({ timeout: 15_000 })

  let success = false
  for (let attempt = 0; attempt < 8 && !success; attempt++) {
    try {
      await page.locator('#email').fill(email, { timeout: 3_000 })
      await page.locator('#password').fill(password, { timeout: 3_000 })

      // Verify values were set (catches SSR hydration overwriting fills)
      const emailVal = await page.locator('#email').inputValue()
      const passVal = await page.locator('#password').inputValue()
      if (emailVal !== email || passVal !== password) {
        await page.waitForTimeout(500)
        continue
      }

      await page.locator('button[type="submit"]').click({ timeout: 3_000 })
      success = true
    } catch {
      await page.waitForTimeout(1000)
    }
  }
  if (!success) throw new Error('Failed to submit login form after retries')
}
