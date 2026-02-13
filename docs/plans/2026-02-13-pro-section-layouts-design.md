# Pro Section Layouts — Events & Music

## Overview

Add 3 new Pro-only layout options each for the Events and Music sections on the public EPK page. The existing grid layout remains the free default. Each section gets independent controls in the theme editor.

## Data Model

Two new columns on `profiles`:

| Column | Type | Values | Default |
|--------|------|--------|---------|
| `events_layout` | `text` | `grid`, `marquee`, `carousel`, `timeline` | `grid` |
| `music_layout` | `text` | `grid`, `featured`, `showcase`, `compact` | `grid` |

- Migration adds columns + CHECK constraints (same pattern as `hero_style`)
- Zod schema: `z.enum([...]).optional().nullable()`
- `ProfileRow` type updated
- `THEME_SEARCH_KEYS` gains both keys for preview support

## Theme Editor UI

Both pickers live inside the existing **Layout** accordion in `dashboard.theme.tsx`, wrapped in `<ProGate>`. Uses existing `OptionPicker` component. The `themeSchema` picks the two new fields. postMessage preview works automatically.

## Events Layouts

**Grid** (free default) — Current 5-column square tile grid. Unchanged.

**Marquee** (Pro) — First event renders as a wide hero card (full container width, `aspect-[3/1]`, image cover, name + date overlaid on gradient). Remaining events in a 4-column grid below. If only 1-2 events, they stack as hero cards.

**Carousel** (Pro) — Horizontally scrollable container with `scroll-snap-type: x mandatory`. Cards ~280px wide, `aspect-[3/4]`, image cover with overlay text. CSS gradient fade edges. CSS-only, no JS library. Touch swipe works natively.

**Timeline** (Pro) — Vertical accent-colored line (2px) centered. Events alternate left/right using even/odd flexbox. Small accent dot on the line per event. Cards show thumbnail, name, date. Mobile: single-column left-aligned.

## Music Layouts

**Grid** (free default) — Current 3-column card grid grouped by category. Unchanged.

**Featured** (Pro) — First mix per category renders as a large horizontal card (artwork left ~40%, text right). Remaining mixes in a 2-column grid below. Embeds render inline where available.

**Showcase** (Pro) — Each mix as a full-width horizontal row. Image/embed left (~1/3), text right. Alternating subtle background tint. Mobile: stacked (image top, text below).

**Compact** (Pro) — Tight list rows. 48px square thumbnail, title + description + platform, arrow icon. Thin border dividers. Embeds at constrained height. Dense, information-focused.

All layouts use the existing `cardStyle` CSS variable object for theming consistency.

## Template Defaults

`TemplateConfig` gains `eventsLayout` and `musicLayout` fields.

| Template | Events | Music |
|----------|--------|-------|
| `default` | grid | grid |
| `festival` | marquee | featured |
| `minimal` / `swiss` | timeline | compact |
| `neon` / `warehouse` | carousel | showcase |
| All others | grid | grid |

## Resolution Priority

Same chain as `heroStyle` / `bioLayout`:

```
postMessage override > URL search param > profile column > template default > 'grid'
```

## Scope Boundaries

- Free tier unchanged — `grid` renders exactly as today
- No new dependencies (carousel is CSS scroll-snap)
- No new components extracted — layouts inline in section renderers
- Category grouping in Music preserved across all layouts
- No changes to `resolveTheme` — layout fields resolved directly in component
