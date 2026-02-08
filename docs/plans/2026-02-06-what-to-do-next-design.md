# What to Do Next — Design

## Overview

A dedicated dashboard page that guides users through getting value from their EPK after building it. Presents a phased journey of actionable steps, mixing auto-detected completion with manual checkoffs for external actions.

## Structure

Three phases, presented as stacked cards:

- **Phase 1: Complete your EPK** — Content quality basics
- **Phase 2: Go live & share** — Publishing and promotion
- **Phase 3: Level up** — Professional outreach and advanced features

Phases are always visible. The earliest incomplete phase is expanded and prominent. Later phases are collapsed with reduced opacity but expandable. Completed phases collapse with a green checkmark.

## Items

### Phase 1: Complete your EPK

| Item | Type | Detection |
|------|------|-----------|
| Add a display name | Auto | `display_name` is not null/empty |
| Upload a profile photo | Auto | `profile_image_url` is not null |
| Write your bio | Auto | `bio` or `short_bio` is not null/empty |
| Upload a hero image | Auto | `hero_image_url` is not null |
| Add at least one mix | Auto | Mixes table has rows for this user |
| Add your contact info | Auto | Contact fields (email/phone) populated |
| Add your social links | Auto | Socials table has rows for this user |

### Phase 2: Go live & share

| Item | Type | Detection |
|------|------|-----------|
| Publish your EPK | Auto | `published` is true |
| Set up your social preview | Auto | `og_title` or `og_image_url` is not null |
| Share your EPK on social media | Manual | — |
| Add your EPK link to your bio/Linktree | Manual | — |
| Send your EPK to a promoter or venue | Manual | — |

### Phase 3: Level up

| Item | Type | Detection |
|------|------|-----------|
| Set up a custom domain | Auto | `custom_domain` is not null |
| Add your EPK to your email signature | Manual | — |
| Include your EPK in a demo submission | Manual | — |
| Choose a theme that fits your brand | Auto | `template` is not default OR `accent_color` has been changed |

## Item Types

- **Auto-detected**: Checkbox reflects reality (non-interactive). Links to the relevant dashboard page when incomplete.
- **Manual checkoff**: Clickable checkbox. Saves immediately via optimistic update to `checklist_progress` JSONB column.

## UI

### Page Layout

Each phase is a card with:
- Phase number + title (e.g., "Phase 1 — Complete your EPK")
- Progress bar + count (e.g., "4/7 complete")
- Expandable item list with checkboxes

### Item States

- Complete (auto): filled checkbox, muted/strikethrough text
- Complete (manual): filled checkbox, muted/strikethrough text
- Incomplete (auto): empty checkbox, label links to relevant dashboard page
- Incomplete (manual): clickable empty checkbox

### Phase Visual Treatment

- Focus phase (earliest incomplete): full opacity, expanded
- Later phases: collapsed, reduced opacity, expandable
- Completed phases: collapsed, green checkmark on header

### Sidebar

"What to do next" appears as the second sidebar item (after Profile). Shows a dot badge when Phase 1 has incomplete items. Badge disappears once Phase 1 is complete.

## Data

### Database

Single new JSONB column on `profiles`:

```sql
ALTER TABLE profiles
ADD COLUMN checklist_progress jsonb DEFAULT '{}'::jsonb;
```

Shape: `{ "shared_social": true, "added_to_bio": true, ... }`

Only manual items stored. Auto-detected items computed at query time.

### Server Functions

**Loader**: Fetches profile row + counts from `mixes`, `socials`, and `contacts` tables. Computes each item's completion status. Returns:

```ts
{ items: { display_name: true, bio: false, published: true, shared_social: true, ... } }
```

**Mutation**: Toggles a manual checklist item by updating `checklist_progress` JSONB.

### Route

New file: `src/routes/_dashboard/dashboard.next.tsx`

Uses `DashboardHeader` for page title (no save button — manual items save on click).

### Sidebar Update

Add entry to `DashboardSidebar.tsx` as second nav item with conditional badge dot.
