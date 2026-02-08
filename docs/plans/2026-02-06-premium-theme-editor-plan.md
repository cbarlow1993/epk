# Premium Theme Editor — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a comprehensive visual customization system that lets Pro users control typography (4 tiers), colors (7 properties), spacing, buttons, and effects via a live sidebar editor with real-time preview.

**Architecture:** Extend the existing profiles table with ~30 new `theme_*` columns. Expand template definitions to provide full defaults. Rebuild `dashboard.theme.tsx` as a split-pane editor with accordion sections and iframe preview. Apply all theme values as CSS custom properties on the public page with a resolution chain (URL param → DB value → template default → fallback).

**Tech Stack:** TanStack Start, Supabase (Postgres + Storage), react-hook-form + Zod, Tailwind CSS v4, Google Fonts API

---

## Phase 1: Foundation

### Task 1: Database Migration — Add theme columns

**Files:**
- Create: `supabase/migrations/YYYYMMDDHHMMSS_add_theme_columns.sql`

**Step 1: Create migration file**

```bash
npx supabase migration new add_theme_columns
```

**Step 2: Write migration SQL**

```sql
-- Typography: 4 tiers (display, heading, subheading, body) x 3 props (font, size, weight)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS theme_display_font TEXT,
  ADD COLUMN IF NOT EXISTS theme_display_size TEXT,
  ADD COLUMN IF NOT EXISTS theme_display_weight TEXT,
  ADD COLUMN IF NOT EXISTS theme_heading_font TEXT,
  ADD COLUMN IF NOT EXISTS theme_heading_size TEXT,
  ADD COLUMN IF NOT EXISTS theme_heading_weight TEXT,
  ADD COLUMN IF NOT EXISTS theme_subheading_font TEXT,
  ADD COLUMN IF NOT EXISTS theme_subheading_size TEXT,
  ADD COLUMN IF NOT EXISTS theme_subheading_weight TEXT,
  ADD COLUMN IF NOT EXISTS theme_body_font TEXT,
  ADD COLUMN IF NOT EXISTS theme_body_size TEXT,
  ADD COLUMN IF NOT EXISTS theme_body_weight TEXT;

-- Colors (expanding beyond accent_color + bg_color)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS theme_text_color TEXT,
  ADD COLUMN IF NOT EXISTS theme_heading_color TEXT,
  ADD COLUMN IF NOT EXISTS theme_link_color TEXT,
  ADD COLUMN IF NOT EXISTS theme_card_bg TEXT,
  ADD COLUMN IF NOT EXISTS theme_border_color TEXT;

-- Spacing & Layout
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS theme_section_padding TEXT DEFAULT NULL
    CHECK (theme_section_padding IS NULL OR theme_section_padding IN ('compact', 'default', 'spacious')),
  ADD COLUMN IF NOT EXISTS theme_content_width TEXT DEFAULT NULL
    CHECK (theme_content_width IS NULL OR theme_content_width IN ('narrow', 'default', 'wide')),
  ADD COLUMN IF NOT EXISTS theme_card_radius TEXT DEFAULT NULL
    CHECK (theme_card_radius IS NULL OR theme_card_radius IN ('none', 'sm', 'md', 'lg', 'full')),
  ADD COLUMN IF NOT EXISTS theme_element_gap TEXT DEFAULT NULL
    CHECK (theme_element_gap IS NULL OR theme_element_gap IN ('tight', 'default', 'relaxed'));

-- Buttons & Links
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS theme_button_style TEXT DEFAULT NULL
    CHECK (theme_button_style IS NULL OR theme_button_style IN ('rounded', 'square', 'pill')),
  ADD COLUMN IF NOT EXISTS theme_link_style TEXT DEFAULT NULL
    CHECK (theme_link_style IS NULL OR theme_link_style IN ('underline', 'none', 'hover-underline'));

-- Borders & Effects
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS theme_card_border TEXT DEFAULT NULL
    CHECK (theme_card_border IS NULL OR theme_card_border IN ('none', 'subtle', 'solid')),
  ADD COLUMN IF NOT EXISTS theme_shadow TEXT DEFAULT NULL
    CHECK (theme_shadow IS NULL OR theme_shadow IN ('none', 'sm', 'md', 'lg')),
  ADD COLUMN IF NOT EXISTS theme_divider_style TEXT DEFAULT NULL
    CHECK (theme_divider_style IS NULL OR theme_divider_style IN ('none', 'line', 'accent', 'gradient'));

-- Custom fonts (uploaded by user)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS theme_custom_fonts JSONB DEFAULT '[]'::jsonb;
```

**Step 3: Push migration**

```bash
npx supabase db push
```

**Step 4: Commit**

```bash
git add supabase/migrations/*_add_theme_columns.sql
git commit -m "feat: add theme customization columns to profiles table"
```

---

### Task 2: Update TypeScript types — ProfileRow

**Files:**
- Modify: `src/types/database.ts:5-45` (ProfileRow interface)

**Step 1: Add new fields to ProfileRow**

Add these fields after line 37 (`bio_layout`) inside the `ProfileRow` interface:

```typescript
// Theme — Typography
theme_display_font: string | null
theme_display_size: string | null
theme_display_weight: string | null
theme_heading_font: string | null
theme_heading_size: string | null
theme_heading_weight: string | null
theme_subheading_font: string | null
theme_subheading_size: string | null
theme_subheading_weight: string | null
theme_body_font: string | null
theme_body_size: string | null
theme_body_weight: string | null
// Theme — Colors
theme_text_color: string | null
theme_heading_color: string | null
theme_link_color: string | null
theme_card_bg: string | null
theme_border_color: string | null
// Theme — Spacing & Layout
theme_section_padding: 'compact' | 'default' | 'spacious' | null
theme_content_width: 'narrow' | 'default' | 'wide' | null
theme_card_radius: 'none' | 'sm' | 'md' | 'lg' | 'full' | null
theme_element_gap: 'tight' | 'default' | 'relaxed' | null
// Theme — Buttons & Links
theme_button_style: 'rounded' | 'square' | 'pill' | null
theme_link_style: 'underline' | 'none' | 'hover-underline' | null
// Theme — Effects
theme_card_border: 'none' | 'subtle' | 'solid' | null
theme_shadow: 'none' | 'sm' | 'md' | 'lg' | null
theme_divider_style: 'none' | 'line' | 'accent' | 'gradient' | null
// Theme — Custom Fonts
theme_custom_fonts: Array<{ name: string; url: string; weight: string }> | null
```

**Step 2: Commit**

```bash
git add src/types/database.ts
git commit -m "feat: add theme properties to ProfileRow type"
```

---

### Task 3: Update Zod schema — profileUpdateSchema

**Files:**
- Modify: `src/schemas/profile.ts:5-56`

**Step 1: Add theme fields to the schema**

Add these fields before the closing `})` of `profileUpdateSchema` (before line 56):

```typescript
// Theme — Typography (4 tiers)
theme_display_font: z.string().max(100).optional().nullable(),
theme_display_size: z.string().max(10).optional().nullable(),
theme_display_weight: z.string().max(3).optional().nullable(),
theme_heading_font: z.string().max(100).optional().nullable(),
theme_heading_size: z.string().max(10).optional().nullable(),
theme_heading_weight: z.string().max(3).optional().nullable(),
theme_subheading_font: z.string().max(100).optional().nullable(),
theme_subheading_size: z.string().max(10).optional().nullable(),
theme_subheading_weight: z.string().max(3).optional().nullable(),
theme_body_font: z.string().max(100).optional().nullable(),
theme_body_size: z.string().max(10).optional().nullable(),
theme_body_weight: z.string().max(3).optional().nullable(),
// Theme — Colors
theme_text_color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional().nullable(),
theme_heading_color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional().nullable(),
theme_link_color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional().nullable(),
theme_card_bg: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional().nullable(),
theme_border_color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional().nullable(),
// Theme — Spacing & Layout
theme_section_padding: z.enum(['compact', 'default', 'spacious']).optional().nullable(),
theme_content_width: z.enum(['narrow', 'default', 'wide']).optional().nullable(),
theme_card_radius: z.enum(['none', 'sm', 'md', 'lg', 'full']).optional().nullable(),
theme_element_gap: z.enum(['tight', 'default', 'relaxed']).optional().nullable(),
// Theme — Buttons & Links
theme_button_style: z.enum(['rounded', 'square', 'pill']).optional().nullable(),
theme_link_style: z.enum(['underline', 'none', 'hover-underline']).optional().nullable(),
// Theme — Effects
theme_card_border: z.enum(['none', 'subtle', 'solid']).optional().nullable(),
theme_shadow: z.enum(['none', 'sm', 'md', 'lg']).optional().nullable(),
theme_divider_style: z.enum(['none', 'line', 'accent', 'gradient']).optional().nullable(),
// Theme — Custom Fonts
theme_custom_fonts: z.array(z.object({
  name: z.string().max(100),
  url: z.string().url(),
  weight: z.string().max(3),
})).max(4).optional().nullable(),
```

**Step 2: Commit**

```bash
git add src/schemas/profile.ts
git commit -m "feat: add theme fields to profile Zod schema"
```

---

### Task 4: Update server function — ALLOWED_PROFILE_FIELDS

**Files:**
- Modify: `src/server/profile.ts:7-40` (ALLOWED_PROFILE_FIELDS set)

**Step 1: Add all theme field names to the whitelist**

Add these entries to `ALLOWED_PROFILE_FIELDS` after `'press_kit_url'` (line 38):

```typescript
// Theme — Typography
'theme_display_font',
'theme_display_size',
'theme_display_weight',
'theme_heading_font',
'theme_heading_size',
'theme_heading_weight',
'theme_subheading_font',
'theme_subheading_size',
'theme_subheading_weight',
'theme_body_font',
'theme_body_size',
'theme_body_weight',
// Theme — Colors
'theme_text_color',
'theme_heading_color',
'theme_link_color',
'theme_card_bg',
'theme_border_color',
// Theme — Spacing & Layout
'theme_section_padding',
'theme_content_width',
'theme_card_radius',
'theme_element_gap',
// Theme — Buttons & Links
'theme_button_style',
'theme_link_style',
// Theme — Effects
'theme_card_border',
'theme_shadow',
'theme_divider_style',
// Theme — Custom Fonts
'theme_custom_fonts',
```

**Step 2: Add theme fields to the empty-string-to-null coercion list**

Update the coercion loop at line 76 to include all nullable theme text fields:

```typescript
for (const key of [
  'og_title', 'og_description', 'og_image_url', 'hero_image_url', 'hero_video_url', 'press_kit_url',
  'theme_display_font', 'theme_display_size', 'theme_display_weight',
  'theme_heading_font', 'theme_heading_size', 'theme_heading_weight',
  'theme_subheading_font', 'theme_subheading_size', 'theme_subheading_weight',
  'theme_body_font', 'theme_body_size', 'theme_body_weight',
  'theme_text_color', 'theme_heading_color', 'theme_link_color', 'theme_card_bg', 'theme_border_color',
  'theme_section_padding', 'theme_content_width', 'theme_card_radius', 'theme_element_gap',
  'theme_button_style', 'theme_link_style',
  'theme_card_border', 'theme_shadow', 'theme_divider_style',
]) {
```

**Step 3: Commit**

```bash
git add src/server/profile.ts
git commit -m "feat: whitelist theme fields in updateProfile server function"
```

---

### Task 5: Expand template definitions

**Files:**
- Modify: `src/utils/templates.ts` (complete rewrite)

**Step 1: Define new expanded TemplateConfig interface and templates**

Replace the entire file with the expanded template system. The new `TemplateConfig` interface includes all theme properties. Each template provides full defaults for every property. The `getTemplate()` function and a new `resolveTheme()` helper are exported.

The `resolveTheme(profile, templateConfig, searchOverrides?)` function implements the resolution chain:
1. URL search param (if provided)
2. Profile `theme_*` column (if non-null)
3. Legacy column (e.g. `accent_color`, `bg_color`, `font_family`)
4. Template default
5. Hardcoded fallback

This function returns a flat `ResolvedTheme` object with all CSS-ready values, including enum-to-CSS lookups for properties like `sectionPadding: 'compact'` → `'2rem'`.

**Key template defaults:**

- **Swiss**: All Instrument Sans, white bg, red accent, subtle borders, sm shadow, sm radius
- **Minimal**: All Instrument Sans, white bg, black accent, no borders, no shadow, no radius
- **Editorial**: Playfair Display headings + Instrument Sans body, warm paper bg (#F5F0EB), rust accent, md radius, md shadow
- **Dark**: Space Grotesk headings + DM Sans body, dark bg (#1A1A1A), gold accent, no radius, lg shadow

**Lookup maps for enum → CSS values:**

```typescript
export const SECTION_PADDING_MAP = { compact: '3rem', default: '5rem', spacious: '7rem' }
export const CONTENT_WIDTH_MAP = { narrow: '56rem', default: '72rem', wide: '90rem' }
export const CARD_RADIUS_MAP = { none: '0', sm: '0.375rem', md: '0.75rem', lg: '1rem', full: '9999px' }
export const ELEMENT_GAP_MAP = { tight: '0.75rem', default: '1rem', relaxed: '1.5rem' }
export const BUTTON_RADIUS_MAP = { rounded: '0.375rem', square: '0', pill: '9999px' }
export const SHADOW_MAP = {
  none: 'none',
  sm: '0 1px 2px rgba(0,0,0,0.05)',
  md: '0 4px 6px rgba(0,0,0,0.07)',
  lg: '0 10px 15px rgba(0,0,0,0.1)',
}
export const BORDER_MAP = {
  none: '0px solid transparent',
  subtle: '1px solid',
  solid: '2px solid',
}
```

**Step 2: Commit**

```bash
git add src/utils/templates.ts
git commit -m "feat: expand template definitions with full theme defaults and resolveTheme helper"
```

---

### Task 6: Update public page — Apply all theme CSS variables

**Files:**
- Modify: `src/routes/$slug.tsx`

**Step 1: Update `validateSearch` to accept all new preview params**

Add search param parsing for all theme properties at lines 16-24. Add params for each tier's font/size/weight, all colors, and all enum properties.

**Step 2: Update `head` function for multi-font loading**

Replace the single font loading at line 69 with logic that:
1. Calls `resolveTheme(profile, templateConfig)` to get all 4 tier fonts
2. Collects unique Google Font names (excluding custom fonts)
3. Builds a single Google Fonts URL with all unique fonts and needed weights

```typescript
const theme = resolveTheme(profile, templateConfig)
const googleFonts = new Set<string>()
for (const tier of ['display', 'heading', 'subheading', 'body'] as const) {
  const font = theme[`${tier}Font`]
  // Only add if it's not a custom font
  const isCustom = (profile.theme_custom_fonts || []).some(cf => cf.name === font)
  if (!isCustom) googleFonts.add(font)
}
const fontParam = [...googleFonts].map(f => `family=${f.replace(/ /g, '+')}:wght@400;500;600;700;800;900`).join('&')
```

**Step 3: Inject custom font @font-face in head**

If `profile.theme_custom_fonts` has entries, add a `<style>` tag with `@font-face` declarations.

**Step 4: Replace hardcoded theme extraction with `resolveTheme()`**

Replace lines 195-210 with:
```typescript
const templateConfig = getTemplate(profile.template || 'default')
const theme = resolveTheme(profile, templateConfig, search)
```

**Step 5: Expand inline style block**

Replace the style block at lines 293-298 with all CSS custom properties from the resolved theme:

```typescript
style={{
  '--color-accent': theme.accent,
  '--theme-display-font': `'${theme.displayFont}', sans-serif`,
  '--theme-display-size': theme.displaySize,
  '--theme-display-weight': theme.displayWeight,
  '--theme-heading-font': `'${theme.headingFont}', sans-serif`,
  '--theme-heading-size': theme.headingSize,
  '--theme-heading-weight': theme.headingWeight,
  '--theme-subheading-font': `'${theme.subheadingFont}', sans-serif`,
  '--theme-subheading-size': theme.subheadingSize,
  '--theme-subheading-weight': theme.subheadingWeight,
  '--theme-body-font': `'${theme.bodyFont}', sans-serif`,
  '--theme-body-size': theme.bodySize,
  '--theme-body-weight': theme.bodyWeight,
  '--theme-text-color': theme.textColor,
  '--theme-heading-color': theme.headingColor,
  '--theme-link-color': theme.linkColor,
  '--theme-card-bg': theme.cardBg,
  '--theme-border-color': theme.borderColor,
  '--theme-section-padding': theme.sectionPaddingCss,
  '--theme-content-width': theme.contentWidthCss,
  '--theme-card-radius': theme.cardRadiusCss,
  '--theme-element-gap': theme.elementGapCss,
  '--theme-button-radius': theme.buttonRadiusCss,
  '--theme-shadow': theme.shadowCss,
  backgroundColor: theme.bg,
  fontFamily: `'${theme.bodyFont}', sans-serif`,
  fontSize: theme.bodySize,
  fontWeight: theme.bodyWeight,
  color: theme.textColor,
} as React.CSSProperties}
```

**Step 6: Update component rendering to use CSS variables**

Replace hardcoded class strings with CSS variable-driven styles throughout the component. For example:
- Hero `h1` uses `var(--theme-display-font)`, `var(--theme-display-size)`, `var(--theme-display-weight)`
- `<SectionHeading>` uses `var(--theme-heading-font)`, `var(--theme-heading-size)`, `var(--theme-heading-weight)`
- Card titles use `var(--theme-subheading-font)`, etc.
- `<EPKSection>` uses `var(--theme-section-padding)` for padding, `var(--theme-content-width)` for max-width

Keep backward-compatible: the `isLightBackground` logic and conditional classes still work as before, but now fall through to `theme.textColor` and `theme.borderColor` when explicitly set.

**Step 7: Commit**

```bash
git add src/routes/\$slug.tsx src/utils/templates.ts
git commit -m "feat: apply full theme CSS variables on public page with resolution chain"
```

---

### Task 7: Update EPKSection and SectionHeading to use CSS variables

**Files:**
- Modify: `src/components/EPKSection.tsx:12-23`
- Modify: `src/components/SectionHeading.tsx`

**Step 1: Update EPKSection to use theme CSS variables**

Replace hardcoded `py-20` with `style={{ paddingBlock: 'var(--theme-section-padding, 5rem)' }}`.
Replace hardcoded `max-w-6xl` with `style={{ maxWidth: 'var(--theme-content-width, 72rem)' }}`.

**Step 2: Update SectionHeading to use heading font variables**

Apply `fontFamily: 'var(--theme-heading-font)'`, `fontSize: 'var(--theme-heading-size)'`, `fontWeight: 'var(--theme-heading-weight)'`, `color: 'var(--theme-heading-color)'` via inline styles, keeping existing classes as fallbacks.

**Step 3: Commit**

```bash
git add src/components/EPKSection.tsx src/components/SectionHeading.tsx
git commit -m "feat: update EPKSection and SectionHeading to use theme CSS variables"
```

---

## Phase 2: Live Sidebar Editor

### Task 8: Create theme editor constants and types

**Files:**
- Create: `src/utils/theme-options.ts`

**Step 1: Create the file with all option arrays and types**

This file exports:
- `GOOGLE_FONTS`: Array of ~80 popular Google Font names, organized by category (sans-serif, serif, display, mono)
- `FONT_SIZES`: Options for each tier (display: 3rem-8rem, heading: 1.25rem-3rem, subheading: 0.875rem-1.5rem, body: 0.875rem-1.25rem)
- `FONT_WEIGHTS`: `['300', '400', '500', '600', '700', '800', '900']`
- TypeScript types for all theme form values: `ThemeFormValues`
- A function `themeFormDefaults(profile, templateConfig)` that computes default form values from a profile + template

**Step 2: Commit**

```bash
git add src/utils/theme-options.ts
git commit -m "feat: add theme editor option constants and types"
```

---

### Task 9: Build accordion component

**Files:**
- Create: `src/components/Accordion.tsx`

**Step 1: Build a simple accordion component**

A controlled accordion component that accepts sections as `{ id, title, icon?, children }[]`. Renders a vertical list of collapsible sections. Only one section open at a time (or optionally multiple). Uses Tailwind transitions for open/close animation.

Props:
```typescript
interface AccordionSection {
  id: string
  title: string
  badge?: React.ReactNode  // e.g. "PRO" badge
  children: React.ReactNode
}
interface AccordionProps {
  sections: AccordionSection[]
  defaultOpen?: string
}
```

Keep it minimal — no external dependencies. Uses `useState` for open section tracking and CSS `max-height` transitions.

**Step 2: Commit**

```bash
git add src/components/Accordion.tsx
git commit -m "feat: add Accordion component for theme editor"
```

---

### Task 10: Build font picker component

**Files:**
- Create: `src/components/forms/FontPicker.tsx`

**Step 1: Build the font picker**

A searchable dropdown component for selecting fonts. Features:
- Text input that filters fonts as you type
- Dropdown shows fonts rendered in their own typeface (using `style={{ fontFamily }}`)
- Groups: "Your Fonts" (from `theme_custom_fonts`) at the top, then "Google Fonts"
- Selecting a font loads it via a `<link>` tag dynamically for preview
- Props: `value`, `onChange`, `customFonts`, `label`

Use a simple `useState` for open/closed + filter text. Position the dropdown absolutely below the input. Load fonts on-demand when the dropdown opens by injecting `<link>` tags into `<head>`.

**Step 2: Commit**

```bash
git add src/components/forms/FontPicker.tsx
git commit -m "feat: add FontPicker component with search and font preview"
```

---

### Task 11: Build pro gate wrapper component

**Files:**
- Create: `src/components/ProGate.tsx`

**Step 1: Build the component**

A wrapper component that renders children normally when `isPro` is true. When false, renders the children with reduced opacity and a positioned overlay that says "Upgrade to Pro" with a link/button to the billing page.

```typescript
interface ProGateProps {
  isPro: boolean
  children: React.ReactNode
  feature?: string  // e.g. "typography controls"
}
```

The overlay is a `position: absolute` div covering the section with `backdrop-blur-sm`, a lock icon, the feature name, and an "Upgrade" button that links to `/dashboard/settings`.

**Step 2: Commit**

```bash
git add src/components/ProGate.tsx
git commit -m "feat: add ProGate wrapper component for premium feature gating"
```

---

### Task 12: Rebuild dashboard.theme.tsx — Split-pane editor

**Files:**
- Modify: `src/routes/_dashboard/dashboard.theme.tsx` (complete rewrite)

**Step 1: Set up the split-pane layout**

Rewrite the component with:
- `useForm` covering ALL theme fields (not just 5)
- Split layout: `grid grid-cols-[400px_1fr]` on large screens, single column on mobile
- Left panel: scrollable `overflow-y-auto h-[calc(100vh-64px)]` with accordion sections
- Right panel: iframe preview (existing pattern but with all theme params in URL)

**Step 2: Wire up template selection**

Template cards section at the top (above the accordion). Clicking a template:
1. Shows a confirmation dialog ("This will reset all theme settings to the template defaults")
2. On confirm, calls `setValue()` for every theme field with the template's default value
3. Uses `shouldDirty: true` on all setValue calls

**Step 3: Build Typography accordion section**

Four sub-sections (Display, Heading, Subheading, Body), each containing:
- `<FontPicker>` for font selection
- Size slider/select with the tier's appropriate range
- Weight selector (dropdown or button group)

Free users see Template + accent/bg color. Typography section wrapped in `<ProGate>`.

**Step 4: Build Colors accordion section**

Seven `<FormColorInput>` components for: accent, background, text, heading, link, card bg, border. Accent and bg are available to free users. The other 5 wrapped in `<ProGate>`.

**Step 5: Build Layout accordion section**

Option pickers for: hero style (3), bio layout (2), section padding (3), content width (3), card radius (5), element gap (3). Each uses a visual button group (showing small preview of the option). All wrapped in `<ProGate>`.

**Step 6: Build Buttons & Links accordion section**

Button style picker (3 visual options showing rounded/square/pill buttons). Link style picker (3 options). Wrapped in `<ProGate>`.

**Step 7: Build Effects accordion section**

Card border (3 options), shadow (4 options), divider style (4 options). Wrapped in `<ProGate>`.

**Step 8: Build Advanced accordion section**

Custom CSS textarea. Collapsed by default. Wrapped in `<ProGate>`.

**Step 9: Wire iframe preview**

Build a preview URL that includes ALL current form values as search params. The iframe reloads when values change (debounced to avoid excessive reloads — use a 300ms debounce on watch values).

Key pattern — use `useEffect` with debounced watch to update iframe src:
```typescript
const watchedValues = watch()
const [previewSrc, setPreviewSrc] = useState('')

useEffect(() => {
  const timer = setTimeout(() => {
    const params = new URLSearchParams()
    params.set('preview', 'true')
    // Add all non-null theme values as params
    for (const [key, value] of Object.entries(watchedValues)) {
      if (value != null && value !== '') params.set(key, String(value))
    }
    setPreviewSrc(`/${initial?.slug}?${params.toString()}`)
  }, 300)
  return () => clearTimeout(timer)
}, [JSON.stringify(watchedValues)])
```

**Step 10: Commit**

```bash
git add src/routes/_dashboard/dashboard.theme.tsx
git commit -m "feat: rebuild theme editor as split-pane layout with accordion sections"
```

---

## Phase 3: Typography Controls

### Task 13: Expanded Google Fonts integration

**Files:**
- Modify: `src/utils/theme-options.ts` (add full font list)
- Modify: `src/components/forms/FontPicker.tsx` (dynamic loading)

**Step 1: Curate the Google Fonts list**

Add ~80 popular fonts to `GOOGLE_FONTS` organized by style:
- **Sans-serif** (~30): Inter, DM Sans, Space Grotesk, Outfit, Poppins, Montserrat, Instrument Sans, Bricolage Grotesque, Plus Jakarta Sans, Sora, Manrope, Urbanist, Figtree, Geist, Nunito, Raleway, Rubik, Work Sans, Lato, Open Sans, Source Sans 3, Barlow, Exo 2, Orbitron, Rajdhani, Saira, Chakra Petch, Jost, Albert Sans, Karla
- **Serif** (~15): Playfair Display, Cormorant Garamond, Lora, Merriweather, Crimson Text, Fraunces, DM Serif Display, Libre Baskerville, Source Serif 4, EB Garamond, Bitter, Vollkorn, Noto Serif, Spectral, Literata
- **Display** (~15): Bebas Neue, Oswald, Anton, Archivo Black, Bowlby One SC, Bungee, Climate Crisis, Dela Gothic One, Graduate, Fugaz One, Righteous, Russo One, Squada One, Teko, Ultra
- **Monospace** (~5): JetBrains Mono, Fira Code, Space Mono, IBM Plex Mono, Source Code Pro

**Step 2: Add dynamic font loading to FontPicker**

When the dropdown opens, load a preview of visible fonts (batch load via Google Fonts CSS URL). When a font is selected, ensure it's fully loaded.

**Step 3: Commit**

```bash
git add src/utils/theme-options.ts src/components/forms/FontPicker.tsx
git commit -m "feat: expanded Google Fonts library with dynamic loading in FontPicker"
```

---

### Task 14: Font size and weight controls

**Files:**
- Modify: `src/routes/_dashboard/dashboard.theme.tsx` (typography section)

**Step 1: Build font size slider component**

A labeled range slider with discrete steps. Shows the current value. Each tier has its own range:
- Display: 3rem to 8rem (step 0.25rem)
- Heading: 1.25rem to 3rem (step 0.125rem)
- Subheading: 0.875rem to 1.5rem (step 0.125rem)
- Body: 0.875rem to 1.25rem (step 0.0625rem)

Display as a slider with a numeric readout.

**Step 2: Build font weight selector**

A horizontal button group with common weights: 300 (Light), 400 (Regular), 500 (Medium), 600 (SemiBold), 700 (Bold), 800 (ExtraBold), 900 (Black). Visual buttons that highlight the selected weight.

**Step 3: Wire into the typography accordion sections**

Each tier (Display, Heading, Subheading, Body) gets: FontPicker + size slider + weight selector, stacked vertically with labels.

**Step 4: Commit**

```bash
git add src/routes/_dashboard/dashboard.theme.tsx
git commit -m "feat: add font size sliders and weight selectors for all typography tiers"
```

---

## Phase 4: Colors, Layout, Buttons, Effects Controls

### Task 15: Color controls section

**Files:**
- Modify: `src/routes/_dashboard/dashboard.theme.tsx` (colors section)

**Step 1: Add all 7 color pickers**

Using the existing `<FormColorInput>` component, add pickers for:
1. Accent Colour (free)
2. Background Colour (free)
3. Text Colour (pro)
4. Heading Colour (pro)
5. Link Colour (pro)
6. Card Background (pro)
7. Border Colour (pro)

Each color picker shows a "Reset" button that clears the value back to null (template default). Group the free colors at the top, pro colors below inside `<ProGate>`.

**Step 2: Commit**

```bash
git add src/routes/_dashboard/dashboard.theme.tsx
git commit -m "feat: add expanded color controls with 7 color pickers"
```

---

### Task 16: Layout controls section

**Files:**
- Modify: `src/routes/_dashboard/dashboard.theme.tsx` (layout section)

**Step 1: Build visual option picker component**

A reusable component that renders a row of selectable visual cards. Each option shows a small icon/illustration of the layout and a label. Clicking selects it.

```typescript
interface OptionPickerProps {
  label: string
  value: string | null
  options: Array<{ value: string; label: string; icon?: React.ReactNode }>
  onChange: (value: string) => void
}
```

**Step 2: Wire layout options**

- Hero style: fullbleed (tall), contained (medium), minimal (text only)
- Bio layout: two-column (image + text), single-column (text only)
- Section padding: compact, default, spacious (shown as spacing indicators)
- Content width: narrow, default, wide (shown as width indicators)
- Card radius: none, sm, md, lg, full (shown as corner radius preview)
- Element gap: tight, default, relaxed

**Step 3: Commit**

```bash
git add src/routes/_dashboard/dashboard.theme.tsx
git commit -m "feat: add layout controls with visual option pickers"
```

---

### Task 17: Buttons, links, and effects controls

**Files:**
- Modify: `src/routes/_dashboard/dashboard.theme.tsx` (buttons + effects sections)

**Step 1: Button style picker**

Three visual options showing a sample button in each style:
- Rounded (slight border-radius)
- Square (no border-radius)
- Pill (full border-radius)

**Step 2: Link style picker**

Three options:
- Underline (always underlined)
- None (no underline)
- Hover underline (underline on hover)

**Step 3: Effects controls**

- Card border: none, subtle (1px), solid (2px) — shown as card previews
- Shadow: none, sm, md, lg — shown as card previews with increasing shadow
- Divider style: none, line, accent (colored line), gradient — shown as line previews

**Step 4: Commit**

```bash
git add src/routes/_dashboard/dashboard.theme.tsx
git commit -m "feat: add button, link, and effect controls to theme editor"
```

---

## Phase 5: Custom Font Upload

### Task 18: Font upload API endpoint

**Files:**
- Create: `server/routes/api/upload-font.ts`

**Step 1: Create the endpoint**

Follow the same pattern as `server/routes/api/upload.ts` but for fonts:

- Accepted MIME types: `font/woff2`, `font/woff`, `font/ttf`, `font/otf`, `application/font-woff`, `application/font-woff2`, `application/x-font-ttf`, `application/vnd.ms-opentype`
- Also accept by file extension: `.woff2`, `.woff`, `.ttf`, `.otf` (some browsers don't set font MIME types correctly)
- Max file size: 500KB
- Magic bytes: wOFF (woff), wOF2 (woff2), 0x00 0x01 0x00 0x00 (ttf), OTTO (otf)
- Storage path: `{user.id}/fonts/{timestamp}-{safeName}`
- **Pro tier check:** Query the user's profile tier before allowing upload. Return error if not pro.
- Return: `{ success: 1, file: { url, name, size } }`

**Step 2: Commit**

```bash
git add server/routes/api/upload-font.ts
git commit -m "feat: add font upload API endpoint with tier gating"
```

---

### Task 19: Font management UI in theme editor

**Files:**
- Modify: `src/routes/_dashboard/dashboard.theme.tsx` (Custom Fonts accordion section)

**Step 1: Build font upload section**

Inside the "Custom Fonts" accordion section:
- A file input that accepts `.woff2,.woff,.ttf,.otf`
- Upload progress indicator
- On successful upload, add the font to `theme_custom_fonts` form value via `setValue`
- List of uploaded fonts showing: name, weight label, a sample "Aa" rendered in the font, and a delete button
- Delete removes from the `theme_custom_fonts` array (storage cleanup is a nice-to-have for later)
- User can set a display name for each uploaded font
- Max 4 fonts indicator ("2 of 4 font slots used")

**Step 2: Integrate custom fonts into FontPicker**

Pass `customFonts` from the form state to all `<FontPicker>` components. Custom fonts appear at the top of the dropdown under a "Your Fonts" heading.

**Step 3: Commit**

```bash
git add src/routes/_dashboard/dashboard.theme.tsx
git commit -m "feat: add custom font upload and management UI"
```

---

### Task 20: Custom font rendering on public page

**Files:**
- Modify: `src/routes/$slug.tsx` (head function + style injection)

**Step 1: Inject @font-face declarations**

In the `head()` function, if `profile.theme_custom_fonts` has entries, generate `@font-face` CSS and inject via a `<style>` tag or inline styles:

```css
@font-face {
  font-family: 'My Brand Font';
  src: url('https://...supabase.../fonts/abc/brand.woff2') format('woff2');
  font-weight: 400;
  font-display: swap;
}
```

**Step 2: Exclude custom fonts from Google Fonts URL**

When building the Google Fonts URL, filter out any font names that match custom font names.

**Step 3: Commit**

```bash
git add src/routes/\$slug.tsx
git commit -m "feat: inject custom @font-face declarations on public page"
```

---

### Task 21: Final integration testing and polish

**Files:**
- Modify: various files as needed

**Step 1: Test the full flow manually**

1. Create/switch templates — verify all fields reset correctly
2. Adjust each typography tier — verify preview updates and public page renders correctly
3. Test all color pickers — verify CSS variables apply
4. Test spacing/layout/button/effect options — verify visual changes
5. Upload a custom font — verify it appears in FontPicker and renders on public page
6. Test free user experience — verify ProGate overlays appear on restricted sections
7. Test mobile responsiveness of the editor (single column, preview hidden)

**Step 2: Verify backward compatibility**

Load an existing profile that has NO theme_* values set. Verify it renders identically to before (template defaults kick in, legacy columns are respected).

**Step 3: Run build**

```bash
npm run build
```

Verify no TypeScript errors.

**Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix: polish and integration fixes for premium theme editor"
```

---

## Summary

| Phase | Tasks | What ships |
|-------|-------|-----------|
| 1: Foundation | 1-7 | DB columns, types, schema, templates, public page CSS vars |
| 2: Sidebar Editor | 8-12 | Split-pane layout, accordion, font picker, pro gate, full editor UI |
| 3: Typography | 13-14 | 80+ Google Fonts, size sliders, weight selectors |
| 4: Controls | 15-17 | Colors (7), layout options, buttons, effects |
| 5: Custom Fonts | 18-21 | Font upload, management, @font-face injection, testing |
