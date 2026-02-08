# Premium Theme Editor — Design Document

## Overview

Comprehensive visual customization system for Pro users. Templates serve as starting points; Pro users can override every visual property via a live sidebar editor with real-time preview.

## Data Model

### New `profiles` columns

**Typography (4 tiers: display, heading, subheading, body):**
- `theme_display_font TEXT` — artist name/hero
- `theme_display_size TEXT` — e.g. `4rem`, `5rem`, `6rem`
- `theme_display_weight TEXT` — e.g. `700`, `800`, `900`
- `theme_heading_font TEXT` — section headings
- `theme_heading_size TEXT`
- `theme_heading_weight TEXT`
- `theme_subheading_font TEXT` — card titles, item names
- `theme_subheading_size TEXT`
- `theme_subheading_weight TEXT`
- `theme_body_font TEXT` — paragraph text
- `theme_body_size TEXT`
- `theme_body_weight TEXT`

**Colors (expanding beyond accent + bg):**
- `theme_text_color TEXT` — primary text
- `theme_heading_color TEXT` — heading text (defaults to text_color)
- `theme_link_color TEXT` — link color (defaults to accent)
- `theme_card_bg TEXT` — card/section background
- `theme_border_color TEXT`

**Spacing & Layout:**
- `theme_section_padding TEXT` — `compact` | `default` | `spacious`
- `theme_content_width TEXT` — `narrow` | `default` | `wide`
- `theme_card_radius TEXT` — `none` | `sm` | `md` | `lg` | `full`
- `theme_element_gap TEXT` — `tight` | `default` | `relaxed`

**Buttons & Links:**
- `theme_button_style TEXT` — `rounded` | `square` | `pill`
- `theme_link_style TEXT` — `underline` | `none` | `hover-underline`

**Borders & Effects:**
- `theme_card_border TEXT` — `none` | `subtle` | `solid`
- `theme_shadow TEXT` — `none` | `sm` | `md` | `lg`
- `theme_divider_style TEXT` — `none` | `line` | `accent` | `gradient`

**Custom Fonts:**
- `theme_custom_fonts JSONB` — array of `{name, url, weight}`

### Resolution Order

For every property:
1. URL search param (live preview from editor)
2. Profile `theme_*` column value
3. Template default
4. Hardcoded fallback

### Backward Compatibility

Existing `font_family`, `accent_color`, `bg_color` columns remain. New `theme_*` columns take precedence when non-null. Existing profiles work unchanged — null theme columns fall through to template defaults.

## Template System

Each template expanded to include full defaults for all properties:

```ts
{
  name: 'Swiss',
  typography: {
    display:    { font: 'Instrument Sans', size: '5rem',   weight: '900' },
    heading:    { font: 'Instrument Sans', size: '2rem',   weight: '700' },
    subheading: { font: 'Instrument Sans', size: '1.125rem', weight: '600' },
    body:       { font: 'Instrument Sans', size: '1rem',   weight: '400' },
  },
  colors: {
    accent: '#FF0000', bg: '#FFFFFF', text: '#000000',
    heading: null, link: null, cardBg: '#FFFFFF', border: '#00000010',
  },
  spacing: {
    sectionPadding: 'default', contentWidth: 'default',
    cardRadius: 'sm', elementGap: 'default',
  },
  buttons: { style: 'rounded', linkStyle: 'hover-underline' },
  effects: { cardBorder: 'subtle', shadow: 'sm', divider: 'line' },
  layout: { heroStyle: 'fullbleed', bioLayout: 'two-column' },
  sectionOrder: ['bio','music','events','technical','press','contact'],
}
```

## Custom Font Upload

- Files upload to Supabase Storage: `fonts/{user_id}/{filename}`
- Accepted formats: `.woff2`, `.woff`, `.ttf`, `.otf` (validated by extension + magic bytes)
- Max 4 files per profile, max 500KB each
- Stored in `theme_custom_fonts` JSONB column
- Loaded on public page via `@font-face` injection in `<style>` tag
- Server-side tier gating on upload endpoint (Pro only, storage costs)

## Editor UI — Live Sidebar

Split-pane layout at `/dashboard/theme`:
- **Left panel (400px, scrollable):** Accordion sections with controls
- **Right panel:** Live iframe preview of public EPK page
- Preview updates in real-time via URL search params

### Accordion Sections

1. **Template** — Grid of template cards. Clicking resets all values with confirmation.
2. **Typography** — 4 sub-sections (Display, Heading, Subheading, Body), each with font picker, size slider, weight selector.
3. **Colors** — Color pickers for accent, background, text, heading, link, card bg, border.
4. **Layout** — Hero style, bio layout, section padding, content width, card radius, element gap.
5. **Buttons & Links** — Button shape picker, link style picker.
6. **Effects** — Card border, shadow intensity, divider style.
7. **Custom Fonts** — Upload area, list of uploaded fonts with delete.
8. **Advanced** — Custom CSS textarea, collapsed by default.

### Font Picker Component

Searchable dropdown showing font names rendered in their own typeface. Groups: "Your Fonts" (uploaded) and "Google Fonts". Selection triggers dynamic font load for preview.

### Save Behavior

Same pattern as other dashboard pages — Save button in `<DashboardHeader>`, enabled when `isDirty`. Single `updateProfile` call.

## Public Page Rendering

All properties become CSS custom properties on the page wrapper:

```css
--theme-display-font, --theme-display-size, --theme-display-weight
--theme-heading-font, --theme-heading-size, --theme-heading-weight
--theme-subheading-font, --theme-subheading-size, --theme-subheading-weight
--theme-body-font, --theme-body-size, --theme-body-weight
--theme-text-color, --theme-heading-color, --theme-link-color
--theme-card-bg, --theme-border-color, --theme-card-radius
--theme-shadow, --theme-section-padding, --theme-content-width, --theme-element-gap
```

Enum values resolve via lookup maps:
```ts
const SECTION_PADDING = { compact: '2rem', default: '4rem', spacious: '6rem' }
const CARD_RADIUS = { none: '0', sm: '0.375rem', md: '0.75rem', lg: '1rem', full: '9999px' }
```

Font loading: collect all unique Google Fonts across tiers, load in one request. Custom fonts via `@font-face`.

## Pro Gating

**Free users:** Template picker + accent/bg color fully functional. All other sections visible but locked with upgrade CTA overlay.

**Pro users:** Everything unlocked.

**Implementation:** `isPro = profile.tier === 'pro'`. Each accordion section wraps controls with a gating component. Custom font upload is also server-side gated.

## Implementation Phases

1. **Foundation** — Migration, expanded templates, schema/types, CSS variable rendering
2. **Live Sidebar Editor** — Split-pane layout, iframe preview, accordion structure, URL param extension
3. **Typography Controls** — Expanded Google Fonts picker, size/weight selectors, multi-font loading
4. **Colors, Layout, Buttons, Effects** — All remaining control components
5. **Custom Font Upload** — Upload endpoint, JSONB management, @font-face injection, management UI

Each phase independently deployable.
