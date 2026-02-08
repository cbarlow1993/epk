# Technical Rider — Structured Fields Design

## Overview

Replace the current dual block-editor (free-form JSONB) technical rider with structured form fields plus an optional plain-text notes section. Makes the rider more standardized, scannable for venue staff, and quicker to fill out for DJs.

## Data Model

### New columns on `technical_rider` table

| Column | Type | Default | Notes |
|---|---|---|---|
| `deck_model` | `text` | `null` | Enum-like: CDJ-3000, CDJ-2000NXS2, SC6000, SC6000M, XDJ-XZ, XDJ-1000MK2, Turntables, Other |
| `deck_model_other` | `text` | `null` | Free text, used when deck_model = 'Other' |
| `deck_quantity` | `smallint` | `null` | Typical values: 2, 3, 4 |
| `mixer_model` | `text` | `null` | Enum-like: DJM-900NXS2, DJM-A9, DJM-V10, Xone:96, Model 1, MP2015, Other |
| `mixer_model_other` | `text` | `null` | Free text, used when mixer_model = 'Other' |
| `monitor_type` | `text` | `null` | Enum-like: Booth Monitors, In-Ear Monitors, Both, No Preference |
| `monitor_quantity` | `smallint` | `null` | Number of booth monitors (relevant when type includes booth) |
| `monitor_notes` | `text` | `null` | Short text, e.g. "Wedge style preferred" |
| `additional_notes` | `text` | `null` | Plain textarea for misc requirements |

### Existing columns (kept, no longer used in UI)

- `preferred_setup` (JSONB) — kept for data preservation, no longer rendered
- `alternative_setup` (JSONB) — kept for data preservation, no longer rendered

## Zod Schema

```ts
export const technicalRiderUpdateSchema = z.object({
  deck_model: z.enum([
    'CDJ-3000', 'CDJ-2000NXS2', 'SC6000', 'SC6000M',
    'XDJ-XZ', 'XDJ-1000MK2', 'Turntables', 'Other',
  ]).nullable().optional(),
  deck_model_other: z.string().max(100).nullable().optional(),
  deck_quantity: z.coerce.number().int().min(1).max(8).nullable().optional(),
  mixer_model: z.enum([
    'DJM-900NXS2', 'DJM-A9', 'DJM-V10',
    'Xone:96', 'Model 1', 'MP2015', 'Other',
  ]).nullable().optional(),
  mixer_model_other: z.string().max(100).nullable().optional(),
  monitor_type: z.enum([
    'Booth Monitors', 'In-Ear Monitors', 'Both', 'No Preference',
  ]).nullable().optional(),
  monitor_quantity: z.coerce.number().int().min(1).max(10).nullable().optional(),
  monitor_notes: z.string().max(500).nullable().optional(),
  additional_notes: z.string().max(5000).nullable().optional(),
})
```

## Dashboard UI

Standard react-hook-form + zodResolver pattern. Replaces the two BlockEditor instances.

```
[DashboardHeader: "Technical Rider" + Save + section toggle]

┌─ Decks ─────────────────────────────────────┐
│  Model:    [CDJ-3000         ▾]  Qty: [2 ▾] │
│  (if Other): [________________]              │
└──────────────────────────────────────────────┘

┌─ Mixer ─────────────────────────────────────┐
│  Model:    [DJM-900NXS2      ▾]             │
│  (if Other): [________________]              │
└──────────────────────────────────────────────┘

┌─ Monitoring ────────────────────────────────┐
│  Type:     [Booth Monitors   ▾]             │
│  Quantity: [2]    Notes: [________________]  │
└──────────────────────────────────────────────┘

┌─ Additional Notes ──────────────────────────┐
│  [          Plain textarea                 ] │
└──────────────────────────────────────────────┘
```

- Conditional fields: "Other" text input appears when model dropdown = "Other". Monitor quantity appears when type includes booth monitors.
- isDirty from formState controls Save button (proper dirty tracking, unlike current always-dirty block editors).
- Group headings for visual separation between sections.

## Public EPK Display

Key-value card layout, scannable for venue staff.

```
┌─ Technical Rider ───────────────────────────┐
│                                             │
│  Decks         2x CDJ-3000                  │
│  Mixer         DJM-900NXS2                  │
│  Monitoring    2x Booth Monitors            │
│                "Wedge style preferred"       │
│                                             │
│  ─────────────────────────────────────────  │
│  Additional Notes                           │
│  Please ensure USB ports are accessible.    │
│  Need a table, not a coffin case.           │
│                                             │
└─────────────────────────────────────────────┘
```

- "Other" models display the custom text (no "(Other)" label visible).
- Monitor notes as subtle secondary line beneath the monitor spec.
- Additional notes separated by divider, only shown if populated.
- Entire section hidden if all fields are empty/null.
- Inherits existing card styling (backdrop blur, border, theme-aware colors).

## Migration

Single SQL migration adding the new columns:

```sql
ALTER TABLE technical_rider
  ADD COLUMN deck_model text,
  ADD COLUMN deck_model_other text,
  ADD COLUMN deck_quantity smallint,
  ADD COLUMN mixer_model text,
  ADD COLUMN mixer_model_other text,
  ADD COLUMN monitor_type text,
  ADD COLUMN monitor_quantity smallint,
  ADD COLUMN monitor_notes text,
  ADD COLUMN additional_notes text;
```

No data migration needed — old JSONB columns are preserved, new columns start null. Existing RLS policies cover the new columns automatically (row-level, not column-level).

## Files to Change

1. **New migration** — `supabase/migrations/YYYYMMDD_add_technical_structured_fields.sql`
2. **Schema** — `src/schemas/technical-rider.ts` — replace with structured Zod schema
3. **Server functions** — `src/server/technical-rider.ts` — update query/mutation for new columns
4. **Dashboard page** — `src/routes/_dashboard/dashboard.technical.tsx` — replace BlockEditors with structured form
5. **Public page** — `src/routes/$slug.tsx` — replace BlockRenderer with key-value display
6. **Schema barrel** — `src/schemas/index.ts` — update exports if needed
