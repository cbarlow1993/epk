# Pro Section Layouts Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add 3 Pro-only layout options each for the Events and Music sections on the public EPK page.

**Architecture:** Two new `text` columns on `profiles` (`events_layout`, `music_layout`) following the exact pattern of `hero_style`/`bio_layout`. Schema, types, theme editor pickers, template defaults, preview support, and 6 new layout renderers in `$slug.tsx`. All CSS-only — no new dependencies.

**Tech Stack:** TanStack Start, Supabase Postgres, Tailwind CSS v4, Zod, react-hook-form

**Security note:** All `dangerouslySetInnerHTML` usage in music embed rendering uses the existing `sanitizeEmbed()` sanitizer from `~/utils/sanitize` — no new unsanitized HTML is introduced.

---

### Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/YYYYMMDDHHMMSS_add_section_layout_columns.sql`

**Step 1: Create migration file**

Run: `npx supabase migration new add_section_layout_columns`

Then write this content to the generated file:

```sql
-- Add section layout columns to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS events_layout text DEFAULT 'grid',
  ADD COLUMN IF NOT EXISTS music_layout text DEFAULT 'grid';

-- Add check constraints for enum-like columns
ALTER TABLE profiles
  ADD CONSTRAINT profiles_events_layout_check CHECK (events_layout IN ('grid', 'marquee', 'carousel', 'timeline')),
  ADD CONSTRAINT profiles_music_layout_check CHECK (music_layout IN ('grid', 'featured', 'showcase', 'compact'));

COMMENT ON COLUMN profiles.events_layout IS 'Events section layout: grid, marquee, carousel, or timeline';
COMMENT ON COLUMN profiles.music_layout IS 'Music section layout: grid, featured, showcase, or compact';
```

**Step 2: Push migration**

Run: `npx supabase db push`
Expected: Migration applies successfully.

**Step 3: Commit**

```bash
git add supabase/migrations/
git commit -m "feat: add events_layout and music_layout columns"
```

---

### Task 2: Schema, Types & Template Config

**Files:**
- Modify: `src/schemas/profile.ts:60` (after `bio_layout`)
- Modify: `src/types/database.ts:37` (after `bio_layout`)
- Modify: `src/utils/templates.ts:58-59` (TemplateConfig interface)

**Step 1: Add Zod schema fields**

In `src/schemas/profile.ts`, after line 60 (`bio_layout: z.enum([...]).optional(),`), add:

```typescript
events_layout: z.enum(['grid', 'marquee', 'carousel', 'timeline']).optional().nullable(),
music_layout: z.enum(['grid', 'featured', 'showcase', 'compact']).optional().nullable(),
```

**Step 2: Add ProfileRow type fields**

In `src/types/database.ts`, after line 37 (`bio_layout: ...`), add:

```typescript
events_layout: 'grid' | 'marquee' | 'carousel' | 'timeline' | null
music_layout: 'grid' | 'featured' | 'showcase' | 'compact' | null
```

**Step 3: Add TemplateConfig fields**

In `src/utils/templates.ts`, after line 59 (`bioLayout: 'two-column' | 'single-column'`), add:

```typescript
eventsLayout: 'grid' | 'marquee' | 'carousel' | 'timeline'
musicLayout: 'grid' | 'featured' | 'showcase' | 'compact'
```

**Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: Errors in `templates.ts` because existing template objects are missing the new fields. That's expected — Task 3 fixes it.

**Step 5: Commit**

```bash
git add src/schemas/profile.ts src/types/database.ts src/utils/templates.ts
git commit -m "feat: add events_layout and music_layout to schema and types"
```

---

### Task 3: Template Defaults

**Files:**
- Modify: `src/utils/templates.ts` (all 29 template objects + `resolveTheme` return)

**Step 1: Add layout defaults to every template**

Add `eventsLayout` and `musicLayout` after each template's `bioLayout` line. Use these values:

| Template ID | eventsLayout | musicLayout |
|-------------|-------------|-------------|
| `festival`, `festival-main` | `marquee` | `featured` |
| `minimal`, `swiss` | `timeline` | `compact` |
| `neon`, `warehouse` | `carousel` | `showcase` |
| All others | `grid` | `grid` |

For example, for the `default` template (after line 151):
```typescript
eventsLayout: 'grid',
musicLayout: 'grid',
```

For the `festival` template:
```typescript
eventsLayout: 'marquee',
musicLayout: 'featured',
```

Do this for ALL 29 templates listed in the `TEMPLATES` array. Every template object must have both fields or TypeScript will error.

**Step 2: Add to ResolvedTheme interface**

In `src/utils/templates.ts`, after line 1283 (`bioLayout: string`), add:

```typescript
eventsLayout: string
musicLayout: string
```

**Step 3: Add to resolveTheme return**

In `src/utils/templates.ts`, after line 1530 (`bioLayout: templateConfig.bioLayout,`), add:

```typescript
eventsLayout: templateConfig.eventsLayout,
musicLayout: templateConfig.musicLayout,
```

**Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS (all templates now have the required fields).

**Step 5: Commit**

```bash
git add src/utils/templates.ts
git commit -m "feat: add events/music layout defaults to all templates"
```

---

### Task 4: Theme Editor — Form Fields & Pickers

**Files:**
- Modify: `src/routes/_dashboard/dashboard.theme.tsx`

**Step 1: Add to themeSchema pick**

In `dashboard.theme.tsx`, inside the `themeSchema.pick({...})` block, after `bio_layout: true,` (line 30), add:

```typescript
events_layout: true,
music_layout: true,
```

**Step 2: Add form defaultValues**

After `bio_layout: initial?.bio_layout ?? undefined,` (line 520), add:

```typescript
events_layout: initial?.events_layout ?? null,
music_layout: initial?.music_layout ?? null,
```

**Step 3: Add OptionPickers to Layout accordion**

In the `layout` accordion section, inside the `<ProGate>` `<div className="space-y-5">`, after the Bio Layout `OptionPicker` (after line 756), add:

```tsx
<OptionPicker
  label="Events Layout"
  value={watch('events_layout')}
  options={[
    { value: 'grid', label: 'Grid' },
    { value: 'marquee', label: 'Marquee' },
    { value: 'carousel', label: 'Carousel' },
    { value: 'timeline', label: 'Timeline' },
  ]}
  onChange={(v) => setValue('events_layout', v as ProfileUpdate['events_layout'], { shouldDirty: true })}
/>
<OptionPicker
  label="Music Layout"
  value={watch('music_layout')}
  options={[
    { value: 'grid', label: 'Grid' },
    { value: 'featured', label: 'Featured' },
    { value: 'showcase', label: 'Showcase' },
    { value: 'compact', label: 'Compact' },
  ]}
  onChange={(v) => setValue('music_layout', v as ProfileUpdate['music_layout'], { shouldDirty: true })}
/>
```

**Step 4: Add to applyTemplate**

In `applyTemplate()`, after `setValue('bio_layout', tpl.bioLayout, ...)` (line 582), add:

```typescript
setValue('events_layout', tpl.eventsLayout, { shouldDirty: true })
setValue('music_layout', tpl.musicLayout, { shouldDirty: true })
```

**Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 6: Commit**

```bash
git add src/routes/_dashboard/dashboard.theme.tsx
git commit -m "feat: add events/music layout pickers to theme editor"
```

---

### Task 5: Preview Support — THEME_SEARCH_KEYS & Resolution

**Files:**
- Modify: `src/routes/$slug.tsx:17-29` (THEME_SEARCH_KEYS)
- Modify: `src/routes/$slug.tsx:280-281` (layout resolution)

**Step 1: Add to THEME_SEARCH_KEYS**

In `$slug.tsx`, add `'events_layout'` and `'music_layout'` to the `THEME_SEARCH_KEYS` array. Add them after `'bio_layout'` on line 19:

```typescript
const THEME_SEARCH_KEYS = [
  'accent_color', 'bg_color', 'font_family', 'template',
  'hero_style', 'bio_layout', 'events_layout', 'music_layout', 'animate_sections',
  // ... rest unchanged
] as const
```

**Step 2: Add layout resolution**

After the `bioLayout` resolution line (line 281), add:

```typescript
const eventsLayout = (ov ? ov.events_layout : (s.events_layout as string)) || profile.events_layout || templateConfig.eventsLayout
const musicLayout = (ov ? ov.music_layout : (s.music_layout as string)) || profile.music_layout || templateConfig.musicLayout
```

**Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 4: Commit**

```bash
git add src/routes/$slug.tsx
git commit -m "feat: add events/music layout preview support"
```

---

### Task 6: Events Layouts — Marquee, Carousel, Timeline

**Files:**
- Modify: `src/routes/$slug.tsx` (events section renderer, currently lines ~600-627)

Replace the events section renderer with a layout switch. The existing grid code becomes the `'grid'` (default/else) case. Add three new cases.

**Step 1: Implement all events layouts**

Replace the events section renderer's inner content (the `<div className="grid grid-cols-2 ...">` and its children) with a switch on `eventsLayout`. The section wrapper `<EPKSection>` stays unchanged.

**Marquee layout:** First event renders as a wide hero card (`aspect-[3/1]`, full width, image cover with gradient overlay, name + date overlaid at bottom). Remaining events render in a `grid-cols-2 md:grid-cols-4` grid. Each card uses `cardStyle`, images get `group-hover:scale-105 transition-transform duration-500`.

**Carousel layout:** A `flex gap-4 overflow-x-auto` container with `scrollSnapType: 'x mandatory'`. Each card is `flex-none w-[280px]` with `scrollSnapAlign: 'start'`, `aspect-[3/4]` image, gradient overlay, white text at bottom. Left and right edges have gradient fade overlays using the page `bg` color.

**Timeline layout:** A vertical accent line (`absolute left-4 md:left-1/2 w-0.5 bg-accent/30`). Events rendered with alternating `md:flex-row` / `md:flex-row-reverse`. Accent dot at each event position (`w-3 h-3 rounded-full bg-accent`). Cards have 64px square thumbnails + text. On mobile: left-aligned single column with `ml-10`.

**Grid layout (default else):** Unchanged — existing `grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5` code.

**Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 3: Commit**

```bash
git add src/routes/$slug.tsx
git commit -m "feat: add marquee, carousel, and timeline events layouts"
```

---

### Task 7: Music Layouts — Featured, Showcase, Compact

**Files:**
- Modify: `src/routes/$slug.tsx` (music section renderer, currently lines ~555-598)

Replace the music section renderer's per-category inner grid with a layout switch. Category grouping and the outer `EPKSection` stay unchanged. All embed rendering continues using the existing `sanitizeEmbed()` function.

**Step 1: Implement all music layouts**

The outer structure stays the same — `EPKSection` + category grouping loop with `<h3>` heading. The inner grid per category switches on `musicLayout`.

**Featured layout:** First mix per category renders as a large horizontal card (`grid md:grid-cols-[2fr_3fr]`, image left, text right with `p-6`). Remaining mixes in a `sm:grid-cols-2` grid. Embeds render inline where available.

**Showcase layout:** Each mix as a full-width row (`grid md:grid-cols-[1fr_2fr]`). Image/embed left, text right with `p-6`. Even-indexed rows get subtle alternating background via inline style. On mobile: stacks vertically. Empty image placeholder for mixes without artwork.

**Compact layout:** `divide-y` container with border color from CSS variable. Each mix is a flex row: 48px (`w-12 h-12`) square thumbnail, title + description (truncated), and a chevron-right SVG icon. Hover state: `hover:bg-accent/5`. Embeds render with `maxHeight: '120px'` overflow hidden.

**Grid layout (default else):** Unchanged — existing `sm:grid-cols-2 lg:grid-cols-3` code.

**Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 3: Commit**

```bash
git add src/routes/$slug.tsx
git commit -m "feat: add featured, showcase, and compact music layouts"
```

---

### Task 8: Visual Verification & Final Commit

**Step 1: Run dev server**

Run: `npm run dev`

**Step 2: Verify in browser**

1. Go to `/dashboard/theme` — confirm Events Layout and Music Layout pickers appear in the Layout accordion (behind ProGate if not Pro)
2. Select each layout option — confirm the preview iframe updates without reload
3. Switch templates (e.g., Festival, Minimal, Neon) — confirm layout pickers update to template defaults
4. Visit a public EPK page directly — confirm grid layout renders unchanged (free tier)

**Step 3: Type-check and build**

Run: `npx tsc --noEmit`
Expected: PASS

Run: `npm run build`
Expected: PASS

**Step 4: Final commit if any tweaks were needed**

```bash
git add -A
git commit -m "fix: polish section layout rendering"
```
