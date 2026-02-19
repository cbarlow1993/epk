import { test, expect } from '@playwright/test'
import { navigateTo, fillModalField, submitModalAndWait } from '../helpers/flow-helpers'
import { FLOW_USER, EVENTS } from '../helpers/flow-test-data'
import { deleteTestEvents, getTestEvents } from '../helpers/supabase-admin'

test.describe('Flow 07: EPK Events', () => {
  test.describe.configure({ mode: 'serial' })

  test.beforeAll(async () => {
    await deleteTestEvents(FLOW_USER.email)
  })

  test('load events page and verify empty state', async ({ page }) => {
    await navigateTo(page, '/dashboard/events', 'h1')
    await expect(page.locator('h1')).toHaveText('Events / Brands')

    // Verify empty state
    await expect(page.getByText('No events yet')).toBeVisible()
  })

  test('add first event via modal (Fabric London)', async ({ page }) => {
    await navigateTo(page, '/dashboard/events', 'h1')

    // Click "+ Add Event" button
    await page.locator('button', { hasText: '+ Add Event' }).click()

    // Verify modal opened
    await expect(page.locator('h2', { hasText: 'Add Event' })).toBeVisible()

    // Fill modal fields
    await fillModalField(page, 'input[name="name"]', EVENTS[0].name)
    await fillModalField(page, 'input[name="category"]', EVENTS[0].category)
    await fillModalField(page, 'input[name="link_url"]', EVENTS[0].linkUrl)

    // Submit and wait for modal to close
    await submitModalAndWait(page, 'Add Event')

    // Verify event appears in the list
    await expect(page.getByText(EVENTS[0].name)).toBeVisible()

    // Verify empty state is gone
    await expect(page.getByText('No events yet')).not.toBeVisible()

    // Verify category header
    await expect(page.locator('h3', { hasText: EVENTS[0].category })).toBeVisible()
    await expect(page.locator('h3', { hasText: '(1)' })).toBeVisible()
  })

  test('add second event in different category (Berghain Guest)', async ({ page }) => {
    await navigateTo(page, '/dashboard/events', 'h1')

    await page.locator('button', { hasText: '+ Add Event' }).click()
    await expect(page.locator('h2', { hasText: 'Add Event' })).toBeVisible()

    await fillModalField(page, 'input[name="name"]', EVENTS[1].name)
    await fillModalField(page, 'input[name="category"]', EVENTS[1].category)
    await fillModalField(page, 'input[name="link_url"]', EVENTS[1].linkUrl)

    await submitModalAndWait(page, 'Add Event')

    // Verify both events visible
    await expect(page.getByText(EVENTS[0].name)).toBeVisible()
    await expect(page.getByText(EVENTS[1].name)).toBeVisible()

    // Verify two category groups
    await expect(page.locator('h3', { hasText: EVENTS[0].category })).toBeVisible()
    await expect(page.locator('h3', { hasText: EVENTS[1].category })).toBeVisible()
  })

  test('add third event in third category (Sonar Festival)', async ({ page }) => {
    await navigateTo(page, '/dashboard/events', 'h1')

    await page.locator('button', { hasText: '+ Add Event' }).click()
    await expect(page.locator('h2', { hasText: 'Add Event' })).toBeVisible()

    await fillModalField(page, 'input[name="name"]', EVENTS[2].name)
    await fillModalField(page, 'input[name="category"]', EVENTS[2].category)
    await fillModalField(page, 'input[name="link_url"]', EVENTS[2].linkUrl)

    await submitModalAndWait(page, 'Add Event')

    // Verify all three events visible
    await expect(page.getByText(EVENTS[2].name)).toBeVisible()

    // Verify three category groups
    const categoryHeaders = page.locator('h3')
    await expect(categoryHeaders).toHaveCount(3)

    // Verify each category has count (1)
    await expect(page.locator('h3', { hasText: EVENTS[0].category })).toBeVisible()
    await expect(page.locator('h3', { hasText: EVENTS[1].category })).toBeVisible()
    await expect(page.locator('h3', { hasText: EVENTS[2].category })).toBeVisible()
  })

  test('attempt empty event name shows validation error', async ({ page }) => {
    await navigateTo(page, '/dashboard/events', 'h1')

    // Open add modal
    await page.locator('button', { hasText: '+ Add Event' }).click()
    await expect(page.locator('h2', { hasText: 'Add Event' })).toBeVisible()

    // Submit without filling required fields (scope to dialog to avoid DashboardHeader Save)
    await page.locator('dialog button[type="submit"]', { hasText: 'Save' }).click()

    // Validation error should appear
    await expect(page.getByText('Name is required')).toBeVisible({ timeout: 5_000 })

    // Modal should still be open
    await expect(page.locator('h2', { hasText: 'Add Event' })).toBeVisible()
  })

  test('cancel modal without saving shows no changes', async ({ page }) => {
    await navigateTo(page, '/dashboard/events', 'h1')

    // Count existing events before
    const eventNamesBeforeCount = await page.locator('p.font-bold').count()

    // Open add modal
    await page.locator('button', { hasText: '+ Add Event' }).click()
    await expect(page.locator('h2', { hasText: 'Add Event' })).toBeVisible()

    // Fill some data then cancel
    await fillModalField(page, 'input[name="name"]', 'Should Not Save')

    // Click Cancel
    await page.locator('button', { hasText: 'Cancel' }).click()

    // Modal should close
    await expect(page.locator('h2', { hasText: 'Add Event' })).not.toBeVisible()

    // Event count should not have changed
    const eventNamesAfterCount = await page.locator('p.font-bold').count()
    expect(eventNamesAfterCount).toBe(eventNamesBeforeCount)

    // "Should Not Save" should not appear
    await expect(page.getByText('Should Not Save')).not.toBeVisible()
  })

  test('verify all 3 events in DB', async ({ page }) => {
    const events = await getTestEvents(FLOW_USER.email)
    expect(events).toHaveLength(3)

    const names = events.map((e: { name: string }) => e.name)
    expect(names).toContain(EVENTS[0].name)
    expect(names).toContain(EVENTS[1].name)
    expect(names).toContain(EVENTS[2].name)

    const categories = events.map((e: { category: string }) => e.category)
    expect(categories).toContain('Residencies')
    expect(categories).toContain('Guest Spots')
    expect(categories).toContain('Festivals')
  })
})
