import { test, expect } from '@playwright/test'
import { fillRHFInput, navigateTo, clickSaveAndWait } from '../helpers/flow-helpers'
import { FLOW_USER, CONTACT_DATA } from '../helpers/flow-test-data'
import { getTestBookingContact } from '../helpers/supabase-admin'

test.describe('Flow 09: EPK Contact', () => {
  test.describe.configure({ mode: 'serial' })

  test('load contact page and verify empty fields', async ({ page }) => {
    await navigateTo(page, '/dashboard/contact', 'input[name="manager_name"]')

    // Page title
    await expect(page.locator('h1', { hasText: 'Booking Contact' })).toBeVisible()

    // All four form fields should be present and empty
    await expect(page.locator('input[name="manager_name"]')).toHaveValue('')
    await expect(page.locator('input[name="email"]')).toHaveValue('')
    await expect(page.locator('input[name="phone"]')).toHaveValue('')
    await expect(page.locator('input[name="address"]')).toHaveValue('')

    // Save button should be disabled (no changes)
    await expect(page.locator('button[type="submit"]', { hasText: 'Save' })).toBeDisabled()
  })

  test('fill all contact fields and save', async ({ page }) => {
    await navigateTo(page, '/dashboard/contact', 'input[name="manager_name"]')

    // Fill in all fields using CONTACT_DATA
    await fillRHFInput(page, 'input[name="manager_name"]', CONTACT_DATA.managerName)
    await fillRHFInput(page, 'input[name="email"]', CONTACT_DATA.email)
    await fillRHFInput(page, 'input[name="phone"]', CONTACT_DATA.phone)
    await fillRHFInput(page, 'input[name="address"]', CONTACT_DATA.address)

    // Save and wait for server response
    await clickSaveAndWait(page)
  })

  test('verify all contact fields in database', async () => {
    const dbContact = await getTestBookingContact(FLOW_USER.email)
    expect(dbContact).toBeTruthy()
    expect(dbContact?.manager_name).toBe(CONTACT_DATA.managerName)
    expect(dbContact?.email).toBe(CONTACT_DATA.email)
    expect(dbContact?.phone).toBe(CONTACT_DATA.phone)
    expect(dbContact?.address).toBe(CONTACT_DATA.address)
  })

  test('edit single field and verify others persist after save', async ({ page }) => {
    await navigateTo(page, '/dashboard/contact', 'input[name="manager_name"]')

    // Verify previous values loaded
    await expect(page.locator('input[name="manager_name"]')).toHaveValue(CONTACT_DATA.managerName)
    await expect(page.locator('input[name="email"]')).toHaveValue(CONTACT_DATA.email)
    await expect(page.locator('input[name="address"]')).toHaveValue(CONTACT_DATA.address)

    // Edit only phone
    const newPhone = '+44 7700 900001'
    await fillRHFInput(page, 'input[name="phone"]', newPhone)

    // Save
    await clickSaveAndWait(page)

    // Verify DB: phone updated, others preserved
    const dbContact = await getTestBookingContact(FLOW_USER.email)
    expect(dbContact?.phone).toBe(newPhone)
    expect(dbContact?.manager_name).toBe(CONTACT_DATA.managerName)
    expect(dbContact?.email).toBe(CONTACT_DATA.email)
    expect(dbContact?.address).toBe(CONTACT_DATA.address)
  })
})
