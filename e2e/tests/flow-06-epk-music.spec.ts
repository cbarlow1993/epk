import { test, expect } from '@playwright/test'
import { navigateTo, fillModalField, submitModalAndWait } from '../helpers/flow-helpers'
import { FLOW_USER, MIXES } from '../helpers/flow-test-data'
import { deleteTestMixes, getTestMixes } from '../helpers/supabase-admin'

test.describe('Flow 06: EPK Music', () => {
  test.describe.configure({ mode: 'serial' })

  test.beforeAll(async () => {
    await deleteTestMixes(FLOW_USER.email)
  })

  test('load music page and verify empty state', async ({ page }) => {
    await navigateTo(page, '/dashboard/music', 'h1')
    await expect(page.locator('h1')).toHaveText('Music / Mixes')

    // Verify empty state
    await expect(page.getByText('No mixes yet')).toBeVisible()
  })

  test('add first mix via modal (Summer Vibes 2025)', async ({ page }) => {
    await navigateTo(page, '/dashboard/music', 'h1')

    // Click "+ Add Mix" button
    await page.locator('button', { hasText: '+ Add Mix' }).click()

    // Verify modal opened
    await expect(page.locator('h2', { hasText: 'Add Mix' })).toBeVisible()

    // Fill modal fields
    await fillModalField(page, 'input[name="title"]', MIXES[0].title)
    await fillModalField(page, 'input[name="url"]', MIXES[0].url)
    await fillModalField(page, 'input[name="category"]', MIXES[0].category)

    // Submit and wait for modal to close
    await submitModalAndWait(page, 'Add Mix')

    // Verify mix appears in the list
    await expect(page.getByText(MIXES[0].title)).toBeVisible()

    // Verify empty state is gone
    await expect(page.getByText('No mixes yet')).not.toBeVisible()

    // Verify category header shows with count
    await expect(page.locator('h3', { hasText: MIXES[0].category })).toBeVisible()
    await expect(page.locator('h3', { hasText: '(1)' })).toBeVisible()
  })

  test('add second mix in same category (Warehouse Sessions) and verify grouping', async ({ page }) => {
    await navigateTo(page, '/dashboard/music', 'h1')

    // Click "+ Add Mix" button
    await page.locator('button', { hasText: '+ Add Mix' }).click()
    await expect(page.locator('h2', { hasText: 'Add Mix' })).toBeVisible()

    // Fill modal fields
    await fillModalField(page, 'input[name="title"]', MIXES[1].title)
    await fillModalField(page, 'input[name="url"]', MIXES[1].url)
    await fillModalField(page, 'input[name="category"]', MIXES[1].category)

    // Submit
    await submitModalAndWait(page, 'Add Mix')

    // Verify both mixes are visible
    await expect(page.getByText(MIXES[0].title)).toBeVisible()
    await expect(page.getByText(MIXES[1].title)).toBeVisible()

    // Verify category count updated to 2
    await expect(page.locator('h3', { hasText: '(2)' })).toBeVisible()
  })

  test('add third mix in different category (Original - Midnight) and verify new category', async ({ page }) => {
    await navigateTo(page, '/dashboard/music', 'h1')

    // Click "+ Add Mix"
    await page.locator('button', { hasText: '+ Add Mix' }).click()
    await expect(page.locator('h2', { hasText: 'Add Mix' })).toBeVisible()

    // Fill modal fields for a different category
    await fillModalField(page, 'input[name="title"]', MIXES[2].title)
    await fillModalField(page, 'input[name="url"]', MIXES[2].url)
    await fillModalField(page, 'input[name="category"]', MIXES[2].category)

    // Submit
    await submitModalAndWait(page, 'Add Mix')

    // Verify all three mixes are visible
    await expect(page.getByText(MIXES[2].title)).toBeVisible()

    // Verify new category header appears
    await expect(page.locator('h3', { hasText: MIXES[2].category })).toBeVisible()

    // Verify we now have two category groups
    const categoryHeaders = page.locator('h3')
    await expect(categoryHeaders).toHaveCount(2)
  })

  test('attempt empty title shows validation error', async ({ page }) => {
    await navigateTo(page, '/dashboard/music', 'h1')

    // Open add modal
    await page.locator('button', { hasText: '+ Add Mix' }).click()
    await expect(page.locator('h2', { hasText: 'Add Mix' })).toBeVisible()

    // Submit without filling required fields
    await page.locator('button[type="submit"]', { hasText: 'Save' }).click()

    // Validation errors should appear
    await expect(page.getByText('Title is required')).toBeVisible({ timeout: 5_000 })

    // Modal should still be open
    await expect(page.locator('h2', { hasText: 'Add Mix' })).toBeVisible()
  })

  test('cancel modal without changes', async ({ page }) => {
    await navigateTo(page, '/dashboard/music', 'h1')

    // Count existing mixes before
    const mixTitlesBeforeCount = await page.locator('p.font-bold').count()

    // Open add modal
    await page.locator('button', { hasText: '+ Add Mix' }).click()
    await expect(page.locator('h2', { hasText: 'Add Mix' })).toBeVisible()

    // Fill some data then cancel
    await fillModalField(page, 'input[name="title"]', 'Should Not Save')

    // Click Cancel
    await page.locator('button', { hasText: 'Cancel' }).click()

    // Modal should close
    await expect(page.locator('h2', { hasText: 'Add Mix' })).not.toBeVisible()

    // Mix count should not have changed
    const mixTitlesAfterCount = await page.locator('p.font-bold').count()
    expect(mixTitlesAfterCount).toBe(mixTitlesBeforeCount)

    // "Should Not Save" should not appear
    await expect(page.getByText('Should Not Save')).not.toBeVisible()
  })

  test('verify all 3 mixes in DB', async ({ page }) => {
    const mixes = await getTestMixes(FLOW_USER.email)
    expect(mixes).toHaveLength(3)

    const titles = mixes.map((m: { title: string }) => m.title)
    expect(titles).toContain(MIXES[0].title)
    expect(titles).toContain(MIXES[1].title)
    expect(titles).toContain(MIXES[2].title)

    const categories = mixes.map((m: { category: string }) => m.category)
    expect(categories.filter((c: string) => c === 'DJ Sets')).toHaveLength(2)
    expect(categories.filter((c: string) => c === 'Originals')).toHaveLength(1)
  })
})
