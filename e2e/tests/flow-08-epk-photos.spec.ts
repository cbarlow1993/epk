import { test, expect } from '@playwright/test'
import { navigateTo, fillModalField, uploadFixture } from '../helpers/flow-helpers'
import { FLOW_USER, PHOTOS } from '../helpers/flow-test-data'
import { deleteTestPhotos, getTestPhotos } from '../helpers/supabase-admin'

test.describe('Flow 08: EPK Photos', () => {
  test.describe.configure({ mode: 'serial' })

  test.beforeAll(async () => {
    await deleteTestPhotos(FLOW_USER.email)
  })

  test('load photos page and verify empty state', async ({ page }) => {
    await navigateTo(page, '/dashboard/photos', 'h1')
    await expect(page.locator('h1')).toHaveText('Photos')

    // Verify empty state
    await expect(page.getByText('No photos yet')).toBeVisible()
    await expect(page.getByText('0 of 20 photos')).toBeVisible()
  })

  test('upload first photo with caption "Live at Fabric"', async ({ page }) => {
    await navigateTo(page, '/dashboard/photos', 'h1')

    // Click "Add Photo" button
    await page.locator('button', { hasText: 'Add Photo' }).first().click()

    // Verify modal opened
    await expect(page.locator('h2', { hasText: 'Add Photo' })).toBeVisible()

    // Upload fixture image via file input inside the modal
    const modalFileInput = page.locator('dialog input[type="file"]')
    await uploadFixture(page, 'dialog input[type="file"]', PHOTOS[0].fixture)

    // Wait for upload to complete
    await expect(page.getByText('Uploading...')).not.toBeVisible({ timeout: 15_000 })

    // Fill caption
    await fillModalField(page, 'input[name="caption"]', PHOTOS[0].caption)

    // Submit - the button text is "Add Photo" for new photos
    const submitBtn = page.locator('button[type="submit"]', { hasText: 'Add Photo' })
    await expect(submitBtn).toBeEnabled({ timeout: 5_000 })

    const [response] = await Promise.all([
      page.waitForResponse(
        (resp) => resp.url().includes('_serverFn') && resp.request().method() === 'POST',
        { timeout: 15_000 },
      ),
      submitBtn.click(),
    ])

    // Wait for modal to close
    await expect(page.locator('h2', { hasText: 'Add Photo' })).not.toBeVisible({ timeout: 5_000 })

    // Verify photo appears and count updates
    await expect(page.getByText('1 of 20 photos')).toBeVisible()
    await expect(page.getByText('No photos yet')).not.toBeVisible()
  })

  test('upload second photo with caption "Studio session"', async ({ page }) => {
    await navigateTo(page, '/dashboard/photos', 'h1')

    // Click "Add Photo" button
    await page.locator('button', { hasText: 'Add Photo' }).first().click()
    await expect(page.locator('h2', { hasText: 'Add Photo' })).toBeVisible()

    // Upload fixture image
    await uploadFixture(page, 'dialog input[type="file"]', PHOTOS[1].fixture)

    // Wait for upload to complete
    await expect(page.getByText('Uploading...')).not.toBeVisible({ timeout: 15_000 })

    // Fill caption
    await fillModalField(page, 'input[name="caption"]', PHOTOS[1].caption)

    // Submit
    const submitBtn = page.locator('button[type="submit"]', { hasText: 'Add Photo' })
    await expect(submitBtn).toBeEnabled({ timeout: 5_000 })

    const [response] = await Promise.all([
      page.waitForResponse(
        (resp) => resp.url().includes('_serverFn') && resp.request().method() === 'POST',
        { timeout: 15_000 },
      ),
      submitBtn.click(),
    ])

    // Wait for modal to close
    await expect(page.locator('h2', { hasText: 'Add Photo' })).not.toBeVisible({ timeout: 5_000 })
  })

  test('verify photo count updates to "2 of 20 photos"', async ({ page }) => {
    await navigateTo(page, '/dashboard/photos', 'h1')

    // Verify count
    await expect(page.getByText('2 of 20 photos')).toBeVisible()
  })

  test('verify photos visible in grid', async ({ page }) => {
    await navigateTo(page, '/dashboard/photos', 'h1')

    // Verify both photos are in the grid
    const photoImages = page.locator('img[alt]').filter({ has: page.locator('[class*="aspect-square"]') })

    // The grid should contain images
    const gridImages = page.locator('.grid img')
    await expect(gridImages).toHaveCount(2)

    // Verify captions are visible
    await expect(page.getByText(PHOTOS[0].caption)).toBeVisible()
    await expect(page.getByText(PHOTOS[1].caption)).toBeVisible()
  })

  test('verify 2 photos in DB', async ({ page }) => {
    const photos = await getTestPhotos(FLOW_USER.email)
    expect(photos).toHaveLength(2)

    const captions = photos.map((p: { caption: string | null }) => p.caption)
    expect(captions).toContain(PHOTOS[0].caption)
    expect(captions).toContain(PHOTOS[1].caption)

    // Verify image URLs are set
    for (const photo of photos) {
      expect((photo as { image_url: string }).image_url).toBeTruthy()
      expect((photo as { image_url: string }).image_url).toMatch(/^https?:\/\//)
    }

    // Verify sort_order
    expect((photos[0] as { sort_order: number }).sort_order).toBeLessThanOrEqual(
      (photos[1] as { sort_order: number }).sort_order
    )
  })
})
