# Comprehensive E2E Test Suite Design

## Goal

Write detailed Playwright E2E tests covering the full user journey: authentication, onboarding, building an EPK (all sections), editing data, and verifying the published public page renders everything correctly.

## Architecture

**Approach:** Sequential flow tests. Each test file builds on the state left by the previous one, mirroring a real user journey from signup to published EPK.

**New Playwright project:** `flow` — runs alongside existing `auth` and `dashboard` projects. Uses its own auth state file (`.auth/flow-user.json`), `fullyParallel: false`, `workers: 1`.

**Test user:** Uses existing test credentials (`chrisjbarlow1+test@gmail.com` / `Test1234!`). Global setup logs in and saves auth cookies. Global teardown resets profile data to a clean state (rather than deleting the user).

## File Structure

```
e2e/
  tests/
    flow-01-auth.spec.ts
    flow-02-onboarding.spec.ts
    flow-03-epk-profile.spec.ts     # Profile fields + social links
    flow-04-epk-bio.spec.ts
    flow-05-epk-hero.spec.ts
    flow-06-epk-music.spec.ts
    flow-07-epk-events.spec.ts
    flow-08-epk-photos.spec.ts
    flow-09-epk-contact.spec.ts
    flow-10-epk-theme.spec.ts
    flow-11-epk-technical.spec.ts
    flow-12-epk-integrations.spec.ts
    flow-13-epk-files.spec.ts
    flow-14-epk-settings.spec.ts
    flow-15-epk-edit.spec.ts
    flow-16-publish-verify.spec.ts
  fixtures/
    test-hero.jpg
    test-photo-1.jpg
    test-photo-2.jpg
    test-event.jpg
    test-profile.jpg
    test-side-image.jpg
    test-file.pdf
  helpers/
    flow-helpers.ts
    flow-test-data.ts
```

## Test Data

### Primary Data (filled in flow-03 through flow-14)

- **Profile:** displayName "DJ FlowTest", tagline "Underground house & techno", slug "dj-flowtest", genres [House, Techno, Drum & Bass], BPM 120–140
- **Social links:** SoundCloud, Instagram, Spotify (URLs + handles)
- **Bio:** Single-column layout, paragraph text
- **Hero:** Contained style, tagline "Feel the bass drop", image upload
- **Music:** 3 mixes across 2 categories (DJ Sets, Originals)
- **Events:** 3 events across 2 categories (Residencies, Guest Spots, Festivals)
- **Photos:** 2 photos with captions
- **Contact:** Manager name, email, phone, address
- **Theme:** Accent #ff6600, background #1a1a2e, Underground template, animations on
- **Technical:** CDJ-3000 x2, DJM-V10, Booth Monitors x2, notes
- **Integrations:** Google Analytics with measurement ID
- **Files:** One PDF upload

### Edit Data (applied in flow-15)

- displayName → "DJ FlowTest Updated"
- tagline → "Deep house & melodic techno"
- heroTagline → "Drop the beat", heroStyle → "fullbleed"
- bioLayout → "two-column"
- Add one more mix, edit one mix title
- Edit one event name
- contactPhone → "+44 7700 900001"
- accentColor → "#00ff88", bgColor → "#0d0d1a"

## Test Coverage Detail

### flow-01-auth.spec.ts
- Login with valid credentials → redirect to dashboard
- Login with invalid password → error message shown
- Login with empty fields → validation error
- Login with nonexistent email → error message

### flow-02-onboarding.spec.ts
- Load onboarding page
- Fill display name → verify slug auto-generates
- Select genres from predefined list
- Attempt empty name → validation error
- Complete wizard → redirect to dashboard
- Verify onboarding_completed = true in DB

### flow-03-epk-profile.spec.ts
- Load profile page, verify existing data from onboarding
- Edit display name and tagline
- Edit slug, verify slug availability check
- Attempt reserved slug ("dashboard") → error
- Attempt slug with special chars → error
- Select genres (including custom "Other" genre)
- Set BPM range
- Add social links (SoundCloud, Instagram, Spotify)
- Edit a social link URL
- Delete a social link then re-add
- Save and verify DB
- Verify save button disabled when form is clean

### flow-04-epk-bio.spec.ts
- Load bio page
- Select single-column layout
- Type bio text in Editor.js
- Save and verify layout + bio in DB
- Verify side image section hidden in single-column

### flow-05-epk-hero.spec.ts
- Load hero page
- Select "contained" hero style
- Fill tagline
- Toggle media type to image
- Upload hero image via fixture file
- Save and verify hero_style, tagline in DB
- Toggle to "minimal" → verify media section hides
- Switch back to "contained"

### flow-06-epk-music.spec.ts
- Load music page, verify empty state
- Add first mix via modal (title, URL, category)
- Verify modal closes, mix appears in list
- Add second mix in same category → verify grouping
- Add third mix in different category → verify new category group
- Edit a mix title via modal
- Attempt to save mix with empty title → validation error
- Cancel modal → verify no changes
- Verify all mixes in DB
- Verify correct sort order

### flow-07-epk-events.spec.ts
- Load events page, verify empty state
- Add 3 events via modal across 2 categories
- Verify category grouping
- Edit an event name
- Attempt empty event name → validation error
- Cancel without saving → no changes
- Verify all events in DB

### flow-08-epk-photos.spec.ts
- Load photos page, verify empty state ("0 of 20 photos")
- Upload first photo via fixture → fill caption
- Upload second photo → fill caption
- Verify photo count updates ("2 of 20 photos")
- Verify photos visible in grid
- Verify photos in DB

### flow-09-epk-contact.spec.ts
- Load contact page, verify empty fields
- Fill all contact fields (name, email, phone, address)
- Save and verify DB
- Edit single field, verify others persist
- Clear a field, save → verify it's empty in DB

### flow-10-epk-theme.spec.ts
- Load theme page
- Set accent color
- Set background color
- Select template from dropdown
- Toggle animations on
- Save and verify all theme values in DB
- Verify live preview iframe updates

### flow-11-epk-technical.spec.ts
- Load technical rider page
- Select deck model and quantity
- Select mixer model
- Select monitor type and quantity
- Fill additional notes
- Save and verify in DB
- Verify monitor quantity only shows for "Booth Monitors"

### flow-12-epk-integrations.spec.ts
- Load integrations page
- Verify all cards show "Inactive"
- Expand Google Analytics card
- Enable and fill measurement ID
- Save → verify active badge shows
- Verify DB reflects enabled state
- Reload page → verify persists as "Active"

### flow-13-epk-files.spec.ts
- Load files page, verify empty state
- Upload test PDF via fixture
- Verify file appears in file list
- Verify storage bar updates
- Verify file in DB

### flow-14-epk-settings.spec.ts
- Load settings page
- Verify profile section shows current display name
- Verify account section shows plan tier and EPK URL
- Security: attempt mismatched passwords → error
- Security: attempt short password → error

### flow-15-epk-edit.spec.ts
- Navigate to profile → change display name and tagline → save
- Navigate to hero → change style to fullbleed, update tagline → save
- Navigate to bio → switch to two-column layout → save
- Navigate to music → add one more mix → save
- Navigate to music → edit existing mix title → save
- Navigate to events → edit event name → save
- Navigate to contact → change phone → save
- Navigate to theme → change accent and bg colors → save
- Verify all edits in DB after each save

### flow-16-publish-verify.spec.ts
- Navigate to profile → toggle published on → save
- Navigate to public page `/$slug`
- **Hero:** Verify display name, tagline, fullbleed style
- **Bio:** Verify bio text renders, two-column layout
- **Music:** Verify all 4 mix titles visible, category grouping
- **Events:** Verify all 3 event names, updated name
- **Photos:** Verify 2 photos rendered
- **Contact:** Verify manager name, email displayed
- **Theme:** Verify background color and accent color via computed CSS
- **Social links:** Verify social icons rendered with correct URLs
- **Footer:** Verify "Built with myEPK" (free tier)
- **404:** Navigate to nonexistent slug → verify 404 page
- **Unpublished:** Unpublish → navigate to slug → 404 → re-publish

## Shared Helpers (flow-helpers.ts)

- `fillRHFInput(page, selector, value)` — Clear and type into react-hook-form input with hydration retry
- `waitForHydration(page)` — Wait for networkidle + delay for SSR hydration
- `clickSaveAndWait(page)` — Click save button, wait for server response, verify "Saved"
- `savedIndicator(page)` — Locator for the green "Saved" text
- `openModal(page, buttonText)` — Click button to open modal, wait for dialog
- `fillModalField(page, label, value)` — Fill a field inside a modal by label
- `submitModal(page)` — Click modal save button, wait for response, verify modal closes
- `uploadFixture(page, selector, fixtureName)` — Set input files from fixtures dir
- `navigateToDashboard(page, section)` — Navigate to `/dashboard/{section}` with hydration wait

## Fixture Files

Small images (100x100 to 200x100 px, JPEG, ~1-2KB each) and one small PDF (~1KB). Generated programmatically during setup or committed to repo as tiny valid files.

## Config Changes

Add to `e2e/playwright.config.ts`:
```ts
{
  name: 'flow',
  testMatch: 'flow-*.spec.ts',
  use: {
    storageState: '.auth/flow-user.json',
  },
}
```

The flow-01-auth test handles creating the auth state file. Subsequent tests consume it.
