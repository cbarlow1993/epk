import { test, expect } from '@playwright/test'
import { navigateTo, clickSaveAndWait, fillRHFInput, uploadFixture } from '../helpers/flow-helpers'
import { FLOW_USER, HERO_DATA } from '../helpers/flow-test-data'
import { resetTestProfileHero, getTestProfileHeroData } from '../helpers/supabase-admin'

test.describe('Flow 05: EPK Hero', () => {
  test.describe.configure({ mode: 'serial' })

  test.beforeAll(async () => {
    await resetTestProfileHero(FLOW_USER.email)
  })

  test('load hero page and select Contained style', async ({ page }) => {
    await navigateTo(page, '/dashboard/hero', 'h1')
    await expect(page.locator('h1')).toHaveText('Hero')

    // Default is fullbleed; select Contained
    const containedBtn = page.locator('button', { hasText: 'Contained' })
    await containedBtn.click()

    // Verify Contained is selected (has border-accent class)
    await expect(containedBtn).toHaveClass(/border-accent/)
  })

  test('fill tagline and upload hero image', async ({ page }) => {
    await navigateTo(page, '/dashboard/hero', 'h1')

    // Select Contained style
    const containedBtn = page.locator('button', { hasText: 'Contained' })
    await containedBtn.click()
    await expect(containedBtn).toHaveClass(/border-accent/)

    // Fill tagline
    await fillRHFInput(page, 'input[name="tagline"]', HERO_DATA.tagline)

    // Verify Hero Media section is visible (not minimal)
    await expect(page.getByText('Hero Media')).toBeVisible()

    // Image media type should be selected by default
    const imageBtn = page.locator('button', { hasText: 'Static image background' })
    await expect(imageBtn).toHaveClass(/border-accent/)

    // Upload hero image
    await uploadFixture(page, 'input[type="file"][accept="image/*"]', 'test-hero.jpg')

    // Wait for upload to complete — "Remove Image" button appears when done
    await expect(page.locator('button', { hasText: 'Remove Image' })).toBeVisible({ timeout: 15_000 })
  })

  test('save and verify hero data in DB', async ({ page }) => {
    await navigateTo(page, '/dashboard/hero', 'h1')

    // Select Contained style
    const containedBtn = page.locator('button', { hasText: 'Contained' })
    await containedBtn.click()

    // Fill tagline
    await fillRHFInput(page, 'input[name="tagline"]', HERO_DATA.tagline)

    // Upload hero image
    await uploadFixture(page, 'input[type="file"][accept="image/*"]', 'test-hero.jpg')

    // Wait for upload to complete
    await expect(page.locator('button', { hasText: 'Remove Image' })).toBeVisible({ timeout: 15_000 })

    // Save
    await clickSaveAndWait(page)

    // Verify in DB
    const profile = await getTestProfileHeroData(FLOW_USER.email)
    expect(profile).toBeTruthy()
    expect(profile!.hero_style).toBe('contained')
    expect(profile!.tagline).toBe(HERO_DATA.tagline)
    expect(profile!.hero_image_url).toBeTruthy()
  })

  test('switch to Minimal hides media section', async ({ page }) => {
    await navigateTo(page, '/dashboard/hero', 'h1')

    // Hero Media should be visible initially (Contained style was saved)
    await expect(page.getByText('Hero Media')).toBeVisible()

    // Switch to Minimal
    const minimalBtn = page.locator('button', { hasText: 'Minimal' })
    await minimalBtn.click()
    await expect(minimalBtn).toHaveClass(/border-accent/)

    // Hero Media label should be hidden (use label locator to avoid matching preview text)
    await expect(page.locator('label', { hasText: 'Hero Media' })).not.toBeVisible()

    // Preview should show minimal message
    await expect(page.getByText('Minimal style does not display hero media.')).toBeVisible()
  })

  test('reload confirms Contained is still saved (Minimal was not saved)', async ({ page }) => {
    await navigateTo(page, '/dashboard/hero', 'h1')

    // Contained should still be selected (Minimal click in previous test was not saved)
    const containedBtn = page.locator('button', { hasText: 'Contained' })
    await expect(containedBtn).toHaveClass(/border-accent/)

    // Hero Media section should be visible
    await expect(page.locator('label', { hasText: 'Hero Media' })).toBeVisible()

    // Verify style is still contained in DB
    const profile = await getTestProfileHeroData(FLOW_USER.email)
    expect(profile!.hero_style).toBe('contained')
  })
})
