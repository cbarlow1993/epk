import { test, expect } from '@playwright/test'
import {
  fillRHFInput,
  waitForHydration,
  clickSaveAndWait,
  navigateTo,
} from '../helpers/flow-helpers'
import { FLOW_USER, PROFILE_DATA, SOCIAL_LINKS } from '../helpers/flow-test-data'
import {
  getTestProfileFull,
  getTestSocialLinks,
} from '../helpers/supabase-admin'

const PROFILE_URL = '/dashboard/profile'

test.describe('Flow 03: EPK Profile', () => {
  test.describe.configure({ mode: 'serial' })

  test.beforeEach(async ({ page }) => {
    await navigateTo(page, PROFILE_URL, 'h1')
    await expect(page.locator('h1', { hasText: 'Profile' })).toBeVisible()
  })

  test('edit display name and save', async ({ page }) => {
    await fillRHFInput(page, 'input[name="display_name"]', PROFILE_DATA.displayName)
    await clickSaveAndWait(page)

    // Verify in database
    const profile = await getTestProfileFull(FLOW_USER.email)
    expect(profile?.display_name).toBe(PROFILE_DATA.displayName)
  })

  test('edit slug and save', async ({ page }) => {
    await fillRHFInput(page, 'input[name="slug"]', PROFILE_DATA.slug)
    await clickSaveAndWait(page)

    // Verify in database
    const profile = await getTestProfileFull(FLOW_USER.email)
    expect(profile?.slug).toBe(PROFILE_DATA.slug)
  })

  test('reserved slug shows error', async ({ page }) => {
    // Clear the slug field and type a reserved slug
    await fillRHFInput(page, 'input[name="slug"]', 'dashboard')
    await clickSaveAndWait(page).catch(() => {
      // clickSaveAndWait may throw if "Saved" indicator never appears — that is expected
    })

    // The server returns an error for reserved slugs, displayed in the header
    // Either a Zod client-side error ("This URL is reserved") or a server error
    const errorText = page.locator('text=/reserved/i')
    await expect(errorText.first()).toBeVisible({ timeout: 5_000 })

    // No restore needed — the server rejects the save, so DB slug is unchanged.
    // The next test's beforeEach will reload the page with the correct slug from DB.
  })

  test('select genres and set BPM range', async ({ page }) => {
    // Click predefined genre chips: House, Techno, Drum & Bass
    for (const genre of PROFILE_DATA.genres) {
      const chip = page.locator('button', { hasText: new RegExp(`^${genre.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`) }).first()
      // Only click if not already selected (no bg-accent class)
      const classes = await chip.getAttribute('class')
      if (!classes || !classes.includes('bg-accent')) {
        await chip.click()
      }
    }

    // Set BPM range
    await fillRHFInput(page, 'input[name="bpm_min"]', PROFILE_DATA.bpmMin)
    await fillRHFInput(page, 'input[name="bpm_max"]', PROFILE_DATA.bpmMax)

    await clickSaveAndWait(page)

    // Verify in database
    const profile = await getTestProfileFull(FLOW_USER.email)
    for (const genre of PROFILE_DATA.genres) {
      expect(profile?.genres).toContain(genre)
    }
    expect(profile?.bpm_min).toBe(Number(PROFILE_DATA.bpmMin))
    expect(profile?.bpm_max).toBe(Number(PROFILE_DATA.bpmMax))
  })

  test('add social links and save', async ({ page }) => {
    // Social links are controlled React inputs (not RHF-registered).
    const socialEntries: [string, string][] = [
      ['soundcloud', SOCIAL_LINKS.soundcloud],
      ['instagram', SOCIAL_LINKS.instagram],
      ['spotify', SOCIAL_LINKS.spotify],
    ]

    for (const [platform, url] of socialEntries) {
      const input = page.locator(`input[type="url"][placeholder*="${platform}"]`)
      await input.fill(url)
      await expect(input).toHaveValue(url)
    }

    // Verify save button is enabled (confirms socialDirty is true)
    await expect(page.locator('button[type="submit"]', { hasText: 'Save' })).toBeEnabled({ timeout: 3_000 })

    await clickSaveAndWait(page)

    // Wait for parallel server calls (profile + social links) to complete
    await page.waitForTimeout(2_000)

    // Verify in database
    const socialLinks = await getTestSocialLinks(FLOW_USER.email)
    for (const [platform, url] of socialEntries) {
      const link = socialLinks.find((l: { platform: string }) => l.platform === platform)
      expect(link, `Expected social link for ${platform} to exist (found ${socialLinks.length} total links)`).toBeTruthy()
      expect((link as { url: string }).url).toBe(url)
    }
  })

  test('save button disabled when form is clean', async ({ page }) => {
    // On fresh load without edits, the save button should be disabled
    const saveButton = page.locator('button[type="submit"]', { hasText: 'Save' })
    await expect(saveButton).toBeDisabled()
  })

  test('profile data persists after reload', async ({ page }) => {
    // Reload the page
    await page.reload()
    await waitForHydration(page, 'h1')

    // Verify display name persisted
    const displayNameInput = page.locator('input[name="display_name"]')
    await expect(displayNameInput).toHaveValue(PROFILE_DATA.displayName)

    // Verify slug persisted
    const slugInput = page.locator('input[name="slug"]')
    await expect(slugInput).toHaveValue(PROFILE_DATA.slug)

    // Verify BPM range persisted
    const bpmMinInput = page.locator('input[name="bpm_min"]')
    const bpmMaxInput = page.locator('input[name="bpm_max"]')
    await expect(bpmMinInput).toHaveValue(PROFILE_DATA.bpmMin)
    await expect(bpmMaxInput).toHaveValue(PROFILE_DATA.bpmMax)

    // Verify genres are selected (have bg-accent class)
    for (const genre of PROFILE_DATA.genres) {
      const chip = page.locator('button', { hasText: new RegExp(`^${genre.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`) }).first()
      await expect(chip).toHaveClass(/bg-accent/)
    }

    // Verify social links persisted
    const soundcloudInput = page.locator('input[type="url"][placeholder*="soundcloud"]')
    await expect(soundcloudInput).toHaveValue(SOCIAL_LINKS.soundcloud)

    const instagramInput = page.locator('input[type="url"][placeholder*="instagram"]')
    await expect(instagramInput).toHaveValue(SOCIAL_LINKS.instagram)

    const spotifyInput = page.locator('input[type="url"][placeholder*="spotify"]')
    await expect(spotifyInput).toHaveValue(SOCIAL_LINKS.spotify)
  })
})
