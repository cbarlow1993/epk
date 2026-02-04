# Playwright E2E Testing Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add Playwright E2E tests covering auth flows and dashboard profile editing, with full test data cleanup via Supabase admin API.

**Architecture:** Playwright runs against the dev server (`npm run dev`). Global setup creates a test user via Supabase admin API and saves an authenticated browser session (storageState). Global teardown deletes all test data. Dashboard tests reuse the saved session; auth tests manage their own sessions.

**Tech Stack:** Playwright, @supabase/supabase-js (admin client), dotenv

---

### Task 1: Install Playwright and Configure Project

**Files:**
- Modify: `package.json` (add devDependency + scripts)
- Modify: `.gitignore` (add Playwright artifacts)
- Create: `e2e/playwright.config.ts`

**Step 1: Install Playwright**

Run:
```bash
npm install -D @playwright/test dotenv
npx playwright install chromium
```

**Step 2: Add npm scripts to `package.json`**

Add to `"scripts"`:
```json
"test:e2e": "npx playwright test",
"test:e2e:ui": "npx playwright test --ui"
```

**Step 3: Add Playwright artifacts to `.gitignore`**

Append to `.gitignore`:
```
# Playwright
e2e/.auth/
test-results/
playwright-report/
```

**Step 4: Create `e2e/playwright.config.ts`**

```ts
import { defineConfig } from '@playwright/test'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../.env') })

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: 'html',
  globalSetup: './global-setup.ts',
  globalTeardown: './global-teardown.ts',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'auth',
      testMatch: 'auth.spec.ts',
    },
    {
      name: 'dashboard',
      testMatch: 'dashboard-*.spec.ts',
      use: {
        storageState: path.resolve(__dirname, '.auth/user.json'),
      },
    },
  ],
  webServer: {
    command: 'npm run dev',
    port: 3000,
    reuseExistingServer: true,
    timeout: 30_000,
  },
})
```

**Step 5: Verify config loads**

Run: `npx playwright test --list`
Expected: No tests found (no spec files yet), but config loads without errors.

**Step 6: Commit**

```bash
git add package.json package-lock.json .gitignore e2e/playwright.config.ts
git commit -m "chore: install Playwright and add E2E config"
```

---

### Task 2: Create Test Helpers (supabase admin, test data constants)

**Files:**
- Create: `e2e/helpers/test-data.ts`
- Create: `e2e/helpers/supabase-admin.ts`

**Step 1: Create `e2e/helpers/test-data.ts`**

```ts
export const TEST_USER = {
  email: 'test_playwright@example.com',
  password: 'Test1234!',
  displayName: 'Test Playwright DJ',
}

export const TEST_SIGNUP_USER = {
  email: 'test_playwright_signup@example.com',
  password: 'Test1234!',
  displayName: 'Test Signup DJ',
}

export const PROFILE_DEFAULTS = {
  display_name: 'Test Playwright DJ',
  tagline: '',
  genres: [] as string[],
  published: false,
}
```

**Step 2: Create `e2e/helpers/supabase-admin.ts`**

This uses the service role key to bypass RLS for test data management.

```ts
import { createClient } from '@supabase/supabase-js'

function getAdminClient() {
  const url = process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env')
  }
  return createClient(url, key)
}

export async function createTestUser(email: string, password: string, displayName: string) {
  const admin = getAdminClient()
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: displayName },
  })
  if (error) throw new Error(`Failed to create test user: ${error.message}`)
  return data.user
}

export async function deleteTestUser(email: string) {
  const admin = getAdminClient()

  // Find user by email
  const { data: { users } } = await admin.auth.admin.listUsers()
  const user = users.find((u) => u.email === email)
  if (!user) return // Already cleaned up

  // Delete child rows (cascade from profile handles most, but be explicit)
  const tables = ['social_links', 'mixes', 'events', 'press_assets', 'technical_rider', 'booking_contact']
  for (const table of tables) {
    await admin.from(table).delete().eq('profile_id', user.id)
  }

  // Delete profile
  await admin.from('profiles').delete().eq('id', user.id)

  // Delete auth user (this also cascades profiles due to FK, but we already cleaned up)
  await admin.auth.admin.deleteUser(user.id)
}

export async function resetTestProfile(email: string) {
  const admin = getAdminClient()
  const { data: { users } } = await admin.auth.admin.listUsers()
  const user = users.find((u) => u.email === email)
  if (!user) throw new Error(`Test user ${email} not found`)

  await admin.from('profiles').update({
    display_name: 'Test Playwright DJ',
    tagline: '',
    genres: [],
    published: false,
  }).eq('id', user.id)
}
```

**Step 3: Commit**

```bash
git add e2e/helpers/
git commit -m "chore: add E2E test helpers (supabase admin, test data)"
```

---

### Task 3: Create Global Setup and Teardown

**Files:**
- Create: `e2e/global-setup.ts`
- Create: `e2e/global-teardown.ts`
- Create: `e2e/.auth/.gitkeep` (ensure dir exists)

**Step 1: Create `e2e/global-setup.ts`**

Global setup:
1. Cleans up any leftover test user (idempotent)
2. Creates a fresh test user via admin API
3. Logs in via a real browser to capture storageState
4. Saves session to `e2e/.auth/user.json`

```ts
import { chromium, type FullConfig } from '@playwright/test'
import dotenv from 'dotenv'
import path from 'path'
import { createTestUser, deleteTestUser } from './helpers/supabase-admin'
import { TEST_USER } from './helpers/test-data'

dotenv.config({ path: path.resolve(__dirname, '../.env') })

export default async function globalSetup(_config: FullConfig) {
  // Clean up any leftover test user from previous failed runs
  await deleteTestUser(TEST_USER.email)

  // Create fresh test user
  await createTestUser(TEST_USER.email, TEST_USER.password, TEST_USER.displayName)

  // Log in via browser to capture auth cookies
  const browser = await chromium.launch()
  const context = await browser.newContext()
  const page = await context.newPage()

  await page.goto('http://localhost:3000/login')
  await page.locator('#email').fill(TEST_USER.email)
  await page.locator('#password').fill(TEST_USER.password)
  await page.locator('button[type="submit"]').click()

  // Wait for redirect to dashboard
  await page.waitForURL('**/dashboard', { timeout: 15_000 })

  // Save auth state
  const authDir = path.resolve(__dirname, '.auth')
  await context.storageState({ path: path.join(authDir, 'user.json') })

  await browser.close()
}
```

**Step 2: Create `e2e/global-teardown.ts`**

```ts
import dotenv from 'dotenv'
import path from 'path'
import { deleteTestUser } from './helpers/supabase-admin'
import { TEST_USER, TEST_SIGNUP_USER } from './helpers/test-data'

dotenv.config({ path: path.resolve(__dirname, '../.env') })

export default async function globalTeardown() {
  await deleteTestUser(TEST_USER.email)
  // Also clean up signup test user in case test failed before its afterAll
  await deleteTestUser(TEST_SIGNUP_USER.email)
}
```

**Step 3: Create auth directory**

Run:
```bash
mkdir -p e2e/.auth
touch e2e/.auth/.gitkeep
```

**Step 4: Verify global setup runs**

Run: `npx playwright test --list`
Expected: Global setup creates user, logs in, saves storageState, then tears down. No test files to list yet.

**Step 5: Commit**

```bash
git add e2e/global-setup.ts e2e/global-teardown.ts e2e/.auth/.gitkeep
git commit -m "chore: add E2E global setup/teardown with Supabase admin"
```

---

### Task 4: Write Auth Tests

**Files:**
- Create: `e2e/tests/auth.spec.ts`

**Step 1: Write the auth test file**

```ts
import { test, expect } from '@playwright/test'
import { deleteTestUser } from '../helpers/supabase-admin'
import { TEST_USER, TEST_SIGNUP_USER } from '../helpers/test-data'

test.describe('Authentication', () => {
  test('login with valid credentials redirects to dashboard', async ({ page }) => {
    await page.goto('/login')

    await page.locator('#email').fill(TEST_USER.email)
    await page.locator('#password').fill(TEST_USER.password)
    await page.locator('button[type="submit"]').click()

    await page.waitForURL('**/dashboard', { timeout: 15_000 })
    await expect(page).toHaveURL(/\/dashboard/)
  })

  test('login with invalid credentials shows error', async ({ page }) => {
    await page.goto('/login')

    await page.locator('#email').fill(TEST_USER.email)
    await page.locator('#password').fill('wrongpassword123')
    await page.locator('button[type="submit"]').click()

    // Error message appears (Supabase returns "Invalid login credentials")
    await expect(page.locator('text=Invalid login credentials')).toBeVisible({ timeout: 10_000 })

    // Should still be on login page
    await expect(page).toHaveURL(/\/login/)
  })

  test('signup with valid credentials redirects to dashboard', async ({ page }) => {
    // Clean up signup user before test (idempotent)
    await deleteTestUser(TEST_SIGNUP_USER.email)

    await page.goto('/signup')

    await page.locator('#displayName').fill(TEST_SIGNUP_USER.displayName)
    await page.locator('#email').fill(TEST_SIGNUP_USER.email)
    await page.locator('#password').fill(TEST_SIGNUP_USER.password)
    await page.locator('button[type="submit"]').click()

    await page.waitForURL('**/dashboard', { timeout: 15_000 })
    await expect(page).toHaveURL(/\/dashboard/)
  })

  // Clean up signup user after all auth tests
  test.afterAll(async () => {
    await deleteTestUser(TEST_SIGNUP_USER.email)
  })

  test('logout redirects to login', async ({ page }) => {
    // First log in
    await page.goto('/login')
    await page.locator('#email').fill(TEST_USER.email)
    await page.locator('#password').fill(TEST_USER.password)
    await page.locator('button[type="submit"]').click()
    await page.waitForURL('**/dashboard', { timeout: 15_000 })

    // Click logout in sidebar
    await page.locator('button', { hasText: 'Log out' }).click()

    // Should redirect to login
    await page.waitForURL('**/login', { timeout: 15_000 })
    await expect(page).toHaveURL(/\/login/)
  })
})
```

**Step 2: Run auth tests only**

Run: `npx playwright test --project=auth`
Expected: All 4 tests pass.

**Step 3: Commit**

```bash
git add e2e/tests/auth.spec.ts
git commit -m "test: add E2E auth tests (login, signup, logout, invalid creds)"
```

---

### Task 5: Write Dashboard Profile Tests

**Files:**
- Create: `e2e/tests/dashboard-profile.spec.ts`

These tests use `storageState` from global setup — no login needed per test.

**Step 1: Write the dashboard profile test file**

```ts
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

    // Type genres (comma-separated)
    const genresInput = page.locator('input').filter({ hasText: /^$/ }).locator('xpath=//label[contains(text(),"Genres")]/following-sibling::input | //label[contains(text(),"Genres")]/..//input')

    // Use a more reliable selector — the genres input has a specific placeholder
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
```

**Step 2: Run dashboard tests only**

Run: `npx playwright test --project=dashboard`
Expected: All 5 tests pass.

**Step 3: Run all tests**

Run: `npx playwright test`
Expected: All 9 tests pass (4 auth + 5 dashboard profile).

**Step 4: Commit**

```bash
git add e2e/tests/dashboard-profile.spec.ts
git commit -m "test: add E2E dashboard profile tests (edit, save, slug, publish, genres)"
```

---

### Task 6: Final Verification and Cleanup

**Step 1: Run full suite end-to-end**

Run: `npx playwright test`
Expected: All 9 tests pass, global setup creates user, global teardown deletes user.

**Step 2: Verify no test data remains**

Check the Supabase dashboard or run a quick query to confirm `test_playwright@example.com` and `test_playwright_signup@example.com` do not exist after the run.

**Step 3: Run with UI to verify report works**

Run: `npx playwright test --ui`
Expected: Playwright Test UI opens, all tests visible and can be run interactively.

**Step 4: Final commit**

```bash
git add -A
git commit -m "test: complete Playwright E2E test framework with auth and profile tests"
```
