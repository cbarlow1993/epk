import { test, expect } from '@playwright/test'
import { resetTestProfile } from '../helpers/supabase-admin'
import { TEST_USER } from '../helpers/test-data'

test.describe('Dashboard Profile', () => {
  test.beforeEach(async () => {
    // Reset profile to defaults before each test
    await resetTestProfile(TEST_USER.email)
  })

  test('profile page loads with existing data', async ({ page }) => {
    await page.goto('/dashboard')

    // Page title
    await expect(page.locator('h1', { hasText: 'Profile' })).toBeVisible()

    // Display name field should have the test user's name
    const displayNameInput = page.locator('input[name="display_name"]')
    await expect(displayNameInput).toHaveValue(TEST_USER.displayName)

    // Slug field should exist and have a value
    const slugInput = page.locator('input[name="slug"]')
    await expect(slugInput).not.toHaveValue('')

    // Save button should be disabled (no changes)
    await expect(page.locator('button[type="submit"]', { hasText: 'Save' })).toBeDisabled()
  })

  test('edit display name and tagline then save', async ({ page }) => {
    await page.goto('/dashboard')

    // Edit display name
    const displayNameInput = page.locator('input[name="display_name"]')
    await displayNameInput.clear()
    await displayNameInput.fill('Updated DJ Name')

    // Edit tagline
    const taglineInput = page.locator('input[name="tagline"]')
    await taglineInput.clear()
    await taglineInput.fill('Test Tagline')

    // Save button should now be enabled
    const saveButton = page.locator('button[type="submit"]', { hasText: 'Save' })
    await expect(saveButton).toBeEnabled()

    // Click save
    await saveButton.click()

    // "Saved" indicator should appear
    await expect(page.locator('text=Saved')).toBeVisible({ timeout: 10_000 })

    // Reload and verify values persisted
    await page.reload()
    await expect(page.locator('input[name="display_name"]')).toHaveValue('Updated DJ Name')
    await expect(page.locator('input[name="tagline"]')).toHaveValue('Test Tagline')
  })

  test('slug validation rejects reserved slug', async ({ page }) => {
    await page.goto('/dashboard')

    // Enter a reserved slug
    const slugInput = page.locator('input[name="slug"]')
    await slugInput.clear()
    await slugInput.fill('dashboard')

    // Save
    const saveButton = page.locator('button[type="submit"]')
    await saveButton.click({ force: true })

    // Should see an error (either inline validation or server error)
    // The server will reject the slug since "dashboard" is in reserved_slugs
    await expect(page.locator('text=/error|taken|reserved|unavailable/i')).toBeVisible({ timeout: 10_000 })
  })

  test('toggle publish and verify persistence', async ({ page }) => {
    await page.goto('/dashboard')

    // Published should be off by default
    const toggle = page.locator('button[role="switch"][aria-label="Toggle published status"]')
    await expect(toggle).toHaveAttribute('aria-checked', 'false')

    // Click to publish
    await toggle.click()
    await expect(toggle).toHaveAttribute('aria-checked', 'true')

    // Save
    const saveButton = page.locator('button[type="submit"]')
    await saveButton.click({ force: true })
    await expect(page.locator('text=Saved')).toBeVisible({ timeout: 10_000 })

    // Reload and verify
    await page.reload()
    const toggleAfter = page.locator('button[role="switch"][aria-label="Toggle published status"]')
    await expect(toggleAfter).toHaveAttribute('aria-checked', 'true')
  })

  test('edit genres and verify persistence', async ({ page }) => {
    await page.goto('/dashboard')

    // The genres input has a specific placeholder
    const genres = page.locator('input[placeholder="House, Tech House, Melodic House"]')
    await genres.clear()
    await genres.fill('House, Tech House, Melodic Techno')

    // Save
    const saveButton = page.locator('button[type="submit"]')
    await saveButton.click({ force: true })
    await expect(page.locator('text=Saved')).toBeVisible({ timeout: 10_000 })

    // Reload and verify
    await page.reload()
    await expect(page.locator('input[placeholder="House, Tech House, Melodic House"]')).toHaveValue('House, Tech House, Melodic Techno')
  })
})
