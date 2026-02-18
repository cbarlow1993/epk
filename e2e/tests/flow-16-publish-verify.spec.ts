import { test, expect } from '@playwright/test'
import { waitForHydration } from '../helpers/flow-helpers'
import { FLOW_USER, EDITS, MIXES, EVENTS, CONTACT_DATA, BIO_DATA } from '../helpers/flow-test-data'
import {
  publishTestProfile,
  getTestProfileSlug,
  resetTestProfile,
} from '../helpers/supabase-admin'

let slug: string

test.describe('Flow 16: Publish & Verify Public EPK', () => {
  test.describe.configure({ mode: 'serial' })

  // -----------------------------------------------------------------------
  // beforeAll: publish the profile and get the slug
  // -----------------------------------------------------------------------
  test.beforeAll(async () => {
    await publishTestProfile(FLOW_USER.email)
    slug = await getTestProfileSlug(FLOW_USER.email)
    expect(slug).toBeTruthy()
  })

  // -----------------------------------------------------------------------
  // 1. Public page loads with display name and hero tagline
  // -----------------------------------------------------------------------
  test('public page shows display name and hero tagline', async ({ page }) => {
    await page.goto(`/${slug}`)
    await waitForHydration(page, 'h1')

    // Display name in h1 (was edited to "DJ FlowTest Updated" in flow-15)
    await expect(page.locator('h1')).toContainText(EDITS.displayName)

    // Hero tagline (was edited to "Drop the beat" in flow-15)
    await expect(page.getByText(EDITS.heroTagline)).toBeVisible()
  })

  // -----------------------------------------------------------------------
  // 2. Genre tags visible
  // -----------------------------------------------------------------------
  test('genre tags are visible', async ({ page }) => {
    await page.goto(`/${slug}`)
    await waitForHydration(page, 'h1')

    // Genres set during flow-03: House, Techno, Drum & Bass
    await expect(page.getByText('House')).toBeVisible()
    await expect(page.getByText('Techno')).toBeVisible()
  })

  // -----------------------------------------------------------------------
  // 3. Bio section renders
  // -----------------------------------------------------------------------
  test('bio section renders with bio text', async ({ page }) => {
    await page.goto(`/${slug}`)
    await waitForHydration(page, 'h1')

    // Bio section should exist
    const bioSection = page.locator('section#bio')
    await expect(bioSection).toBeVisible()

    // Bio text set during flow-04
    await expect(bioSection.getByText(BIO_DATA.text, { exact: false })).toBeVisible()
  })

  // -----------------------------------------------------------------------
  // 4. Music section: all 4 mix titles visible
  // -----------------------------------------------------------------------
  test('music section shows all 4 mixes', async ({ page }) => {
    await page.goto(`/${slug}`)
    await waitForHydration(page, 'h1')

    const musicSection = page.locator('section#music')
    await expect(musicSection).toBeVisible()

    // Edited first mix title (from flow-15)
    await expect(musicSection.getByText(EDITS.editedMixTitle)).toBeVisible()

    // Second mix (unchanged from flow-06)
    await expect(musicSection.getByText(MIXES[1].title)).toBeVisible()

    // Third mix (unchanged from flow-06)
    await expect(musicSection.getByText(MIXES[2].title)).toBeVisible()

    // New mix added in flow-15
    await expect(musicSection.getByText(EDITS.newMix.title)).toBeVisible()
  })

  // -----------------------------------------------------------------------
  // 5. Events section: edited event name + other events
  // -----------------------------------------------------------------------
  test('events section shows all events', async ({ page }) => {
    await page.goto(`/${slug}`)
    await waitForHydration(page, 'h1')

    const eventsSection = page.locator('section#events')
    await expect(eventsSection).toBeVisible()

    // Edited first event (from flow-15)
    await expect(eventsSection.getByText(EDITS.editedEventName)).toBeVisible()

    // Remaining events (unchanged)
    await expect(eventsSection.getByText(EVENTS[1].name)).toBeVisible()
    await expect(eventsSection.getByText(EVENTS[2].name)).toBeVisible()
  })

  // -----------------------------------------------------------------------
  // 6. Contact info: manager name and email visible
  // -----------------------------------------------------------------------
  test('contact section shows manager name and email', async ({ page }) => {
    await page.goto(`/${slug}`)
    await waitForHydration(page, 'h1')

    const contactSection = page.locator('section#contact')
    await expect(contactSection).toBeVisible()

    // Manager name
    await expect(contactSection.getByText(CONTACT_DATA.managerName)).toBeVisible()

    // Email
    await expect(contactSection.getByText(CONTACT_DATA.email)).toBeVisible()
  })

  // -----------------------------------------------------------------------
  // 7. Theme: background color applied
  // -----------------------------------------------------------------------
  test('theme background color is applied', async ({ page }) => {
    await page.goto(`/${slug}`)
    await waitForHydration(page, 'h1')

    // The root div has an inline backgroundColor style
    // EDITS.bgColor = '#0d0d1a'
    const rootDiv = page.locator('div.min-h-screen').first()
    const bgColor = await rootDiv.evaluate((el) => el.style.backgroundColor)

    // The browser may return rgb() format; check it contains the color
    // #0d0d1a = rgb(13, 13, 26)
    const hasCorrectBg = bgColor.includes('13, 13, 26') || bgColor.includes('#0d0d1a')
    expect(hasCorrectBg).toBe(true)
  })

  // -----------------------------------------------------------------------
  // 8. Footer: "Built with" text visible
  // -----------------------------------------------------------------------
  test('footer shows "Built with" text', async ({ page }) => {
    await page.goto(`/${slug}`)
    await waitForHydration(page, 'h1')

    await expect(page.locator('footer').getByText('Built with')).toBeVisible()
  })

  // -----------------------------------------------------------------------
  // 9. 404: nonexistent slug
  // -----------------------------------------------------------------------
  test('nonexistent slug shows 404 message', async ({ page }) => {
    await page.goto('/this-slug-does-not-exist-ever-12345')
    await waitForHydration(page)

    // The notFoundComponent or the fallback shows one of these messages
    const notFoundText = page.getByText(/doesn.t exist|not found/i)
    await expect(notFoundText.first()).toBeVisible({ timeout: 10_000 })
  })

  // -----------------------------------------------------------------------
  // 10. Unpublish -> 404 -> re-publish
  // -----------------------------------------------------------------------
  test('unpublish hides page, re-publish restores it', async ({ page }) => {
    // Unpublish via admin helper
    // Note: resetTestProfile also resets display_name and other fields
    await resetTestProfile(FLOW_USER.email)

    // Navigate to slug — should show 404
    await page.goto(`/${slug}`)
    await waitForHydration(page)

    const notFoundText = page.getByText(/doesn.t exist|not found/i)
    await expect(notFoundText.first()).toBeVisible({ timeout: 10_000 })

    // Re-publish
    await publishTestProfile(FLOW_USER.email)

    // Navigate again — should show the EPK (display_name was reset to default)
    await page.goto(`/${slug}`)
    await waitForHydration(page, 'h1')

    // Verify h1 is visible — the page loaded successfully after re-publish
    await expect(page.locator('h1')).toBeVisible()
  })
})
