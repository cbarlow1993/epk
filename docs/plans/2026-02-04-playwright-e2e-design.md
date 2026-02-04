# Playwright E2E Testing — Design

## Overview

Add Playwright E2E tests to the DJ EPK platform. Tests run against the dev Supabase instance using admin API for test data lifecycle. Initial scope: auth flows + dashboard profile page.

## Structure

```
e2e/
├── playwright.config.ts
├── global-setup.ts
├── global-teardown.ts
├── helpers/
│   ├── supabase-admin.ts
│   ├── auth.ts
│   └── test-data.ts
├── fixtures/
│   └── authenticated.ts
├── tests/
│   ├── auth.spec.ts
│   └── dashboard-profile.spec.ts
└── .auth/                    # gitignored — session storage
```

## Test Data Lifecycle

- **Global setup**: Delete leftover test user (idempotent), create fresh test user via `supabase.auth.admin.createUser()` with `email_confirm: true`. Postgres trigger auto-creates profile + related rows. Log in via browser, save storageState to `e2e/.auth/user.json`.
- **Global teardown**: Delete all child rows (social_links, mixes, events, press_assets) then profile, then auth user via admin API.
- **Per-test reset**: Dashboard tests reset profile fields to defaults via admin API in `beforeEach`.
- Test user email: `test_playwright@example.com` (prefix convention: `test_`)

## Auth Tests (`auth.spec.ts`)

1. Signup with valid credentials → redirects to `/dashboard`
2. Login with valid credentials → redirects to `/dashboard`
3. Login with invalid credentials → shows error message
4. Logout → redirects to `/login`

Signup test creates a temporary second user (`test_playwright_signup@example.com`), deleted in `afterAll`.

## Dashboard Profile Tests (`dashboard-profile.spec.ts`)

Uses storageState fixture (pre-authenticated).

1. Profile page loads with existing data
2. Edit display name and tagline → save → "Saved" indicator
3. Slug validation — enter reserved/duplicate slug → error message
4. Toggle publish → save → persists after reload
5. Edit genres → save → persists after reload

## Config

- Single browser: Chromium
- `webServer`: `npm run dev` on port 3000, reuse if running
- `retries: 0` (local), traces on first retry
- baseURL: `http://localhost:3000`

## Dependencies

- `@playwright/test` (devDependency)

## Scripts

- `test:e2e`: `npx playwright test`
- `test:e2e:ui`: `npx playwright test --ui`

## Gitignore

- `e2e/.auth/`
- `test-results/`
- `playwright-report/`
