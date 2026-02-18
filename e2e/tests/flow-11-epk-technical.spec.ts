import { test, expect } from '@playwright/test'
import { fillRHFInput, navigateTo, clickSaveAndWait } from '../helpers/flow-helpers'
import { FLOW_USER, TECHNICAL_DATA } from '../helpers/flow-test-data'
import { getTestTechnicalRider } from '../helpers/supabase-admin'

test.describe('Flow 11: EPK Technical Rider', () => {
  test.describe.configure({ mode: 'serial' })

  test('load technical page and verify structure', async ({ page }) => {
    await navigateTo(page, '/dashboard/technical', 'h1')

    // Page title
    await expect(page.locator('h1', { hasText: 'Technical Rider' })).toBeVisible()

    // Section headings
    await expect(page.locator('h2', { hasText: 'Decks' })).toBeVisible()
    await expect(page.locator('h2', { hasText: 'Mixer' })).toBeVisible()
    await expect(page.locator('h2', { hasText: 'Monitoring' })).toBeVisible()

    // Select fields should exist
    await expect(page.locator('select[name="deck_model"]')).toBeVisible()
    await expect(page.locator('select[name="deck_quantity"]')).toBeVisible()
    await expect(page.locator('select[name="mixer_model"]')).toBeVisible()
    await expect(page.locator('select[name="monitor_type"]')).toBeVisible()

    // Additional notes textarea
    await expect(page.locator('textarea[name="additional_notes"]')).toBeVisible()
  })

  test('select deck model and quantity', async ({ page }) => {
    await navigateTo(page, '/dashboard/technical', 'h1')

    // Select deck model
    await page.locator('select[name="deck_model"]').selectOption(TECHNICAL_DATA.deckModel)

    // Select deck quantity
    await page.locator('select[name="deck_quantity"]').selectOption(TECHNICAL_DATA.deckQuantity)

    // Verify selections
    await expect(page.locator('select[name="deck_model"]')).toHaveValue(TECHNICAL_DATA.deckModel)
    await expect(page.locator('select[name="deck_quantity"]')).toHaveValue(TECHNICAL_DATA.deckQuantity)

    // Select mixer model
    await page.locator('select[name="mixer_model"]').selectOption(TECHNICAL_DATA.mixerModel)

    // Select monitor type — this should reveal monitor_quantity field
    await page.locator('select[name="monitor_type"]').selectOption(TECHNICAL_DATA.monitorType)

    // Monitor quantity field should appear
    const monitorQtyInput = page.locator('input[name="monitor_quantity"]')
    await expect(monitorQtyInput).toBeVisible({ timeout: 5_000 })

    // Fill monitor quantity
    await fillRHFInput(page, 'input[name="monitor_quantity"]', TECHNICAL_DATA.monitorQuantity)

    // Fill additional notes
    const textarea = page.locator('textarea[name="additional_notes"]')
    await textarea.click()
    await page.keyboard.press('Meta+a')
    await page.keyboard.press('Backspace')
    await textarea.pressSequentially(TECHNICAL_DATA.notes, { delay: 20 })

    // Save
    await clickSaveAndWait(page)
  })

  test('verify all technical rider values in database', async () => {
    const dbRider = await getTestTechnicalRider(FLOW_USER.email)
    expect(dbRider).toBeTruthy()
    expect(dbRider?.deck_model).toBe(TECHNICAL_DATA.deckModel)
    expect(dbRider?.deck_quantity).toBe(Number(TECHNICAL_DATA.deckQuantity))
    expect(dbRider?.mixer_model).toBe(TECHNICAL_DATA.mixerModel)
    expect(dbRider?.monitor_type).toBe(TECHNICAL_DATA.monitorType)
    expect(dbRider?.monitor_quantity).toBe(Number(TECHNICAL_DATA.monitorQuantity))
    expect(dbRider?.additional_notes).toBe(TECHNICAL_DATA.notes)
  })

  test('reload and verify values persisted in form', async ({ page }) => {
    await navigateTo(page, '/dashboard/technical', 'h1')

    await expect(page.locator('select[name="deck_model"]')).toHaveValue(TECHNICAL_DATA.deckModel)
    await expect(page.locator('select[name="deck_quantity"]')).toHaveValue(TECHNICAL_DATA.deckQuantity)
    await expect(page.locator('select[name="mixer_model"]')).toHaveValue(TECHNICAL_DATA.mixerModel)
    await expect(page.locator('select[name="monitor_type"]')).toHaveValue(TECHNICAL_DATA.monitorType)
    await expect(page.locator('input[name="monitor_quantity"]')).toHaveValue(TECHNICAL_DATA.monitorQuantity)
    await expect(page.locator('textarea[name="additional_notes"]')).toHaveValue(TECHNICAL_DATA.notes)
  })
})
