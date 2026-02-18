# Comprehensive E2E Test Suite — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add 16 sequential flow test files that build a complete DJ EPK from scratch, edit it, then verify the public page — alongside shared helpers, fixture files, and Playwright config.

**Architecture:** Sequential flow tests in a new `flow` Playwright project. Each file builds on state from the previous one. Uses a real pre-existing test user (`chrisjbarlow1+test@gmail.com`). Shared helpers eliminate duplication of common patterns (RHF input filling, save-and-wait, modal operations). Fixture images are tiny valid JPEGs/PDFs committed to repo.

**Tech Stack:** Playwright, TypeScript, Supabase admin client for DB verification

---

### Task 1: Create fixture files

**Files:**
- Create: `e2e/fixtures/test-hero.jpg`
- Create: `e2e/fixtures/test-photo-1.jpg`
- Create: `e2e/fixtures/test-photo-2.jpg`
- Create: `e2e/fixtures/test-event.jpg`
- Create: `e2e/fixtures/test-profile.jpg`
- Create: `e2e/fixtures/test-side-image.jpg`
- Create: `e2e/fixtures/test-file.pdf`

**Step 1: Generate minimal valid fixture files**

Use Node.js to create minimal valid JPEG and PDF files. These are tiny binary files (under 1KB each) that are valid enough for upload tests.

```bash
node -e "
const fs = require('fs');
const path = require('path');

// Minimal valid JPEG (1x1 pixel, red)
const jpeg = Buffer.from([
  0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
  0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43,
  0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
  0x09, 0x08, 0x0A, 0x0C, 0x14, 0x0D, 0x0C, 0x0B, 0x0B, 0x0C, 0x19, 0x12,
  0x13, 0x0F, 0x14, 0x1D, 0x1A, 0x1F, 0x1E, 0x1D, 0x1A, 0x1C, 0x1C, 0x20,
  0x24, 0x2E, 0x27, 0x20, 0x22, 0x2C, 0x23, 0x1C, 0x1C, 0x28, 0x37, 0x29,
  0x2C, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1F, 0x27, 0x39, 0x3D, 0x38, 0x32,
  0x3C, 0x2E, 0x33, 0x34, 0x32, 0xFF, 0xC0, 0x00, 0x0B, 0x08, 0x00, 0x01,
  0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xFF, 0xC4, 0x00, 0x1F, 0x00, 0x00,
  0x01, 0x05, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
  0x09, 0x0A, 0x0B, 0xFF, 0xC4, 0x00, 0xB5, 0x10, 0x00, 0x02, 0x01, 0x03,
  0x03, 0x02, 0x04, 0x03, 0x05, 0x05, 0x04, 0x04, 0x00, 0x00, 0x01, 0x7D,
  0x01, 0x02, 0x03, 0x00, 0x04, 0x11, 0x05, 0x12, 0x21, 0x31, 0x41, 0x06,
  0x13, 0x51, 0x61, 0x07, 0x22, 0x71, 0x14, 0x32, 0x81, 0x91, 0xA1, 0x08,
  0x23, 0x42, 0xB1, 0xC1, 0x15, 0x52, 0xD1, 0xF0, 0x24, 0x33, 0x62, 0x72,
  0x82, 0x09, 0x0A, 0x16, 0x17, 0x18, 0x19, 0x1A, 0x25, 0x26, 0x27, 0x28,
  0x29, 0x2A, 0x34, 0x35, 0x36, 0x37, 0x38, 0x39, 0x3A, 0x43, 0x44, 0x45,
  0x46, 0x47, 0x48, 0x49, 0x4A, 0x53, 0x54, 0x55, 0x56, 0x57, 0x58, 0x59,
  0x5A, 0x63, 0x64, 0x65, 0x66, 0x67, 0x68, 0x69, 0x6A, 0x73, 0x74, 0x75,
  0x76, 0x77, 0x78, 0x79, 0x7A, 0x83, 0x84, 0x85, 0x86, 0x87, 0x88, 0x89,
  0x8A, 0x92, 0x93, 0x94, 0x95, 0x96, 0x97, 0x98, 0x99, 0x9A, 0xA2, 0xA3,
  0xA4, 0xA5, 0xA6, 0xA7, 0xA8, 0xA9, 0xAA, 0xB2, 0xB3, 0xB4, 0xB5, 0xB6,
  0xB7, 0xB8, 0xB9, 0xBA, 0xC2, 0xC3, 0xC4, 0xC5, 0xC6, 0xC7, 0xC8, 0xC9,
  0xCA, 0xD2, 0xD3, 0xD4, 0xD5, 0xD6, 0xD7, 0xD8, 0xD9, 0xDA, 0xE1, 0xE2,
  0xE3, 0xE4, 0xE5, 0xE6, 0xE7, 0xE8, 0xE9, 0xEA, 0xF1, 0xF2, 0xF3, 0xF4,
  0xF5, 0xF6, 0xF7, 0xF8, 0xF9, 0xFA, 0xFF, 0xDA, 0x00, 0x08, 0x01, 0x01,
  0x00, 0x00, 0x3F, 0x00, 0x7B, 0x94, 0x11, 0x00, 0x00, 0x00, 0x00, 0x00,
  0xFF, 0xD9
]);

// Minimal valid PDF
const pdf = Buffer.from(
  '%PDF-1.0\\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\\n3 0 obj<</Type/Page/MediaBox[0 0 3 3]/Parent 2 0 R>>endobj\\nxref\\n0 4\\n0000000000 65535 f \\n0000000009 00000 n \\n0000000058 00000 n \\n0000000115 00000 n \\ntrailer<</Size 4/Root 1 0 R>>\\nstartxref\\n190\\n%%EOF',
  'utf8'
);

const dir = 'e2e/fixtures';
fs.mkdirSync(dir, { recursive: true });

const jpegFiles = ['test-hero.jpg', 'test-photo-1.jpg', 'test-photo-2.jpg', 'test-event.jpg', 'test-profile.jpg', 'test-side-image.jpg'];
for (const f of jpegFiles) {
  fs.writeFileSync(path.join(dir, f), jpeg);
}
fs.writeFileSync(path.join(dir, 'test-file.pdf'), pdf);

console.log('Fixture files created.');
"
```

**Step 2: Verify files exist**

Run: `ls -la e2e/fixtures/`
Expected: 7 files (6 JPEGs + 1 PDF), each under 1KB

**Step 3: Commit**

```bash
git add e2e/fixtures/
git commit -m "test: add small fixture files for E2E flow tests"
```

---

### Task 2: Create flow test data constants

**Files:**
- Create: `e2e/helpers/flow-test-data.ts`

**Step 1: Write the test data file**

```ts
export const FLOW_USER = {
  email: 'chrisjbarlow1+test@gmail.com',
  password: 'Test1234!',
  displayName: 'DJ FlowTest',
}

export const PROFILE_DATA = {
  displayName: 'DJ FlowTest',
  tagline: 'Underground house & techno',
  slug: 'dj-flowtest',
  genres: ['House', 'Techno', 'Drum & Bass'] as const,
  bpmMin: '120',
  bpmMax: '140',
}

export const SOCIAL_LINKS = {
  soundcloud: 'https://soundcloud.com/djflowtest',
  instagram: 'https://instagram.com/djflowtest',
  spotify: 'https://open.spotify.com/artist/djflowtest',
}

export const BIO_DATA = {
  layout: 'single-column' as const,
  text: 'FlowTest bio paragraph for E2E testing. This DJ has been rocking dancefloors worldwide.',
}

export const HERO_DATA = {
  style: 'contained' as const,
  tagline: 'Feel the bass drop',
  mediaType: 'image' as const,
}

export const MIXES = [
  { title: 'Summer Vibes 2025', url: 'https://soundcloud.com/test/summer-vibes', category: 'DJ Sets' },
  { title: 'Warehouse Sessions', url: 'https://soundcloud.com/test/warehouse', category: 'DJ Sets' },
  { title: 'Original - Midnight', url: 'https://soundcloud.com/test/midnight', category: 'Originals' },
] as const

export const EVENTS = [
  { name: 'Fabric London', category: 'Residencies', linkUrl: 'https://fabriclondon.com' },
  { name: 'Berghain Guest', category: 'Guest Spots', linkUrl: 'https://berghain.berlin' },
  { name: 'Sonar Festival', category: 'Festivals', linkUrl: 'https://sonar.es' },
] as const

export const PHOTOS = [
  { fixture: 'test-photo-1.jpg', caption: 'Live at Fabric' },
  { fixture: 'test-photo-2.jpg', caption: 'Studio session' },
] as const

export const CONTACT_DATA = {
  managerName: 'Jane Manager',
  email: 'bookings@djflowtest.com',
  phone: '+44 7700 900000',
  address: '123 Music Lane, London, UK',
}

export const THEME_DATA = {
  accentColor: '#ff6600',
  bgColor: '#1a1a2e',
  template: 'Underground',
  animateSections: true,
}

export const TECHNICAL_DATA = {
  deckModel: 'CDJ-3000',
  deckQuantity: '2',
  mixerModel: 'DJM-V10',
  monitorType: 'Booth Monitors',
  monitorQuantity: '2',
  notes: 'Prefer booth monitors at ear level',
}

export const INTEGRATION_DATA = {
  googleAnalytics: { measurementId: 'G-TEST12345' },
}

/** Values changed during flow-15 edit phase */
export const EDITS = {
  displayName: 'DJ FlowTest Updated',
  tagline: 'Deep house & melodic techno',
  heroTagline: 'Drop the beat',
  heroStyle: 'fullbleed' as const,
  bioLayout: 'two-column' as const,
  accentColor: '#00ff88',
  bgColor: '#0d0d1a',
  newMix: { title: 'Winter Mix 2025', url: 'https://soundcloud.com/test/winter-mix', category: 'DJ Sets' },
  editedMixTitle: 'Summer Vibes 2025 (Remastered)',
  editedEventName: 'Fabric London 2025',
  contactPhone: '+44 7700 900001',
}
```

**Step 2: Commit**

```bash
git add e2e/helpers/flow-test-data.ts
git commit -m "test: add flow test data constants"
```

---

### Task 3: Create shared flow helpers

**Files:**
- Create: `e2e/helpers/flow-helpers.ts`

**Step 1: Write the shared helper file**

These helpers consolidate the patterns duplicated across existing test files (fillRHFInput, waitForHydration, clickSaveAndWait, etc.) into one reusable module.

```ts
import { expect, type Page } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * Fill a react-hook-form registered input reliably.
 * Playwright's fill() doesn't trigger RHF's change detection on uncontrolled inputs.
 * Instead: focus → select all → delete → type character by character.
 */
export async function fillRHFInput(page: Page, selector: string, value: string) {
  const input = page.locator(selector)
  await input.click()
  await page.keyboard.press('Meta+a')
  await page.keyboard.press('Backspace')
  await input.pressSequentially(value, { delay: 20 })
}

/**
 * Wait for React/SSR hydration to complete on a dashboard page.
 * Waits for networkidle + a delay for TanStack Start's hydration cycle,
 * then waits for a specific element to confirm the page is interactive.
 */
export async function waitForHydration(page: Page, waitForSelector?: string) {
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(2000)
  if (waitForSelector) {
    await page.locator(waitForSelector).waitFor({ timeout: 10_000 })
  }
}

/** Locator for the green "Saved" indicator in DashboardHeader. */
export function savedIndicator(page: Page) {
  return page.locator('span.text-green-600', { hasText: 'Saved' })
}

/**
 * Click save and wait for the server function POST to complete.
 * Returns the Response object.
 */
export async function clickSaveAndWait(page: Page) {
  const saveButton = page.locator('button[type="submit"]', { hasText: 'Save' })
  await expect(saveButton).toBeEnabled({ timeout: 5_000 })

  const [response] = await Promise.all([
    page.waitForResponse(
      (resp) => resp.url().includes('_serverFn') && resp.request().method() === 'POST',
      { timeout: 10_000 },
    ),
    saveButton.click(),
  ])

  await expect(savedIndicator(page)).toBeVisible({ timeout: 5_000 })
  return response
}

/**
 * Fill a modal form field using the RHF-compatible method.
 */
export async function fillModalField(page: Page, selector: string, value: string) {
  const input = page.locator(selector)
  await input.click()
  await page.keyboard.press('Meta+a')
  await page.keyboard.press('Backspace')
  await input.pressSequentially(value, { delay: 20 })
}

/**
 * Submit a modal form and wait for the server response + modal to close.
 * @param modalTitle - The text in the modal header (e.g. "Add Mix") used to detect close.
 */
export async function submitModalAndWait(page: Page, modalTitle: string) {
  const [response] = await Promise.all([
    page.waitForResponse(
      (resp) => resp.url().includes('_serverFn') && resp.request().method() === 'POST',
      { timeout: 15_000 },
    ),
    page.locator('button[type="submit"]', { hasText: 'Save' }).click(),
  ])

  // Wait for modal to close
  await expect(page.locator(`text=${modalTitle}`).first()).not.toBeVisible({ timeout: 5_000 })
  return response
}

/**
 * Navigate to a dashboard section and wait for hydration.
 */
export async function navigateTo(page: Page, path: string, waitForSelector?: string) {
  await page.goto(path)
  await waitForHydration(page, waitForSelector)
}

/**
 * Upload a fixture file to a file input.
 * @param fixtureName - filename in e2e/fixtures/ (e.g. 'test-hero.jpg')
 */
export async function uploadFixture(page: Page, selector: string, fixtureName: string) {
  const fixturePath = path.resolve(__dirname, '../fixtures', fixtureName)
  await page.locator(selector).setInputFiles(fixturePath)
}

/**
 * Fill login form with retry loop for SSR hydration.
 */
export async function fillAndSubmitLoginForm(
  page: Page,
  email: string,
  password: string,
) {
  await page.locator('#email').waitFor({ timeout: 15_000 })

  let success = false
  for (let attempt = 0; attempt < 8 && !success; attempt++) {
    try {
      await page.locator('#email').fill(email, { timeout: 3_000 })
      await page.locator('#password').fill(password, { timeout: 3_000 })

      // Verify values were set (catches SSR hydration overwriting fills)
      const emailVal = await page.locator('#email').inputValue()
      const passVal = await page.locator('#password').inputValue()
      if (emailVal !== email || passVal !== password) {
        await page.waitForTimeout(500)
        continue
      }

      await page.locator('button[type="submit"]').click({ timeout: 3_000 })
      success = true
    } catch {
      await page.waitForTimeout(1000)
    }
  }
  if (!success) throw new Error('Failed to submit login form after retries')
}
```

**Step 2: Commit**

```bash
git add e2e/helpers/flow-helpers.ts
git commit -m "test: add shared flow test helpers"
```

---

### Task 4: Extend supabase-admin helpers

**Files:**
- Modify: `e2e/helpers/supabase-admin.ts`

**Step 1: Add all the missing helper functions**

The existing test files import many functions that don't exist yet. Add them all to supabase-admin.ts. These functions follow the same pattern as existing ones: get admin client → find user by email → query/update the relevant table.

Add these functions after the existing `resetTestProfile` function (after line 80):

```ts
// --- Profile-specific resets ---

export async function resetTestProfileBio(email: string) {
  const admin = getAdminClient()
  const { data: { users } } = await admin.auth.admin.listUsers()
  const user = users.find((u) => u.email === email)
  if (!user) throw new Error(`Test user ${email} not found`)
  await admin.from('profiles').update({
    bio: null,
    bio_layout: 'two-column',
    profile_image_url: null,
  }).eq('id', user.id)
}

export async function resetTestProfileHero(email: string) {
  const admin = getAdminClient()
  const { data: { users } } = await admin.auth.admin.listUsers()
  const user = users.find((u) => u.email === email)
  if (!user) throw new Error(`Test user ${email} not found`)
  await admin.from('profiles').update({
    hero_style: 'fullbleed',
    tagline: '',
    hero_image_url: null,
    hero_video_url: null,
  }).eq('id', user.id)
}

export async function getTestProfileHeroData(email: string) {
  const admin = getAdminClient()
  const { data: { users } } = await admin.auth.admin.listUsers()
  const user = users.find((u) => u.email === email)
  if (!user) throw new Error(`Test user ${email} not found`)
  const { data } = await admin.from('profiles')
    .select('hero_style, tagline, hero_image_url, hero_video_url, bio, bio_layout, profile_image_url')
    .eq('id', user.id).single()
  return data
}

export async function publishTestProfile(email: string) {
  const admin = getAdminClient()
  const { data: { users } } = await admin.auth.admin.listUsers()
  const user = users.find((u) => u.email === email)
  if (!user) throw new Error(`Test user ${email} not found`)
  await admin.from('profiles').update({ published: true }).eq('id', user.id)
}

export async function getTestProfileSlug(email: string) {
  const admin = getAdminClient()
  const { data: { users } } = await admin.auth.admin.listUsers()
  const user = users.find((u) => u.email === email)
  if (!user) throw new Error(`Test user ${email} not found`)
  const { data } = await admin.from('profiles').select('slug').eq('id', user.id).single()
  return data?.slug as string
}

export async function resetOnboardingStatus(email: string) {
  const admin = getAdminClient()
  const { data: { users } } = await admin.auth.admin.listUsers()
  const user = users.find((u) => u.email === email)
  if (!user) throw new Error(`Test user ${email} not found`)
  await admin.from('profiles').update({ onboarding_completed: false }).eq('id', user.id)
}

// --- Theme ---

export async function resetTestTheme(email: string) {
  const admin = getAdminClient()
  const { data: { users } } = await admin.auth.admin.listUsers()
  const user = users.find((u) => u.email === email)
  if (!user) throw new Error(`Test user ${email} not found`)
  await admin.from('profiles').update({
    accent_color: '#6366f1',
    bg_color: '#0f0f23',
    template: null,
    animate_sections: true,
  }).eq('id', user.id)
}

export async function getTestThemeData(email: string) {
  const admin = getAdminClient()
  const { data: { users } } = await admin.auth.admin.listUsers()
  const user = users.find((u) => u.email === email)
  if (!user) throw new Error(`Test user ${email} not found`)
  const { data } = await admin.from('profiles')
    .select('accent_color, bg_color, template, animate_sections')
    .eq('id', user.id).single()
  return data
}

// --- Mixes ---

export async function deleteTestMixes(email: string) {
  const admin = getAdminClient()
  const { data: { users } } = await admin.auth.admin.listUsers()
  const user = users.find((u) => u.email === email)
  if (!user) return
  await admin.from('mixes').delete().eq('profile_id', user.id)
}

export async function getTestMixes(email: string) {
  const admin = getAdminClient()
  const { data: { users } } = await admin.auth.admin.listUsers()
  const user = users.find((u) => u.email === email)
  if (!user) throw new Error(`Test user ${email} not found`)
  const { data } = await admin.from('mixes')
    .select('*')
    .eq('profile_id', user.id)
    .order('sort_order', { ascending: true })
  return data || []
}

// --- Events ---

export async function deleteTestEvents(email: string) {
  const admin = getAdminClient()
  const { data: { users } } = await admin.auth.admin.listUsers()
  const user = users.find((u) => u.email === email)
  if (!user) return
  await admin.from('events').delete().eq('profile_id', user.id)
}

export async function getTestEvents(email: string) {
  const admin = getAdminClient()
  const { data: { users } } = await admin.auth.admin.listUsers()
  const user = users.find((u) => u.email === email)
  if (!user) throw new Error(`Test user ${email} not found`)
  const { data } = await admin.from('events')
    .select('*')
    .eq('profile_id', user.id)
    .order('sort_order', { ascending: true })
  return data || []
}

// --- Photos ---

export async function deleteTestPhotos(email: string) {
  const admin = getAdminClient()
  const { data: { users } } = await admin.auth.admin.listUsers()
  const user = users.find((u) => u.email === email)
  if (!user) return
  await admin.from('photos').delete().eq('profile_id', user.id)
}

export async function getTestPhotos(email: string) {
  const admin = getAdminClient()
  const { data: { users } } = await admin.auth.admin.listUsers()
  const user = users.find((u) => u.email === email)
  if (!user) throw new Error(`Test user ${email} not found`)
  const { data } = await admin.from('photos')
    .select('*')
    .eq('profile_id', user.id)
    .order('sort_order', { ascending: true })
  return data || []
}

// --- Booking Contact ---

export async function resetTestBookingContact(email: string) {
  const admin = getAdminClient()
  const { data: { users } } = await admin.auth.admin.listUsers()
  const user = users.find((u) => u.email === email)
  if (!user) throw new Error(`Test user ${email} not found`)
  await admin.from('booking_contact').delete().eq('profile_id', user.id)
}

export async function getTestBookingContact(email: string) {
  const admin = getAdminClient()
  const { data: { users } } = await admin.auth.admin.listUsers()
  const user = users.find((u) => u.email === email)
  if (!user) throw new Error(`Test user ${email} not found`)
  const { data } = await admin.from('booking_contact')
    .select('*')
    .eq('profile_id', user.id)
    .single()
  return data
}

// --- Technical Rider ---

export async function resetTestTechnicalRider(email: string) {
  const admin = getAdminClient()
  const { data: { users } } = await admin.auth.admin.listUsers()
  const user = users.find((u) => u.email === email)
  if (!user) throw new Error(`Test user ${email} not found`)
  await admin.from('technical_rider').delete().eq('profile_id', user.id)
}

export async function getTestTechnicalRider(email: string) {
  const admin = getAdminClient()
  const { data: { users } } = await admin.auth.admin.listUsers()
  const user = users.find((u) => u.email === email)
  if (!user) throw new Error(`Test user ${email} not found`)
  const { data } = await admin.from('technical_rider')
    .select('*')
    .eq('profile_id', user.id)
    .single()
  return data
}

// --- Files & Folders ---

export async function deleteTestFiles(email: string) {
  const admin = getAdminClient()
  const { data: { users } } = await admin.auth.admin.listUsers()
  const user = users.find((u) => u.email === email)
  if (!user) return
  await admin.from('files').delete().eq('profile_id', user.id)
}

export async function deleteTestFolders(email: string) {
  const admin = getAdminClient()
  const { data: { users } } = await admin.auth.admin.listUsers()
  const user = users.find((u) => u.email === email)
  if (!user) return
  await admin.from('folders').delete().eq('profile_id', user.id)
}

// --- Integrations ---

export async function resetTestIntegrations(email: string) {
  const admin = getAdminClient()
  const { data: { users } } = await admin.auth.admin.listUsers()
  const user = users.find((u) => u.email === email)
  if (!user) throw new Error(`Test user ${email} not found`)
  await admin.from('profiles').update({ integrations: null }).eq('id', user.id)
}

export async function getTestIntegrations(email: string) {
  const admin = getAdminClient()
  const { data: { users } } = await admin.auth.admin.listUsers()
  const user = users.find((u) => u.email === email)
  if (!user) throw new Error(`Test user ${email} not found`)
  const { data } = await admin.from('profiles')
    .select('integrations')
    .eq('id', user.id)
    .single()
  return (data?.integrations as Array<{ type: string; enabled: boolean; config: Record<string, string> }>) || []
}

// --- Social Links ---

export async function deleteTestSocialLinks(email: string) {
  const admin = getAdminClient()
  const { data: { users } } = await admin.auth.admin.listUsers()
  const user = users.find((u) => u.email === email)
  if (!user) return
  await admin.from('social_links').delete().eq('profile_id', user.id)
}

export async function getTestSocialLinks(email: string) {
  const admin = getAdminClient()
  const { data: { users } } = await admin.auth.admin.listUsers()
  const user = users.find((u) => u.email === email)
  if (!user) throw new Error(`Test user ${email} not found`)
  const { data } = await admin.from('social_links')
    .select('*')
    .eq('profile_id', user.id)
    .order('sort_order', { ascending: true })
  return data || []
}

// --- Full profile data (extended) ---

export async function getTestProfileFull(email: string) {
  const admin = getAdminClient()
  const { data: { users } } = await admin.auth.admin.listUsers()
  const user = users.find((u) => u.email === email)
  if (!user) throw new Error(`Test user ${email} not found`)
  const { data } = await admin.from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()
  return data
}

// --- Reset all flow test data ---

export async function resetAllFlowTestData(email: string) {
  await deleteTestMixes(email)
  await deleteTestEvents(email)
  await deleteTestPhotos(email)
  await deleteTestFiles(email)
  await deleteTestFolders(email)
  await deleteTestSocialLinks(email)
  await resetTestBookingContact(email).catch(() => {})
  await resetTestTechnicalRider(email).catch(() => {})
  await resetTestIntegrations(email)

  const admin = getAdminClient()
  const { data: { users } } = await admin.auth.admin.listUsers()
  const user = users.find((u) => u.email === email)
  if (!user) return

  await admin.from('profiles').update({
    display_name: 'DJ FlowTest',
    tagline: '',
    genres: [],
    published: false,
    bio: null,
    bio_layout: 'two-column',
    hero_style: 'fullbleed',
    hero_image_url: null,
    hero_video_url: null,
    profile_image_url: null,
    accent_color: '#6366f1',
    bg_color: '#0f0f23',
    template: null,
    animate_sections: true,
    onboarding_completed: true,
  }).eq('id', user.id)
}
```

**Step 2: Verify existing tests can now resolve imports**

Run: `npx playwright test --config e2e/playwright.config.ts --list 2>&1 | head -20`
Expected: No more "does not provide an export named" errors

**Step 3: Commit**

```bash
git add e2e/helpers/supabase-admin.ts
git commit -m "test: add all missing supabase admin helpers for E2E tests"
```

---

### Task 5: Update Playwright config with flow project

**Files:**
- Modify: `e2e/playwright.config.ts`

**Step 1: Add the flow project**

Add a new project entry for flow tests. The flow-01 test creates the auth state; flow-02+ consume it. We need the first test to run without storageState, then subsequent tests use it.

The simplest approach: the flow project has NO storageState in its config (each test handles auth via the saved state file directly in `test.use()`), and flow-01 creates the state file.

Actually, a better approach: use `dependencies` so flow-01 (auth) runs first without storageState, then the remaining flow tests depend on it and use storageState.

```ts
// Add these two projects to the projects array:
{
  name: 'flow-setup',
  testMatch: 'flow-01-auth.spec.ts',
  // No storageState — this test logs in and creates the state file
},
{
  name: 'flow',
  testMatch: /flow-(?!01).*\.spec\.ts/,
  dependencies: ['flow-setup'],
  use: {
    storageState: path.resolve(__dirname, '.auth/flow-user.json'),
  },
},
```

**Step 2: Commit**

```bash
git add e2e/playwright.config.ts
git commit -m "test: add flow project to Playwright config"
```

---

### Task 6: Write flow-01-auth.spec.ts

**Files:**
- Create: `e2e/tests/flow-01-auth.spec.ts`

**Step 1: Write the test**

This test logs in as the flow user, saves auth state, then tests login edge cases.

```ts
import { test, expect } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'
import { fillAndSubmitLoginForm } from '../helpers/flow-helpers'
import { FLOW_USER } from '../helpers/flow-test-data'
import { resetAllFlowTestData } from '../helpers/supabase-admin'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

test.describe('Flow 01: Authentication', () => {
  test.beforeAll(async () => {
    // Reset all flow test data to a clean slate
    await resetAllFlowTestData(FLOW_USER.email)
  })

  test('login with valid credentials and save auth state', async ({ page, context }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    await fillAndSubmitLoginForm(page, FLOW_USER.email, FLOW_USER.password)

    // Wait for redirect to dashboard
    await page.waitForURL('**/dashboard**', { timeout: 15_000 })
    await expect(page).toHaveURL(/\/dashboard/)

    // Save auth state for subsequent flow tests
    const authDir = path.resolve(__dirname, '../.auth')
    await context.storageState({ path: path.join(authDir, 'flow-user.json') })
  })

  test('login with invalid password shows error', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    await fillAndSubmitLoginForm(page, FLOW_USER.email, 'wrongpassword123')

    await expect(page.locator('text=/invalid|error|incorrect/i')).toBeVisible({ timeout: 10_000 })
    await expect(page).toHaveURL(/\/login/)
  })

  test('login with empty fields shows validation', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    // Click submit without filling fields
    await page.locator('button[type="submit"]').click()

    // Should stay on login page (HTML5 validation or form error)
    await expect(page).toHaveURL(/\/login/)
  })

  test('login with nonexistent email shows error', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    await fillAndSubmitLoginForm(page, 'nonexistent@example.com', 'Test1234!')

    await expect(page.locator('text=/invalid|error|incorrect/i')).toBeVisible({ timeout: 10_000 })
    await expect(page).toHaveURL(/\/login/)
  })
})
```

**Step 2: Run the test to verify it passes**

Run: `npx playwright test --config e2e/playwright.config.ts --project flow-setup`
Expected: All 4 tests pass. `.auth/flow-user.json` is created.

**Step 3: Commit**

```bash
git add e2e/tests/flow-01-auth.spec.ts
git commit -m "test: add flow-01 auth tests with state persistence"
```

---

### Task 7: Write flow-02-onboarding.spec.ts

**Files:**
- Create: `e2e/tests/flow-02-onboarding.spec.ts`

This test skips the actual onboarding wizard since the user already exists and has completed onboarding. Instead, it verifies the redirect behavior and that the dashboard is accessible.

**Step 1: Write the test**

```ts
import { test, expect } from '@playwright/test'
import { waitForHydration } from '../helpers/flow-helpers'
import { FLOW_USER } from '../helpers/flow-test-data'
import { getTestProfileFull } from '../helpers/supabase-admin'

test.describe('Flow 02: Onboarding & Dashboard Access', () => {
  test('already-onboarded user redirects from onboarding to dashboard', async ({ page }) => {
    await page.goto('/onboarding')
    await page.waitForURL('**/dashboard**', { timeout: 15_000 })
    await expect(page).toHaveURL(/\/dashboard/)
  })

  test('dashboard loads successfully', async ({ page }) => {
    await page.goto('/dashboard')
    await waitForHydration(page, 'h1')

    // Should see dashboard content
    await expect(page.locator('h1').first()).toBeVisible()
  })

  test('user profile exists in database', async () => {
    const profile = await getTestProfileFull(FLOW_USER.email)
    expect(profile).toBeTruthy()
    expect(profile?.onboarding_completed).toBe(true)
  })
})
```

**Step 2: Run and verify**

Run: `npx playwright test --config e2e/playwright.config.ts --project flow --grep "Flow 02"`

**Step 3: Commit**

```bash
git add e2e/tests/flow-02-onboarding.spec.ts
git commit -m "test: add flow-02 onboarding verification"
```

---

### Task 8: Write flow-03-epk-profile.spec.ts

**Files:**
- Create: `e2e/tests/flow-03-epk-profile.spec.ts`

**Step 1: Write the test**

```ts
import { test, expect } from '@playwright/test'
import { fillRHFInput, waitForHydration, clickSaveAndWait, navigateTo } from '../helpers/flow-helpers'
import { FLOW_USER, PROFILE_DATA, SOCIAL_LINKS } from '../helpers/flow-test-data'
import { getTestProfileData, getTestProfileFull, getTestSocialLinks } from '../helpers/supabase-admin'

test.describe('Flow 03: Profile & Social Links', () => {
  test('load profile page and edit display name + tagline', async ({ page }) => {
    await navigateTo(page, '/dashboard', 'input[name="display_name"]')

    await fillRHFInput(page, 'input[name="display_name"]', PROFILE_DATA.displayName)
    await fillRHFInput(page, 'input[name="tagline"]', PROFILE_DATA.tagline)

    await clickSaveAndWait(page)

    const db = await getTestProfileData(FLOW_USER.email)
    expect(db?.display_name).toBe(PROFILE_DATA.displayName)
    expect(db?.tagline).toBe(PROFILE_DATA.tagline)
  })

  test('edit slug', async ({ page }) => {
    await navigateTo(page, '/dashboard', 'input[name="slug"]')

    await fillRHFInput(page, 'input[name="slug"]', PROFILE_DATA.slug)
    await clickSaveAndWait(page)

    const db = await getTestProfileFull(FLOW_USER.email)
    expect(db?.slug).toBe(PROFILE_DATA.slug)
  })

  test('reserved slug shows error', async ({ page }) => {
    await navigateTo(page, '/dashboard', 'input[name="slug"]')

    await fillRHFInput(page, 'input[name="slug"]', 'dashboard')

    const saveButton = page.locator('button[type="submit"]')
    await saveButton.click({ force: true })

    await expect(page.locator('text=/error|taken|reserved|unavailable/i')).toBeVisible({ timeout: 10_000 })
  })

  test('select genres and set BPM range', async ({ page }) => {
    await navigateTo(page, '/dashboard', 'input[name="display_name"]')

    // Click genre chips
    for (const genre of PROFILE_DATA.genres) {
      const chip = page.locator('button', { hasText: new RegExp(`^${genre}$`) }).first()
      await chip.scrollIntoViewIfNeeded()
      await chip.click()
    }

    // Set BPM range
    await fillRHFInput(page, 'input[name="bpm_min"]', PROFILE_DATA.bpmMin)
    await fillRHFInput(page, 'input[name="bpm_max"]', PROFILE_DATA.bpmMax)

    await clickSaveAndWait(page)

    const db = await getTestProfileFull(FLOW_USER.email)
    for (const genre of PROFILE_DATA.genres) {
      expect(db?.genres).toContain(genre)
    }
    expect(db?.bpm_min).toBe(Number(PROFILE_DATA.bpmMin))
    expect(db?.bpm_max).toBe(Number(PROFILE_DATA.bpmMax))
  })

  test('add social links', async ({ page }) => {
    await navigateTo(page, '/dashboard', 'input[name="display_name"]')

    // Scroll to social links section
    const socialSection = page.locator('text=Social Links').first()
    await socialSection.scrollIntoViewIfNeeded()

    // Fill SoundCloud
    const scInput = page.locator('input[name="soundcloud"]').or(page.locator('input[placeholder*="soundcloud" i]')).first()
    if (await scInput.isVisible()) {
      await fillRHFInput(page, 'input[name="soundcloud"]', SOCIAL_LINKS.soundcloud)
    }

    // Fill Instagram
    const igInput = page.locator('input[name="instagram"]').or(page.locator('input[placeholder*="instagram" i]')).first()
    if (await igInput.isVisible()) {
      await fillRHFInput(page, 'input[name="instagram"]', SOCIAL_LINKS.instagram)
    }

    // Fill Spotify
    const spInput = page.locator('input[name="spotify"]').or(page.locator('input[placeholder*="spotify" i]')).first()
    if (await spInput.isVisible()) {
      await fillRHFInput(page, 'input[name="spotify"]', SOCIAL_LINKS.spotify)
    }

    await clickSaveAndWait(page)
  })

  test('save button disabled when form is clean', async ({ page }) => {
    await navigateTo(page, '/dashboard', 'input[name="display_name"]')
    await expect(page.locator('button[type="submit"]', { hasText: 'Save' })).toBeDisabled()
  })

  test('profile data persists after reload', async ({ page }) => {
    await navigateTo(page, '/dashboard', 'input[name="display_name"]')

    await expect(page.locator('input[name="display_name"]')).toHaveValue(PROFILE_DATA.displayName)
    await expect(page.locator('input[name="tagline"]')).toHaveValue(PROFILE_DATA.tagline)
    await expect(page.locator('input[name="slug"]')).toHaveValue(PROFILE_DATA.slug)
  })
})
```

**Step 2: Run and verify**

Run: `npx playwright test --config e2e/playwright.config.ts --project flow --grep "Flow 03"`

**Step 3: Commit**

```bash
git add e2e/tests/flow-03-epk-profile.spec.ts
git commit -m "test: add flow-03 profile and social links tests"
```

---

### Task 9: Write flow-04 through flow-14 (EPK section tests)

**Files:**
- Create: `e2e/tests/flow-04-epk-bio.spec.ts`
- Create: `e2e/tests/flow-05-epk-hero.spec.ts`
- Create: `e2e/tests/flow-06-epk-music.spec.ts`
- Create: `e2e/tests/flow-07-epk-events.spec.ts`
- Create: `e2e/tests/flow-08-epk-photos.spec.ts`
- Create: `e2e/tests/flow-09-epk-contact.spec.ts`
- Create: `e2e/tests/flow-10-epk-theme.spec.ts`
- Create: `e2e/tests/flow-11-epk-technical.spec.ts`
- Create: `e2e/tests/flow-12-epk-integrations.spec.ts`
- Create: `e2e/tests/flow-13-epk-files.spec.ts`
- Create: `e2e/tests/flow-14-epk-settings.spec.ts`

Each test file follows the same pattern established in the existing tests. All use shared helpers from `flow-helpers.ts` and constants from `flow-test-data.ts`. Each file should:

1. Navigate to the relevant dashboard page
2. Fill in all fields with the test data
3. Save and verify the "Saved" indicator
4. Verify data in the database via admin helpers
5. Test edge cases (validation errors, conditional UI)

**Key patterns per file:**

**flow-04-epk-bio.spec.ts:**
- Navigate to `/dashboard/bio`
- Click "Single Column" layout button
- Type into Editor.js contenteditable
- Save and verify bio_layout in DB
- Verify side image section hidden in single-column mode

**flow-05-epk-hero.spec.ts:**
- Navigate to `/dashboard/hero`
- Click "Contained" style button
- Fill tagline via fillRHFInput
- Upload hero image via `uploadFixture(page, 'input[type="file"]', 'test-hero.jpg')`
- Save and verify hero_style, tagline in DB
- Test minimal style hides media section

**flow-06-epk-music.spec.ts:**
- Navigate to `/dashboard/music`
- For each mix in MIXES: click "+ Add Mix", fill modal fields, submit
- After all 3: verify category grouping (DJ Sets (2), Originals (1))
- Test validation: submit empty modal → error
- Test cancel: fill modal, cancel → no change
- Verify all mixes in DB

**flow-07-epk-events.spec.ts:**
- Same pattern as music, using EVENTS data
- Click "+ Add Event", fill name/category/link_url, submit
- Verify category grouping

**flow-08-epk-photos.spec.ts:**
- Navigate to `/dashboard/photos`
- For each photo: click "Add Photo", upload fixture file, fill caption, submit
- Verify photo count shows "2 of 20 photos"
- Verify photos in DB

**flow-09-epk-contact.spec.ts:**
- Navigate to `/dashboard/contact`
- Fill all 4 fields from CONTACT_DATA
- Save and verify all fields in DB
- Test partial update: edit one field → others persist

**flow-10-epk-theme.spec.ts:**
- Navigate to `/dashboard/theme`
- Open Colours accordion, set accent_color and bg_color
- Select template from dropdown
- Open Animation accordion, verify toggle
- Save and verify all values in DB

**flow-11-epk-technical.spec.ts:**
- Navigate to `/dashboard/technical`
- Select deck_model, deck_quantity, mixer_model, monitor_type, monitor_quantity
- Fill additional_notes
- Save and verify all values in DB
- Test conditional: monitor_quantity only shows for "Booth Monitors" or "Both"

**flow-12-epk-integrations.spec.ts:**
- Navigate to `/dashboard/integrations`
- Expand Google Analytics card
- Enable + fill measurement ID
- Save and verify DB
- Reload and verify "Active" badge persists

**flow-13-epk-files.spec.ts:**
- Navigate to `/dashboard/files`
- Upload test PDF via fixture
- Verify file appears in list
- Verify storage usage updates

**flow-14-epk-settings.spec.ts:**
- Navigate to `/dashboard/settings`
- Verify profile section shows current display name
- Test password validation (mismatch, too short)
- Verify account section shows plan tier

**Step 1 (per file): Write the test file following the patterns above**

Each file imports from `flow-helpers` and `flow-test-data`. No duplicated helper functions.

**Step 2 (per file): Run and verify**

Run: `npx playwright test --config e2e/playwright.config.ts --project flow --grep "Flow 0X"`

**Step 3: Commit each file individually**

```bash
git add e2e/tests/flow-04-epk-bio.spec.ts
git commit -m "test: add flow-04 bio editor tests"
# ... repeat for each file
```

---

### Task 10: Write flow-15-epk-edit.spec.ts

**Files:**
- Create: `e2e/tests/flow-15-epk-edit.spec.ts`

**Step 1: Write the test**

This test modifies data that was saved by flow-03 through flow-14. Each `test()` navigates to a section, makes a specific edit using EDITS constants, saves, and verifies the DB.

```ts
import { test, expect } from '@playwright/test'
import { fillRHFInput, clickSaveAndWait, navigateTo, fillModalField, submitModalAndWait } from '../helpers/flow-helpers'
import { FLOW_USER, EDITS } from '../helpers/flow-test-data'
import { getTestProfileFull, getTestProfileHeroData, getTestThemeData, getTestMixes, getTestEvents, getTestBookingContact } from '../helpers/supabase-admin'

test.describe('Flow 15: Edit All Sections', () => {
  test('edit profile display name and tagline', async ({ page }) => {
    await navigateTo(page, '/dashboard', 'input[name="display_name"]')
    await fillRHFInput(page, 'input[name="display_name"]', EDITS.displayName)
    await fillRHFInput(page, 'input[name="tagline"]', EDITS.tagline)
    await clickSaveAndWait(page)

    const db = await getTestProfileFull(FLOW_USER.email)
    expect(db?.display_name).toBe(EDITS.displayName)
    expect(db?.tagline).toBe(EDITS.tagline)
  })

  test('edit hero style and tagline', async ({ page }) => {
    await navigateTo(page, '/dashboard/hero', 'h1')
    await page.locator('button', { hasText: 'Fullbleed' }).click()
    await fillRHFInput(page, 'input[name="tagline"]', EDITS.heroTagline)
    await clickSaveAndWait(page)

    const db = await getTestProfileHeroData(FLOW_USER.email)
    expect(db?.hero_style).toBe(EDITS.heroStyle)
    expect(db?.tagline).toBe(EDITS.heroTagline)
  })

  test('edit bio layout to two-column', async ({ page }) => {
    await navigateTo(page, '/dashboard/bio', 'h1')
    await page.locator('button', { hasText: 'Two Column' }).click()
    await clickSaveAndWait(page)

    const db = await getTestProfileHeroData(FLOW_USER.email)
    expect(db?.bio_layout).toBe(EDITS.bioLayout)
  })

  test('add a fourth mix', async ({ page }) => {
    await navigateTo(page, '/dashboard/music', 'h1')

    await page.locator('button', { hasText: '+ Add Mix' }).click()
    await page.locator('text=Add Mix').waitFor({ timeout: 5_000 })

    await fillModalField(page, 'input[name="title"]', EDITS.newMix.title)
    await fillModalField(page, 'input[name="url"]', EDITS.newMix.url)
    await fillModalField(page, 'input[name="category"]', EDITS.newMix.category)

    await submitModalAndWait(page, 'Add Mix')
    await expect(page.locator(`text=${EDITS.newMix.title}`)).toBeVisible({ timeout: 5_000 })

    const mixes = await getTestMixes(FLOW_USER.email)
    expect(mixes.length).toBe(4)
  })

  test('edit first mix title', async ({ page }) => {
    await navigateTo(page, '/dashboard/music', 'h1')

    // Click the first Edit button
    await page.locator('button', { hasText: 'Edit' }).first().click()
    await page.locator('text=Edit Mix').waitFor({ timeout: 5_000 })

    await fillModalField(page, 'input[name="title"]', EDITS.editedMixTitle)
    await submitModalAndWait(page, 'Edit Mix')

    await expect(page.locator(`text=${EDITS.editedMixTitle}`)).toBeVisible({ timeout: 5_000 })
  })

  test('edit event name', async ({ page }) => {
    await navigateTo(page, '/dashboard/events', 'h1')

    await page.locator('button', { hasText: 'Edit' }).first().click()
    await page.locator('text=Edit Event').waitFor({ timeout: 5_000 })

    await fillModalField(page, 'input[name="name"]', EDITS.editedEventName)
    await submitModalAndWait(page, 'Edit Event')

    await expect(page.locator(`text=${EDITS.editedEventName}`)).toBeVisible({ timeout: 5_000 })
  })

  test('edit contact phone', async ({ page }) => {
    await navigateTo(page, '/dashboard/contact', 'input[name="manager_name"]')
    await fillRHFInput(page, 'input[name="phone"]', EDITS.contactPhone)
    await clickSaveAndWait(page)

    const db = await getTestBookingContact(FLOW_USER.email)
    expect(db?.phone).toBe(EDITS.contactPhone)
  })

  test('edit theme colors', async ({ page }) => {
    await navigateTo(page, '/dashboard/theme', 'h1')

    const coloursButton = page.locator('button', { hasText: /^Colours$/ })
    await coloursButton.click()

    await fillRHFInput(page, 'input[name="accent_color"]', EDITS.accentColor)
    await fillRHFInput(page, 'input[name="bg_color"]', EDITS.bgColor)
    await clickSaveAndWait(page)

    const db = await getTestThemeData(FLOW_USER.email)
    expect(db?.accent_color).toBe(EDITS.accentColor)
    expect(db?.bg_color).toBe(EDITS.bgColor)
  })
})
```

**Step 2: Run and verify**

Run: `npx playwright test --config e2e/playwright.config.ts --project flow --grep "Flow 15"`

**Step 3: Commit**

```bash
git add e2e/tests/flow-15-epk-edit.spec.ts
git commit -m "test: add flow-15 edit all sections tests"
```

---

### Task 11: Write flow-16-publish-verify.spec.ts

**Files:**
- Create: `e2e/tests/flow-16-publish-verify.spec.ts`

**Step 1: Write the test**

This is the capstone test that publishes the EPK and verifies every section on the public page.

```ts
import { test, expect } from '@playwright/test'
import { fillRHFInput, clickSaveAndWait, navigateTo, waitForHydration } from '../helpers/flow-helpers'
import { FLOW_USER, EDITS, MIXES, EVENTS, CONTACT_DATA, BIO_DATA } from '../helpers/flow-test-data'
import { getTestProfileSlug, publishTestProfile, resetTestProfile } from '../helpers/supabase-admin'

let slug: string

test.describe('Flow 16: Publish & Verify Public Page', () => {
  test.beforeAll(async () => {
    // Publish the profile
    await publishTestProfile(FLOW_USER.email)
    slug = await getTestProfileSlug(FLOW_USER.email)
  })

  test('public page loads with correct hero', async ({ page }) => {
    await page.goto(`/${slug}`)
    await page.waitForLoadState('networkidle')

    // Display name (edited in flow-15)
    await expect(page.locator('h1')).toContainText(EDITS.displayName)

    // Tagline (edited in flow-15)
    await expect(page.locator(`text=${EDITS.heroTagline}`)).toBeVisible()
  })

  test('public page shows genre tags', async ({ page }) => {
    await page.goto(`/${slug}`)
    await page.waitForLoadState('networkidle')

    await expect(page.locator('text=House').first()).toBeVisible()
    await expect(page.locator('text=Techno').first()).toBeVisible()
  })

  test('public page renders bio section', async ({ page }) => {
    await page.goto(`/${slug}`)
    await page.waitForLoadState('networkidle')

    // Bio text should be visible (written in flow-04)
    const bioSection = page.locator('#bio').or(page.locator('text=FlowTest bio paragraph'))
    await expect(bioSection.first()).toBeVisible({ timeout: 10_000 })
  })

  test('public page shows music section with all mixes', async ({ page }) => {
    await page.goto(`/${slug}`)
    await page.waitForLoadState('networkidle')

    // All 4 mix titles should be visible (3 original + 1 added in edit)
    await expect(page.locator(`text=${EDITS.editedMixTitle}`)).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('text=Warehouse Sessions')).toBeVisible()
    await expect(page.locator('text=Original - Midnight')).toBeVisible()
    await expect(page.locator(`text=${EDITS.newMix.title}`)).toBeVisible()
  })

  test('public page shows events section', async ({ page }) => {
    await page.goto(`/${slug}`)
    await page.waitForLoadState('networkidle')

    // Edited event name + other events
    await expect(page.locator(`text=${EDITS.editedEventName}`)).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('text=Berghain Guest')).toBeVisible()
    await expect(page.locator('text=Sonar Festival')).toBeVisible()
  })

  test('public page shows contact info', async ({ page }) => {
    await page.goto(`/${slug}`)
    await page.waitForLoadState('networkidle')

    // Contact section should show manager name and email
    await expect(page.locator(`text=${CONTACT_DATA.managerName}`)).toBeVisible({ timeout: 10_000 })
    await expect(page.locator(`text=${CONTACT_DATA.email}`)).toBeVisible()
  })

  test('public page applies theme colors', async ({ page }) => {
    await page.goto(`/${slug}`)
    await page.waitForLoadState('networkidle')

    // Background color should be applied (edited in flow-15)
    const rootDiv = page.locator('div.min-h-screen').first()
    await expect(rootDiv).toBeVisible()
    const bgColor = await rootDiv.evaluate((el) => el.style.backgroundColor)
    expect(bgColor).toBeTruthy()
  })

  test('public page shows branded footer for free tier', async ({ page }) => {
    await page.goto(`/${slug}`)
    await page.waitForLoadState('networkidle')

    await expect(page.locator('footer')).toBeVisible()
    await expect(page.locator('text=Built with')).toBeVisible()
  })

  test('nonexistent slug shows 404', async ({ page }) => {
    await page.goto('/this-slug-definitely-does-not-exist-abc123')
    await page.waitForLoadState('networkidle')

    await expect(page.locator('text=/page not found|doesn\'t exist/i')).toBeVisible({ timeout: 10_000 })
  })

  test('unpublished profile returns 404', async ({ page }) => {
    // Temporarily unpublish
    await resetTestProfile(FLOW_USER.email)

    await page.goto(`/${slug}`)
    await page.waitForLoadState('networkidle')

    await expect(page.locator('text=/page not found|doesn\'t exist/i')).toBeVisible({ timeout: 10_000 })

    // Re-publish for any subsequent runs
    await publishTestProfile(FLOW_USER.email)
  })
})
```

**Step 2: Run and verify**

Run: `npx playwright test --config e2e/playwright.config.ts --project flow --grep "Flow 16"`

**Step 3: Commit**

```bash
git add e2e/tests/flow-16-publish-verify.spec.ts
git commit -m "test: add flow-16 publish and public page verification"
```

---

### Task 12: Run the full flow test suite end-to-end

**Step 1: Run all flow tests sequentially**

```bash
npx playwright test --config e2e/playwright.config.ts --project flow-setup --project flow
```

Expected: All flow tests pass. Each test builds on the previous one's state.

**Step 2: Fix any failures**

If tests fail, debug by:
- Reading the HTML report: `npx playwright show-report`
- Checking screenshots: `e2e/test-results/`
- Adjusting selectors or timeouts as needed

**Step 3: Final commit**

```bash
git add -A
git commit -m "test: complete comprehensive E2E flow test suite"
```

---

## Execution Notes

- **Dev server must be running** (`npm run dev`) for tests to work, or the webServer config starts it automatically.
- **The flow user must exist** in the database (`chrisjbarlow1+test@gmail.com`). If it doesn't, create it manually or add creation logic to flow-01.
- **Each flow test builds on state** from the previous test. Run them in order.
- **Task 9 is the largest** — it creates 11 test files. These can be implemented one at a time, testing each individually before moving on.
- **supabase-admin helpers** (Task 4) must be completed before any test can verify DB state.
- **Fixtures** (Task 1) must exist before photo/file upload tests.
