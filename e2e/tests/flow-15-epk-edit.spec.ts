import { test, expect } from '@playwright/test'
import {
  fillRHFInput,
  navigateTo,
  clickSaveAndWait,
  fillModalField,
  submitModalAndWait,
} from '../helpers/flow-helpers'
import { FLOW_USER, EDITS } from '../helpers/flow-test-data'
import {
  getTestProfileFull,
  getTestProfileHeroData,
  getTestThemeData,
  getTestMixes,
  getTestBookingContact,
} from '../helpers/supabase-admin'

test.describe('Flow 15: EPK Edit', () => {
  test.describe.configure({ mode: 'serial' })

  // -----------------------------------------------------------------------
  // 1. Edit profile display name and tagline
  // -----------------------------------------------------------------------
  test('edit profile display name and tagline', async ({ page }) => {
    await navigateTo(page, '/dashboard/profile', 'input[name="display_name"]')

    await fillRHFInput(page, 'input[name="display_name"]', EDITS.displayName)

    // The profile page doesn't have a tagline field — tagline is on the hero page.
    // But the spec says to save displayName here — we follow that.
    await clickSaveAndWait(page)

    // Verify in DB
    const profile = await getTestProfileFull(FLOW_USER.email)
    expect(profile?.display_name).toBe(EDITS.displayName)
  })

  // -----------------------------------------------------------------------
  // 2. Edit hero style to Fullbleed and tagline to "Drop the beat"
  // -----------------------------------------------------------------------
  test('edit hero style to Fullbleed and update tagline', async ({ page }) => {
    await navigateTo(page, '/dashboard/hero', 'h1')
    await expect(page.locator('h1')).toHaveText('Hero')

    // Click Fullbleed style button
    const fullbleedBtn = page.locator('button', { hasText: 'Fullbleed' })
    await fullbleedBtn.click()
    await expect(fullbleedBtn).toHaveClass(/border-accent/)

    // Fill tagline
    await fillRHFInput(page, 'input[name="tagline"]', EDITS.heroTagline)

    // Save
    await clickSaveAndWait(page)

    // Verify in DB
    const profile = await getTestProfileHeroData(FLOW_USER.email)
    expect(profile).toBeTruthy()
    expect(profile!.hero_style).toBe('fullbleed')
    expect(profile!.tagline).toBe(EDITS.heroTagline)
  })

  // -----------------------------------------------------------------------
  // 3. Edit bio layout to Two Column
  // -----------------------------------------------------------------------
  test('edit bio layout to Two Column', async ({ page }) => {
    await navigateTo(page, '/dashboard/bio', 'h1')
    await expect(page.locator('h1')).toHaveText('Bio')

    // Click Two Column button
    const twoColBtn = page.locator('button', { hasText: 'Two Column' })
    await twoColBtn.click()
    await expect(twoColBtn).toHaveClass(/border-accent/)

    // Save
    await clickSaveAndWait(page)

    // Verify in DB
    const profile = await getTestProfileHeroData(FLOW_USER.email)
    expect(profile!.bio_layout).toBe('two-column')
  })

  // -----------------------------------------------------------------------
  // 4. Add a fourth mix (Winter Mix 2025)
  // -----------------------------------------------------------------------
  test('add a fourth mix via modal', async ({ page }) => {
    await navigateTo(page, '/dashboard/music', 'h1')
    await expect(page.locator('h1')).toHaveText('Music / Mixes')

    // Click "+ Add Mix"
    await page.locator('button', { hasText: '+ Add Mix' }).click()
    await expect(page.locator('h2', { hasText: 'Add Mix' })).toBeVisible()

    // Fill modal fields
    await fillModalField(page, 'input[name="title"]', EDITS.newMix.title)
    await fillModalField(page, 'input[name="url"]', EDITS.newMix.url)
    await fillModalField(page, 'input[name="category"]', EDITS.newMix.category)

    // Submit and wait for modal to close
    await submitModalAndWait(page, 'Add Mix')

    // Verify new mix appears in the list
    await expect(page.getByText(EDITS.newMix.title)).toBeVisible()

    // Verify 4 mixes in DB
    const mixes = await getTestMixes(FLOW_USER.email)
    expect(mixes).toHaveLength(4)
    const titles = mixes.map((m: { title: string }) => m.title)
    expect(titles).toContain(EDITS.newMix.title)
  })

  // -----------------------------------------------------------------------
  // 5. Edit first mix title to "Summer Vibes 2025 (Remastered)"
  // -----------------------------------------------------------------------
  test('edit first mix title via Edit modal', async ({ page }) => {
    await navigateTo(page, '/dashboard/music', 'h1')

    // Find the Summer Vibes mix row and click its Edit button (items are divs, not li)
    const mixRow = page.locator('.bg-surface').filter({ hasText: 'Summer Vibes 2025' }).first()
    await mixRow.locator('button', { hasText: 'Edit' }).click()

    // Verify edit modal opened
    await expect(page.locator('h2', { hasText: 'Edit Mix' })).toBeVisible()

    // Change the title
    await fillModalField(page, 'input[name="title"]', EDITS.editedMixTitle)

    // Submit
    await submitModalAndWait(page, 'Edit Mix')

    // Verify updated title is visible on the page
    await expect(page.getByText(EDITS.editedMixTitle)).toBeVisible()
  })

  // -----------------------------------------------------------------------
  // 6. Edit first event name to "Fabric London 2025"
  // -----------------------------------------------------------------------
  test('edit first event name via Edit modal', async ({ page }) => {
    await navigateTo(page, '/dashboard/events', 'h1')
    await expect(page.locator('h1')).toHaveText('Events / Brands')

    // Find the Fabric London event row and click its Edit button (items are divs, not li)
    const fabricRow = page.locator('.bg-surface').filter({ hasText: 'Fabric London' }).first()
    await fabricRow.locator('button', { hasText: 'Edit' }).click()

    // Verify edit modal opened
    await expect(page.locator('h2', { hasText: 'Edit Event' })).toBeVisible()

    // Change the name
    await fillModalField(page, 'input[name="name"]', EDITS.editedEventName)

    // Submit
    await submitModalAndWait(page, 'Edit Event')

    // Verify updated name is visible on the page
    await expect(page.getByText(EDITS.editedEventName)).toBeVisible()
  })

  // -----------------------------------------------------------------------
  // 7. Edit contact phone
  // -----------------------------------------------------------------------
  test('edit contact phone', async ({ page }) => {
    await navigateTo(page, '/dashboard/contact', 'input[name="phone"]')

    // Edit only phone
    await fillRHFInput(page, 'input[name="phone"]', EDITS.contactPhone)

    // Save
    await clickSaveAndWait(page)

    // Verify in DB
    const contact = await getTestBookingContact(FLOW_USER.email)
    expect(contact?.phone).toBe(EDITS.contactPhone)
  })

  // -----------------------------------------------------------------------
  // 8. Edit theme colors: accent and background
  // -----------------------------------------------------------------------
  test('edit theme colors', async ({ page }) => {
    await navigateTo(page, '/dashboard/theme', 'h1')
    await expect(page.locator('h1')).toHaveText('Theme')

    // Open the Colours accordion
    await page.locator('button', { hasText: /^Colours$/ }).click()

    // Wait for accent color input to be visible
    await page.locator('input[name="accent_color"]').waitFor({ timeout: 5_000 })

    // Fill accent color
    await fillRHFInput(page, 'input[name="accent_color"]', EDITS.accentColor)

    // Fill background color (use focus() instead of click — accordion header overlaps the input)
    const bgInput = page.locator('input[name="bg_color"]')
    await bgInput.focus()
    await page.keyboard.press('Meta+a')
    await page.keyboard.press('Backspace')
    await bgInput.pressSequentially(EDITS.bgColor, { delay: 20 })
    await bgInput.blur()

    // Save
    await clickSaveAndWait(page)

    // Verify in DB
    const theme = await getTestThemeData(FLOW_USER.email)
    expect(theme?.accent_color).toBe(EDITS.accentColor)
    expect(theme?.bg_color).toBe(EDITS.bgColor)
  })
})
