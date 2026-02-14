import { test, expect } from '@playwright/test'

test.describe('Landing Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
  })

  test('renders hero section with headline and CTA', async ({ page }) => {
    // Main headline text
    await expect(page.locator('h1')).toContainText('Press')
    await expect(page.locator('h1')).toContainText('Kit.')

    // Hero subtext
    await expect(page.locator('text=One link for your bio')).toBeVisible()

    // CTA buttons
    await expect(page.locator('a', { hasText: 'Create Your EPK' }).first()).toBeVisible()
    await expect(page.locator('a', { hasText: 'Learn More' })).toBeVisible()
  })

  test('nav contains login and signup links', async ({ page }) => {
    const nav = page.locator('nav')
    await expect(nav.locator('a', { hasText: 'Log in' })).toBeVisible()
    await expect(nav.locator('a', { hasText: 'Get Started' })).toBeVisible()
  })

  test('features section is present with all feature cards', async ({ page }) => {
    const featuresSection = page.locator('#features')
    await expect(featuresSection).toBeVisible()

    // Check for heading
    await expect(featuresSection.locator('h2', { hasText: 'Features' })).toBeVisible()

    // Check for specific feature titles
    const expectedFeatures = [
      'Bio & Profile',
      'Music & Mixes',
      'Events & Brands',
      'Technical Rider',
      'Press Assets',
      'Booking Contact',
      'Social Links',
      'Custom Themes',
    ]
    for (const feature of expectedFeatures) {
      await expect(featuresSection.locator('h3', { hasText: feature })).toBeVisible()
    }
  })

  test('pricing section shows Free and Pro plans', async ({ page }) => {
    const pricingSection = page.locator('#pricing')
    await expect(pricingSection).toBeVisible()

    await expect(pricingSection.locator('h2', { hasText: 'Pricing' })).toBeVisible()

    // Free plan
    await expect(pricingSection.locator('text=$0')).toBeVisible()
    await expect(pricingSection.locator('a', { hasText: 'Start Free' })).toBeVisible()

    // Pro plan
    await expect(pricingSection.locator('text=$5')).toBeVisible()
    await expect(pricingSection.locator('a', { hasText: 'Go Pro' })).toBeVisible()

    // Recommended badge
    await expect(pricingSection.locator('text=Recommended')).toBeVisible()
  })

  test('CTA section is present', async ({ page }) => {
    await expect(page.locator('h2', { hasText: 'Stop Sending' })).toBeVisible()
    await expect(page.locator('text=Build your electronic press kit in minutes')).toBeVisible()
  })

  test('footer is present with copyright', async ({ page }) => {
    const footer = page.locator('footer')
    await expect(footer).toBeVisible()
    await expect(footer.locator('text=myEPK')).toBeVisible()
  })

  test('login link navigates to login page', async ({ page }) => {
    await page.locator('nav a', { hasText: 'Log in' }).click()
    await page.waitForURL('**/login', { timeout: 10_000 })
    await expect(page).toHaveURL(/\/login/)
  })

  test('signup link navigates to signup page', async ({ page }) => {
    await page.locator('nav a', { hasText: 'Get Started' }).click()
    await page.waitForURL('**/signup', { timeout: 10_000 })
    await expect(page).toHaveURL(/\/signup/)
  })
})
