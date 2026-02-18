import { test, expect } from '@playwright/test'
import { navigateTo, clickSaveAndWait } from '../helpers/flow-helpers'
import { FLOW_USER, BIO_DATA } from '../helpers/flow-test-data'
import { resetTestProfileBio, getTestProfileHeroData } from '../helpers/supabase-admin'

test.describe('Flow 04: EPK Bio', () => {
  test.describe.configure({ mode: 'serial' })

  test.beforeAll(async () => {
    await resetTestProfileBio(FLOW_USER.email)
  })

  test('load bio page and select single-column layout', async ({ page }) => {
    await navigateTo(page, '/dashboard/bio', 'h1')
    await expect(page.locator('h1')).toHaveText('Bio')

    // Default is two-column; verify "Side Image" label is visible
    await expect(page.getByText('Side Image')).toBeVisible()

    // Select single-column layout
    const singleColumnBtn = page.locator('button', { hasText: 'Single Column' })
    await singleColumnBtn.click()

    // Verify single-column is selected (has border-accent class)
    await expect(singleColumnBtn).toHaveClass(/border-accent/)

    // Verify side image section is hidden in single-column mode
    await expect(page.getByText('Side Image')).not.toBeVisible()
  })

  test('type bio text in Editor.js contenteditable', async ({ page }) => {
    await navigateTo(page, '/dashboard/bio', 'h1')

    // Re-select single-column since page reloaded
    const singleColumnBtn = page.locator('button', { hasText: 'Single Column' })
    await singleColumnBtn.click()
    await expect(singleColumnBtn).toHaveClass(/border-accent/)

    // Wait for Editor.js to initialize
    await page.locator('.ce-block').waitFor({ timeout: 10_000 })

    // Click into the editable area and type bio text
    const editable = page.locator('[contenteditable="true"]').first()
    await editable.click()
    await page.keyboard.press('Meta+a')
    await page.keyboard.press('Backspace')
    await editable.pressSequentially(BIO_DATA.text, { delay: 10 })
  })

  test('save and verify bio data in DB', async ({ page }) => {
    await navigateTo(page, '/dashboard/bio', 'h1')

    // Select single-column layout
    const singleColumnBtn = page.locator('button', { hasText: 'Single Column' })
    await singleColumnBtn.click()

    // Wait for Editor.js to initialize and type bio
    await page.locator('.ce-block').waitFor({ timeout: 10_000 })
    const editable = page.locator('[contenteditable="true"]').first()
    await editable.click()
    await page.keyboard.press('Meta+a')
    await page.keyboard.press('Backspace')
    await editable.pressSequentially(BIO_DATA.text, { delay: 10 })

    // Save
    await clickSaveAndWait(page)

    // Verify in DB
    const profile = await getTestProfileHeroData(FLOW_USER.email)
    expect(profile).toBeTruthy()
    expect(profile!.bio_layout).toBe('single-column')

    // Bio is stored as Editor.js blocks JSON
    const bio = profile!.bio as { blocks: Array<{ data: { text: string } }> }
    expect(bio).toBeTruthy()
    expect(bio.blocks).toBeTruthy()
    expect(bio.blocks.length).toBeGreaterThan(0)
    expect(bio.blocks[0].data.text).toContain('FlowTest bio paragraph')
  })

  test('verify side image section hidden in single-column mode', async ({ page }) => {
    await navigateTo(page, '/dashboard/bio', 'h1')

    // Profile was saved as single-column, so side image should be hidden
    // Wait for layout to reflect saved state
    await page.waitForTimeout(1000)

    // If it loaded as single-column (saved state), Side Image should not be visible
    const layout = await getTestProfileHeroData(FLOW_USER.email)
    expect(layout!.bio_layout).toBe('single-column')

    // The page loads with the saved layout; verify Side Image is not shown
    await expect(page.getByText('Side Image')).not.toBeVisible()

    // Switch to two-column to confirm Side Image appears
    const twoColumnBtn = page.locator('button', { hasText: 'Two Column' })
    await twoColumnBtn.click()
    await expect(page.getByText('Side Image')).toBeVisible()

    // Switch back to single-column to confirm it hides again
    const singleColumnBtn = page.locator('button', { hasText: 'Single Column' })
    await singleColumnBtn.click()
    await expect(page.getByText('Side Image')).not.toBeVisible()
  })
})
