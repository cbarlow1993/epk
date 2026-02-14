import { test, expect, type Page } from '@playwright/test'
import { deleteTestEvents, getTestEvents } from '../helpers/supabase-admin'
import { TEST_USER } from '../helpers/test-data'

/**
 * Wait for React hydration on the events page.
 */
async function waitForHydration(page: Page) {
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(2000)
  await page.locator('h1', { hasText: 'Events / Brands' }).waitFor({ timeout: 10_000 })
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
 * Add an event via the modal form and wait for the server response.
 */
async function addEventViaModal(
  page: Page,
  data: { name: string; category: string; link_url?: string },
) {
  await page.locator('button', { hasText: '+ Add Event' }).click()
  await page.locator('text=Add Event').waitFor({ timeout: 5_000 })

  await fillModalField(page, 'input[name="name"]', data.name)
  await fillModalField(page, 'input[name="category"]', data.category)
  if (data.link_url) {
    await fillModalField(page, 'input[name="link_url"]', data.link_url)
  }

  const [response] = await Promise.all([
    page.waitForResponse(
      (resp) => resp.url().includes('_serverFn') && resp.request().method() === 'POST',
      { timeout: 15_000 },
    ),
    page.locator('button[type="submit"]', { hasText: 'Save' }).click(),
  ])

  // Wait for modal to close
  await expect(page.locator('text=Add Event').first()).not.toBeVisible({ timeout: 5_000 })

  return response
}

test.describe('Dashboard Events', () => {
  test.beforeEach(async () => {
    await deleteTestEvents(TEST_USER.email)
  })

  test.afterAll(async () => {
    await deleteTestEvents(TEST_USER.email)
  })

  test('events page loads with empty state', async ({ page }) => {
    await page.goto('/dashboard/events')
    await waitForHydration(page)

    // Page title
    await expect(page.locator('h1', { hasText: 'Events / Brands' })).toBeVisible()

    // Empty state message
    await expect(page.locator('text=No events yet')).toBeVisible()

    // Add button should be visible
    await expect(page.locator('button', { hasText: '+ Add Event' })).toBeVisible()
  })

  test('add an event and verify it appears', async ({ page }) => {
    await page.goto('/dashboard/events')
    await waitForHydration(page)

    await addEventViaModal(page, {
      name: 'Test Event One',
      category: 'Residencies',
      link_url: 'https://example.com/event',
    })

    // Event should appear in the list
    await expect(page.locator('text=Test Event One')).toBeVisible({ timeout: 5_000 })
    await expect(page.locator('text=https://example.com/event')).toBeVisible()

    // Category header should appear
    await expect(page.locator('h3', { hasText: 'Residencies' })).toBeVisible()

    // Verify in DB
    const events = await getTestEvents(TEST_USER.email)
    expect(events.length).toBe(1)
    expect(events[0].name).toBe('Test Event One')
    expect(events[0].category).toBe('Residencies')
    expect(events[0].link_url).toBe('https://example.com/event')
  })

  test('edit an event via modal', async ({ page }) => {
    await page.goto('/dashboard/events')
    await waitForHydration(page)

    // Add an event first
    await addEventViaModal(page, {
      name: 'Original Event',
      category: 'Festivals',
    })

    await expect(page.locator('text=Original Event')).toBeVisible({ timeout: 5_000 })

    // Click Edit button on the event
    await page.locator('button', { hasText: 'Edit' }).click()
    await page.locator('text=Edit Event').waitFor({ timeout: 5_000 })

    // Edit name
    await fillModalField(page, 'input[name="name"]', 'Updated Event')

    // Save
    const [response] = await Promise.all([
      page.waitForResponse(
        (resp) => resp.url().includes('_serverFn') && resp.request().method() === 'POST',
        { timeout: 15_000 },
      ),
      page.locator('button[type="submit"]', { hasText: 'Save' }).click(),
    ])

    // Wait for modal to close
    await expect(page.locator('text=Edit Event').first()).not.toBeVisible({ timeout: 5_000 })

    // Updated name should appear
    await expect(page.locator('text=Updated Event')).toBeVisible({ timeout: 5_000 })

    // Verify in DB
    const events = await getTestEvents(TEST_USER.email)
    expect(events.length).toBe(1)
    expect(events[0].name).toBe('Updated Event')
  })

  test('delete an event and verify removal', async ({ page }) => {
    await page.goto('/dashboard/events')
    await waitForHydration(page)

    // Add an event first
    await addEventViaModal(page, {
      name: 'Event To Delete',
      category: 'Clubs',
    })

    await expect(page.locator('text=Event To Delete')).toBeVisible({ timeout: 5_000 })

    // Click Delete button
    page.on('dialog', (dialog) => dialog.accept())
    await page.locator('button', { hasText: 'Delete' }).click()

    // Wait for server response
    await page.waitForResponse(
      (resp) => resp.url().includes('_serverFn') && resp.request().method() === 'POST',
      { timeout: 10_000 },
    )

    // Event should be removed
    await expect(page.locator('text=Event To Delete')).not.toBeVisible({ timeout: 5_000 })

    // Empty state should return
    await expect(page.locator('text=No events yet')).toBeVisible({ timeout: 5_000 })

    // Verify in DB
    const events = await getTestEvents(TEST_USER.email)
    expect(events.length).toBe(0)
  })

  test('add event form validates required fields', async ({ page }) => {
    await page.goto('/dashboard/events')
    await waitForHydration(page)

    // Open add modal
    await page.locator('button', { hasText: '+ Add Event' }).click()
    await page.locator('text=Add Event').waitFor({ timeout: 5_000 })

    // Try to save with empty fields
    await page.locator('button[type="submit"]', { hasText: 'Save' }).click()

    // Should show validation errors
    await expect(page.locator('text=/required/i').first()).toBeVisible({ timeout: 5_000 })
  })

  test('cancel button closes modal without saving', async ({ page }) => {
    await page.goto('/dashboard/events')
    await waitForHydration(page)

    // Open add modal
    await page.locator('button', { hasText: '+ Add Event' }).click()
    await page.locator('text=Add Event').waitFor({ timeout: 5_000 })

    // Fill some data
    await fillModalField(page, 'input[name="name"]', 'Should Not Save')

    // Click cancel
    await page.locator('button', { hasText: 'Cancel' }).click()

    // Modal should close
    await expect(page.locator('text=Add Event').first()).not.toBeVisible({ timeout: 5_000 })

    // Empty state should still be visible
    await expect(page.locator('text=No events yet')).toBeVisible()

    // Nothing in DB
    const events = await getTestEvents(TEST_USER.email)
    expect(events.length).toBe(0)
  })

  test('multiple events in same category appear grouped', async ({ page }) => {
    await page.goto('/dashboard/events')
    await waitForHydration(page)

    await addEventViaModal(page, {
      name: 'Event A',
      category: 'Residencies',
    })
    await expect(page.locator('text=Event A')).toBeVisible({ timeout: 5_000 })

    await addEventViaModal(page, {
      name: 'Event B',
      category: 'Residencies',
    })
    await expect(page.locator('text=Event B')).toBeVisible({ timeout: 5_000 })

    // Category header should show count
    await expect(page.locator('h3', { hasText: 'Residencies' })).toBeVisible()
    await expect(page.locator('text=(2)')).toBeVisible()

    // Both events visible
    await expect(page.locator('text=Event A')).toBeVisible()
    await expect(page.locator('text=Event B')).toBeVisible()
  })
})
