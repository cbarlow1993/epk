# Layout Customization Feature — Design Document

**Date:** 2026-02-06
**Status:** Approved

## Overview

Add independent layout controls to the Theme page, allowing users to customize hero style, section order, section visibility, and bio layout separately from template presets. Templates become "starting point" presets that populate all values, which users can then customize freely.

## Data Model

### New Profile Columns

| Column | Type | Default | Purpose |
|--------|------|---------|---------|
| `section_order` | `text[]` | `['bio','music','events','technical','press','contact']` | Array of section IDs in display order |
| `section_visibility` | `jsonb` | `{}` | Map of section ID → boolean (e.g., `{"technical": false}`) |
| `hero_style` | `text` | `'fullbleed'` | One of: `fullbleed`, `contained`, `minimal` |
| `bio_layout` | `text` | `'two-column'` | One of: `two-column`, `single-column` |

### Template Behavior

The `template` column becomes informational only — it tracks which preset was last selected but doesn't drive rendering. The public page reads the individual layout columns directly.

When a user clicks a template card, it sets ALL values at once:
- `accent_color`, `bg_color`, `font_family` (existing)
- `hero_style`, `bio_layout`, `section_order` (new)
- `section_visibility` resets to `{}` (all visible)

### Migration

- New columns are nullable with app-level defaults
- Existing profiles continue working (fallback to defaults matches current template behavior)
- No data migration required — profiles without values use sensible defaults

## UI Design

### Theme Page Structure

```
┌─────────────────────────────────────────────────────────┐
│ Theme                                        [Save]     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ Template (existing preset cards)                        │
│ ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐               │
│ │ Swiss │ │Minimal│ │Editor.│ │ Dark  │               │
│ └───────┘ └───────┘ └───────┘ └───────┘               │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ ┌─ Colors & Fonts ──────┐  ┌─ Live Preview ──────────┐ │
│ │ Accent Colour [____]  │  │                         │ │
│ │ Background    [____]  │  │      (iframe)           │ │
│ │ Font          [____]  │  │                         │ │
│ └───────────────────────┘  └─────────────────────────┘ │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ Layout                                                  │
│ ┌─ Hero Style ─────────┐  ┌─ Bio Layout ───────────┐  │
│ │ ○ Fullbleed          │  │ ○ Two-column           │  │
│ │ ○ Contained          │  │ ○ Single-column        │  │
│ │ ○ Minimal            │  │                        │  │
│ └──────────────────────┘  └────────────────────────┘  │
│                                                         │
│ ┌─ Section Order ──────────────────────────────────┐   │
│ │ ⋮⋮ Bio           [visible ✓]                     │   │
│ │ ⋮⋮ Music         [visible ✓]                     │   │
│ │ ⋮⋮ Events        [visible ✓]                     │   │
│ │ ⋮⋮ Technical     [hidden  ○]                     │   │
│ │ ⋮⋮ Press         [visible ✓]                     │   │
│ │ ⋮⋮ Contact       [visible ✓]                     │   │
│ └──────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Section Order Interaction

- Drag handle (grip icon) on the left
- Section name in the middle
- Visibility toggle (checkbox) on the right
- Uses `@dnd-kit/sortable` for drag-and-drop

### Hero/Bio Selectors

- Radio button groups
- Optional: small visual icons showing the layout style

## Public Page Rendering

### Layout Settings

Read directly from profile with fallbacks:

```ts
const heroStyle = profile.hero_style || 'fullbleed'
const bioLayout = profile.bio_layout || 'two-column'
const sectionOrder = profile.section_order || ['bio','music','events','technical','press','contact']
const sectionVisibility = profile.section_visibility || {}
```

### Section Visibility

Filter hidden sections before rendering:

```ts
const visibleSections = sectionOrder.filter(
  (id) => sectionVisibility[id] !== false
)
```

### Bio Layout

**Two-column:**
- Left: profile image (if exists)
- Right: short bio + full bio content

**Single-column:**
- Centered content, image above text

### Preview URL

Add layout params for live preview:
```
?preview=true&accent=...&bg=...&font=...&hero=fullbleed&bioLayout=two-column&sections=bio,music,events
```

## Implementation Tasks

1. **Database migration** — Add new columns to profiles table
2. **Schema update** — Add new fields to `profileUpdateSchema`
3. **Theme page UI** — Add Layout section with hero/bio radio buttons and drag-drop section list
4. **Template preset update** — Clicking template sets all layout values
5. **Public page update** — Read layout from profile, implement bio two-column layout
6. **Preview support** — Pass layout params to iframe preview

## Out of Scope

- Custom section creation (user-defined sections)
- Per-section styling (colors, spacing)
- Mobile-specific layout overrides
