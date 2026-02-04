# Swiss Minimal Redesign — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign the entire DJ EPK platform to match the Swiss Minimal / International Typographic Style from prototype `05-swiss-minimal.html`.

**Architecture:** Replace the current warm-cream Fraunces/DM Sans design with a sharp black-white-red system using Bricolage Grotesque + Instrument Sans. No rounded corners, no soft shadows — use black borders, red accent, uppercase headings, and grid-obsessed layouts. All changes flow through the centralized design tokens in `styles.css` and shared constants in `forms/styles.ts`.

**Tech Stack:** TanStack Start, Tailwind CSS v4 (`@theme` block), React, Google Fonts

---

## Design System Reference (from prototype 05)

| Token | Current Value | New Value |
|---|---|---|
| `--color-bg` | `#FAF9F6` (warm cream) | `#FFFFFF` (white) |
| `--color-surface` | `#FFFFFF` | `#F5F5F5` (gray-100) |
| `--color-card` | `rgba(255,255,255,0.85)` | `#FFFFFF` |
| `--color-border` | `rgba(0,0,0,0.06)` | `rgba(0,0,0,0.12)` |
| `--color-accent` | `#B85C38` (burnt sienna) | `#FF0000` (signal red) |
| `--color-text-primary` | `#2D2D2D` | `#000000` (black) |
| `--color-text-secondary` | `#8C8C8C` | `#666666` |
| `--font-display` | `'Fraunces', serif` | `'Bricolage Grotesque', sans-serif` |
| `--font-body` | `'DM Sans', sans-serif` | `'Instrument Sans', sans-serif` |
| `--shadow-card` | `0 1px 3px rgba(0,0,0,0.04)` | `none` |
| `--shadow-card-hover` | `0 4px 12px rgba(0,0,0,0.08)` | `none` |

### Typography Rules
- Headings: `font-display font-extrabold uppercase tracking-tight` (was `font-display font-semibold tracking-tight`)
- Section numbers: Small mono-weight labels like `01`, `02`
- Body: `font-body` normal weight, 1.5 line-height
- No rounded corners anywhere — replace all `rounded-lg`, `rounded-xl` with `rounded-none`

### Visual Rules
- Borders: 1px solid black (not light gray)
- No shadows — borders and structure only
- Red accent for: active states, CTAs, hover states, divider lines
- Cards: white bg + black border (no shadow, no rounded)
- Buttons: black bg + white text (primary) or red bg + white text (CTA)

---

## Task 1: Foundation — Design Tokens + Fonts

**Files:**
- Modify: `src/styles.css`
- Modify: `src/routes/__root.tsx`

**Step 1: Update `src/styles.css`**

Replace the entire `@theme` block with:

```css
@theme {
  /* Background & surfaces */
  --color-bg: #FFFFFF;
  --color-surface: #F5F5F5;
  --color-card: #FFFFFF;
  --color-border: rgba(0, 0, 0, 0.12);

  /* Accent */
  --color-accent: #FF0000;

  /* Text */
  --color-text-primary: #000000;
  --color-text-secondary: #666666;

  /* Aliases */
  --color-dark-bg: #FFFFFF;
  --color-dark-surface: #F5F5F5;
  --color-dark-card: #FFFFFF;

  /* Typography */
  --font-display: 'Bricolage Grotesque', sans-serif;
  --font-body: 'Instrument Sans', sans-serif;

  /* Shadows — removed for Swiss Minimal */
  --shadow-card: none;
  --shadow-card-hover: none;
}
```

**Step 2: Update `src/routes/__root.tsx`**

Change the Google Fonts link from Fraunces + DM Sans to Bricolage Grotesque + Instrument Sans:

```tsx
{ rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,200..800&family=Instrument+Sans:wght@400;500;600;700&display=swap' },
```

**Step 3: Verify**

Run: `npm run build`
Expected: Clean build. Fonts and tokens cascade everywhere automatically.

**Step 4: Commit**

```
feat: swiss minimal foundation — tokens + fonts
```

---

## Task 2: Shared Form Constants

**Files:**
- Modify: `src/components/forms/styles.ts`

**Step 1: Update all constants**

Replace the style constants with Swiss Minimal equivalents:

```ts
export const FORM_LABEL = 'block text-xs font-medium text-text-secondary uppercase tracking-wider mb-2'

export const FORM_INPUT = 'w-full bg-white border border-black/20 rounded-none px-4 py-3 text-text-primary placeholder-text-secondary/50 focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none transition-colors text-sm'
export const FORM_INPUT_ERROR = 'w-full bg-white border border-red-500 rounded-none px-4 py-3 text-text-primary placeholder-text-secondary/50 focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none transition-colors text-sm'
export const FORM_ERROR_MSG = 'text-xs text-red-500 mt-1'

export const FORM_FILE_INPUT = 'text-sm text-text-secondary file:mr-3 file:py-2 file:px-4 file:rounded-none file:border file:border-black/20 file:bg-surface file:text-text-primary file:cursor-pointer hover:file:bg-border'

export const BTN_BASE = 'px-4 py-2 rounded-none text-xs font-semibold uppercase tracking-wider transition-colors'
export const BTN_PRIMARY = `${BTN_BASE} bg-black text-white hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed`
export const BTN_DELETE = `${BTN_BASE} bg-red-500/10 text-red-500 hover:bg-red-500/20`

export const CARD_SECTION = 'bg-white border border-black/10 rounded-none p-6 mb-8'
export const SETTINGS_CARD = 'bg-white border border-black/10 rounded-none p-6'
```

**Step 2: Verify + Commit**

Run: `npm run build`

```
feat: swiss minimal form constants — no rounding, black borders, uppercase labels
```

---

## Task 3: Shared Components

**Files:**
- Modify: `src/components/DashboardSidebar.tsx`
- Modify: `src/components/DashboardHeader.tsx`
- Modify: `src/components/Nav.tsx`
- Modify: `src/components/AuthForm.tsx`
- Modify: `src/components/SectionHeading.tsx`
- Modify: `src/components/FadeIn.tsx`
- Modify: `src/components/forms/TiptapEditor.tsx`
- Modify: `src/components/forms/FormColorInput.tsx`

### DashboardSidebar.tsx

Key changes:
- Remove `rounded-lg` from anywhere
- Active state: `text-accent bg-transparent border-r-2 border-accent font-semibold` (no bg tint)
- Mobile header: `bg-white border-b border-black` (black border, not border-border)
- Desktop sidebar: `bg-white border-r border-black` (black border)
- Hover: `hover:text-accent` (not hover:bg-border)

Specific replacements:
- `border-b border-border` in header div → `border-b border-black`
- `text-accent bg-accent/5 border-r-2 border-accent font-medium` → `text-accent border-r-2 border-accent font-semibold`
- `text-text-secondary hover:text-text-primary hover:bg-border` → `text-text-secondary hover:text-accent`
- `border-t border-border` in footer → `border-t border-black/10`
- Mobile header: `bg-white border-b border-border` → `bg-white border-b border-black`
- Mobile drawer: `bg-white border-r border-border` → `bg-white border-r border-black`
- Desktop sidebar: `bg-white border-r border-border` → `bg-white border-r border-black`

### DashboardHeader.tsx

Key changes:
- Title: `text-2xl font-display font-extrabold uppercase tracking-tight` (was semibold, normal case)
- Save button: `rounded-none bg-black text-white hover:bg-accent` (was rounded-lg bg-accent)

Specific replacements:
- `text-2xl font-display font-semibold tracking-tight` → `text-2xl font-display font-extrabold uppercase tracking-tight`
- `rounded-lg text-sm font-semibold bg-accent text-white hover:bg-accent/80` → `rounded-none text-xs font-semibold uppercase tracking-wider bg-black text-white hover:bg-accent`

### Nav.tsx (public EPK nav)

Key changes:
- Scrolled state: `bg-white/95 backdrop-blur-sm border-b border-black` (no shadow)
- Display name: `font-display font-extrabold uppercase tracking-tight`
- Links: `uppercase tracking-wider text-xs`

Specific replacements:
- `bg-white/80 backdrop-blur-md shadow-card` → `bg-white/95 backdrop-blur-sm border-b border-black`
- `text-lg font-display font-semibold tracking-tight` → `text-lg font-display font-extrabold uppercase tracking-tight`
- `text-sm text-text-secondary hover:text-text-primary` → `text-xs uppercase tracking-wider text-text-secondary hover:text-accent`

### AuthForm.tsx

Key changes:
- Title: `text-3xl font-display font-extrabold uppercase tracking-tight`
- Error box: `border border-red-500 rounded-none` (no red bg)
- OAuth buttons: `rounded-none border border-black/20 shadow-none`
- Divider: `h-px bg-black/10`
- Submit button: `rounded-none bg-black text-white hover:bg-accent`
- Footer link: `text-accent hover:underline`

Specific replacements:
- `text-3xl font-display font-semibold tracking-tight` → `text-3xl font-display font-extrabold uppercase tracking-tight`
- `bg-red-50 border border-red-200 rounded-lg` → `bg-red-50 border border-red-500 rounded-none`
- OAuth button: `bg-white border border-border hover:border-text-secondary/20 text-text-primary font-semibold py-3 rounded-lg transition-colors text-sm shadow-card hover:shadow-card-hover` → `bg-white border border-black/20 hover:border-black text-text-primary font-semibold py-3 rounded-none transition-colors text-sm`
- `bg-accent hover:bg-accent/80 disabled:opacity-50 text-white font-semibold py-3 rounded-lg` → `bg-black hover:bg-accent disabled:opacity-50 text-white font-semibold py-3 rounded-none`
- Divider: `h-px bg-border` → `h-px bg-black/10`

### SectionHeading.tsx

Replace entire component body:
- Accent bar: `w-16 h-0.5 bg-accent mb-6` (wider red line)
- Heading: `text-4xl md:text-5xl font-display font-extrabold uppercase tracking-tight mb-12`

### FadeIn.tsx

No changes needed. The translate-y-4 animation works with any design.

### TiptapEditor.tsx

Key changes:
- Editor wrapper: `rounded-none border border-black/20`
- Toolbar: `bg-surface rounded-none border-b border-black/10`
- Remove any `rounded-lg` or `rounded-t-lg`
- Remove `prose-invert` if present

### FormColorInput.tsx

Key changes:
- Input: `rounded-none border-black/20`
- Remove any `rounded-lg`

**Step: Verify + Commit**

Run: `npm run build`

```
feat: swiss minimal components — black borders, uppercase headings, no rounding
```

---

## Task 4: Dashboard Layout + All Dashboard Routes

**Files:**
- Modify: `src/routes/_dashboard.tsx`
- Modify: All 17 dashboard route files in `src/routes/_dashboard/`

### _dashboard.tsx

Change `bg-bg` to `bg-surface` for the main content area (gives a slight gray background contrast against the white sidebar).

### All Dashboard Routes — Find-and-Replace Patterns

Apply these patterns across ALL dashboard route files:

| Find | Replace |
|---|---|
| `rounded-lg` | `rounded-none` |
| `rounded-xl` | `rounded-none` |
| `shadow-card` | (remove entirely) |
| `shadow-card-hover` | (remove entirely) |
| `font-display font-semibold tracking-tight` (in headings) | `font-display font-extrabold uppercase tracking-tight` |
| `border-border` | `border-black/10` |
| `bg-accent text-white` (buttons) | `bg-black text-white` |
| `hover:bg-accent/80` (buttons) | `hover:bg-accent` |
| `bg-accent/5` | `bg-surface` |
| `bg-accent/10` | `bg-surface` |
| `text-green-600` | `text-green-700` |
| `text-red-500` (status, not errors) | `text-red-600` |

The files to update:
1. `dashboard.index.tsx`
2. `dashboard.bio.tsx`
3. `dashboard.music.tsx`
4. `dashboard.events.tsx`
5. `dashboard.technical.tsx`
6. `dashboard.press.tsx`
7. `dashboard.contact.tsx`
8. `dashboard.inquiries.tsx`
9. `dashboard.socials.tsx`
10. `dashboard.theme.tsx`
11. `dashboard.files.tsx`
12. `dashboard.analytics.tsx`
13. `dashboard.settings.tsx`
14. `dashboard.billing.tsx`
15. `dashboard.roster.tsx`
16. `dashboard.team.tsx`
17. `dashboard.analytics-overview.tsx`

**Step: Verify + Commit**

Run: `npm run build`

```
feat: swiss minimal dashboard — all routes updated
```

---

## Task 5: Landing Page

**Files:**
- Modify: `src/routes/index.tsx`

Rewrite the landing page component to match the Swiss Minimal prototype structure:

### Key Design Elements:

**Nav:** Fixed top, black bottom border, logo with red dot, uppercase nav links, black CTA button that turns red on hover.

**Hero:** Full-viewport height, content aligned to bottom-left. Massive uppercase heading (clamp 3.5rem–9rem) with one word per line, "Kit." in red. Right column has description + stats (8 Sections / 1 Link / £0 To Start).

**Red divider:** Full-width 3px red line between hero and features.

**Features:** Section header with number "01" + "FEATURES" title. 2-column grid of 8 features, each with a small number, title, and description. Top-border on each item, vertical border between columns.

**Pricing:** HTML table (not cards). Three columns: feature name, Free, Pro. Pro column has black background. Feature rows with checkmarks and dashes. Footer row with CTA buttons.

**CTA:** Large centered uppercase heading "STOP / SENDING / PDFs." with "PDFs." in red. Red CTA button with black shadow on hover.

**Footer:** Black top border, logo left, links right.

### Implementation Notes:
- Use `Link` from TanStack Router for `/signup`, `/login` links
- Keep the existing `FEATURES` and `PRICING` data arrays but restructure the JSX
- Add scroll-reveal animations with IntersectionObserver (consistent with prototype)
- Add the subtle 12-column grid overlay via CSS pseudo-element

**Step: Verify + Commit**

Run: `npm run build`

```
feat: swiss minimal landing page — grid-obsessed typographic layout
```

---

## Task 6: Public EPK Page + Templates

**Files:**
- Modify: `src/routes/$slug.tsx`
- Modify: `src/utils/templates.ts`

### templates.ts

Update the 4 templates to match Swiss Minimal aesthetic as the default, with variations:

```ts
export const TEMPLATES: TemplateConfig[] = [
  {
    id: 'default',
    name: 'Swiss',
    description: 'Clean black-and-white with signal red accent',
    defaults: { accent_color: '#FF0000', bg_color: '#FFFFFF', font_family: 'Bricolage Grotesque' },
    sectionOrder: ['bio', 'music', 'events', 'technical', 'press', 'contact'],
    heroStyle: 'fullbleed',
    bioLayout: 'two-column',
  },
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Clean monochrome with charcoal accent',
    defaults: { accent_color: '#2D2D2D', bg_color: '#FFFFFF', font_family: 'Instrument Sans' },
    sectionOrder: ['bio', 'music', 'events', 'press', 'technical', 'contact'],
    heroStyle: 'minimal',
    bioLayout: 'single-column',
  },
  {
    id: 'festival',
    name: 'Editorial',
    description: 'Warm paper tones with terracotta accent',
    defaults: { accent_color: '#C4553A', bg_color: '#F5F0EB', font_family: 'Playfair Display' },
    sectionOrder: ['music', 'bio', 'events', 'press', 'technical', 'contact'],
    heroStyle: 'fullbleed',
    bioLayout: 'single-column',
  },
  {
    id: 'underground',
    name: 'Dark',
    description: 'Refined dark theme with warm gold accent',
    defaults: { accent_color: '#D4A574', bg_color: '#1A1A1A', font_family: 'Space Grotesk' },
    sectionOrder: ['music', 'bio', 'technical', 'events', 'press', 'contact'],
    heroStyle: 'contained',
    bioLayout: 'two-column',
  },
]
```

### $slug.tsx

Key changes to the public EPK page:
- Replace all `rounded-lg`, `rounded-xl` → `rounded-none`
- Replace `shadow-card` / `shadow-card-hover` → remove
- Update border classes to use `border-black/10` for light backgrounds
- Section headings: uppercase, extrabold, font-display
- The `isLightBackground()` utility still handles light vs dark conditional rendering
- Update default fallback values to Swiss template defaults

**Step: Verify + Commit**

Run: `npm run build`

```
feat: swiss minimal public EPK + updated templates
```

---

## Task 7: Final Verification

**Step 1:** Run `npm run build` — confirm zero TypeScript errors.

**Step 2:** Run `npm run dev` and visually verify:
- Landing page matches Swiss Minimal prototype aesthetic
- Auth pages (login/signup) use black borders, no rounding, uppercase
- Dashboard sidebar has black borders, red active state
- Dashboard form pages use sharp inputs, black buttons
- Public EPK page with default template renders Swiss-style
- Theme editor preview works correctly
- All 4 templates render correctly

**Step 3:** Commit any polish fixes.

```
fix: swiss minimal polish and cleanup
```
