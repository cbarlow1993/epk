import { test, expect, type Page } from '@playwright/test'
import { deleteTestMixes, getTestMixes } from '../helpers/supabase-admin'
import { TEST_USER } from '../helpers/test-data'

/**
 * Wait for React hydration on the music page.
 */
async function waitForHydration(page: Page) {
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(2000)
  await page.locator('h1', { hasText: 'Music / Mixes' }).waitFor({ timeout: 10_000 })
}

/**
 * Fill a modal form field. Uses click + select all + delete + type for RHF compatibility.
 */
async function fillModalField(page: Page, selector: string, value: string) {
  const input = page.locator(selector)
  await input.click()
  await page.keyboard.press('Meta+a')
  await page.keyboard.press('Backspace')
  await input.pressSequentially(value, { delay: 20 })
}

/**
 * Add a mix via the modal form and wait for the server response.
 */
async function addMixViaModal(
  page: Page,
  data: { title: string; url: string; category: string },
) {
  await page.locator('button', { hasText: '+ Add Mix' }).click()
  await page.locator('text=Add Mix').waitFor({ timeout: 5_000 })

  await fillModalField(page, 'input[name="title"]', data.title)
  await fillModalField(page, 'input[name="url"]', data.url)
  await fillModalField(page, 'input[name="category"]', data.category)

  const [response] = await Promise.all([
    page.waitForResponse(
      (resp) => resp.url().includes('_serverFn') && resp.request().method() === 'POST',
      { timeout: 15_000 },
    ),
    page.locator('button[type="submit"]', { hasText: 'Save' }).click(),
  ])

  // Wait for modal to close
  await expect(page.locator('text=Add Mix').first()).not.toBeVisible({ timeout: 5_000 })

  return response
}

test.describe('Dashboard Music', () => {
  test.beforeEach(async () => {
    await deleteTestMixes(TEST_USER.email)
  })

  test.afterAll(async () => {
    await deleteTestMixes(TEST_USER.email)
  })

  test('music page loads with empty state', async ({ page }) => {
    await page.goto('/dashboard/music')
    await waitForHydration(page)

    // Page title
    await expect(page.locator('h1', { hasText: 'Music / Mixes' })).toBeVisible()

    // Empty state message
    await expect(page.locator('text=No mixes yet')).toBeVisible()

    // Add button should be visible
    await expect(page.locator('button', { hasText: '+ Add Mix' })).toBeVisible()
  })

  test('add a mix and verify it appears', async ({ page }) => {
    await page.goto('/dashboard/music')
    await waitForHydration(page)

    await addMixViaModal(page, {
      title: 'Test Mix One',
      url: 'https://soundcloud.com/test/mix-one',
      category: 'Deep House',
    })

    // Mix should appear in the list
    await expect(page.locator('text=Test Mix One')).toBeVisible({ timeout: 5_000 })
    await expect(page.locator('text=https://soundcloud.com/test/mix-one')).toBeVisible()

    // Category header should appear
    await expect(page.locator('h3', { hasText: 'Deep House' })).toBeVisible()

    // Verify in DB
    const mixes = await getTestMixes(TEST_USER.email)
    expect(mixes.length).toBe(1)
    expect(mixes[0].title).toBe('Test Mix One')
    expect(mixes[0].url).toBe('https://soundcloud.com/test/mix-one')
    expect(mixes[0].category).toBe('Deep House')
  })

  test('edit a mix via modal', async ({ page }) => {
    await page.goto('/dashboard/music')
    await waitForHydration(page)

    // Add a mix first
    await addMixViaModal(page, {
      title: 'Original Title',
      url: 'https://soundcloud.com/test/original',
      category: 'Tech House',
    })

    await expect(page.locator('text=Original Title')).toBeVisible({ timeout: 5_000 })

    // Click Edit button on the mix
    await page.locator('button', { hasText: 'Edit' }).click()
    await page.locator('text=Edit Mix').waitFor({ timeout: 5_000 })

    // Edit title
    await fillModalField(page, 'input[name="title"]', 'Updated Title')

    // Save
    const [response] = await Promise.all([
      page.waitForResponse(
        (resp) => resp.url().includes('_serverFn') && resp.request().method() === 'POST',
        { timeout: 15_000 },
      ),
      page.locator('button[type="submit"]', { hasText: 'Save' }).click(),
    ])

    // Wait for modal to close
    await expect(page.locator('text=Edit Mix').first()).not.toBeVisible({ timeout: 5_000 })

    // Updated title should appear
    await expect(page.locator('text=Updated Title')).toBeVisible({ timeout: 5_000 })

    // Verify in DB
    const mixes = await getTestMixes(TEST_USER.email)
    expect(mixes.length).toBe(1)
    expect(mixes[0].title).toBe('Updated Title')
  })

  test('delete a mix and verify removal', async ({ page }) => {
    await page.goto('/dashboard/music')
    await waitForHydration(page)

    // Add a mix first
    await addMixViaModal(page, {
      title: 'Mix To Delete',
      url: 'https://soundcloud.com/test/delete-me',
      category: 'Techno',
    })

    await expect(page.locator('text=Mix To Delete')).toBeVisible({ timeout: 5_000 })

    // Click Delete button
    page.on('dialog', (dialog) => dialog.accept())
    await page.locator('button', { hasText: 'Delete' }).click()

    // Wait for server response
    await page.waitForResponse(
      (resp) => resp.url().includes('_serverFn') && resp.request().method() === 'POST',
      { timeout: 10_000 },
    )

    // Mix should be removed
    await expect(page.locator('text=Mix To Delete')).not.toBeVisible({ timeout: 5_000 })

    // Empty state should return
    await expect(page.locator('text=No mixes yet')).toBeVisible({ timeout: 5_000 })

    // Verify in DB
    const mixes = await getTestMixes(TEST_USER.email)
    expect(mixes.length).toBe(0)
  })

  test('add mix form validates required fields', async ({ page }) => {
    await page.goto('/dashboard/music')
    await waitForHydration(page)

    // Open add modal
    await page.locator('button', { hasText: '+ Add Mix' }).click()
    await page.locator('text=Add Mix').waitFor({ timeout: 5_000 })

    // Try to save with empty fields
    await page.locator('button[type="submit"]', { hasText: 'Save' }).click()

    // Should show validation errors
    await expect(page.locator('text=/required|invalid/i').first()).toBeVisible({ timeout: 5_000 })
  })

  test('cancel button closes modal without saving', async ({ page }) => {
    await page.goto('/dashboard/music')
    await waitForHydration(page)

    // Open add modal
    await page.locator('button', { hasText: '+ Add Mix' }).click()
    await page.locator('text=Add Mix').waitFor({ timeout: 5_000 })

    // Fill some data
    await fillModalField(page, 'input[name="title"]', 'Should Not Save')

    // Click cancel
    await page.locator('button', { hasText: 'Cancel' }).click()

    // Modal should close
    await expect(page.locator('text=Add Mix').first()).not.toBeVisible({ timeout: 5_000 })

    // Empty state should still be visible
    await expect(page.locator('text=No mixes yet')).toBeVisible()

    // Nothing in DB
    const mixes = await getTestMixes(TEST_USER.email)
    expect(mixes.length).toBe(0)
  })

  test('multiple mixes in same category appear grouped', async ({ page }) => {
    await page.goto('/dashboard/music')
    await waitForHydration(page)

    await addMixViaModal(page, {
      title: 'Mix A',
      url: 'https://soundcloud.com/test/mix-a',
      category: 'House',
    })
    await expect(page.locator('text=Mix A')).toBeVisible({ timeout: 5_000 })

    await addMixViaModal(page, {
      title: 'Mix B',
      url: 'https://soundcloud.com/test/mix-b',
      category: 'House',
    })
    await expect(page.locator('text=Mix B')).toBeVisible({ timeout: 5_000 })

    // Category header should show count
    await expect(page.locator('h3', { hasText: 'House' })).toBeVisible()
    await expect(page.locator('text=(2)')).toBeVisible()

    // Both mixes visible
    await expect(page.locator('text=Mix A')).toBeVisible()
    await expect(page.locator('text=Mix B')).toBeVisible()
  })
})
