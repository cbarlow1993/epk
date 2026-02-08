# Technical Rider Structured Fields — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the free-form block-editor technical rider with structured form fields (deck model/qty, mixer model, monitoring type/qty/notes, additional notes textarea).

**Architecture:** New columns added to existing `technical_rider` table. Dashboard form switches from imperative BlockEditor save to standard react-hook-form. Public page switches from BlockRenderer to a key-value display card. A new `FormSelect` component is created to match existing `FormInput`/`FormTextarea` patterns.

**Tech Stack:** Supabase (Postgres migration), Zod schemas, react-hook-form + zodResolver, TanStack Start server functions, Tailwind CSS v4.

**Design doc:** `docs/plans/2026-02-06-technical-rider-structured-fields.md`

---

### Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/20260206_add_technical_structured_fields.sql`

**Step 1: Create the migration file**

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

**Step 2: Push migration to remote**

Run: `npx supabase db push`
Expected: Migration applied successfully.

**Step 3: Update schema.sql to reflect new columns**

Modify: `supabase/schema.sql` — add the 9 new columns to the `technical_rider` table definition (after `alternative_setup`).

**Step 4: Commit**

```
feat: add structured columns to technical_rider table
```

---

### Task 2: Zod Schema + Constants

**Files:**
- Modify: `src/schemas/technical-rider.ts`

**Step 1: Rewrite the schema file**

Replace the entire contents of `src/schemas/technical-rider.ts` with:

```ts
import { z } from 'zod'

export const DECK_MODELS = [
  'CDJ-3000', 'CDJ-2000NXS2', 'SC6000', 'SC6000M',
  'XDJ-XZ', 'XDJ-1000MK2', 'Turntables', 'Other',
] as const

export const MIXER_MODELS = [
  'DJM-900NXS2', 'DJM-A9', 'DJM-V10',
  'Xone:96', 'Model 1', 'MP2015', 'Other',
] as const

export const MONITOR_TYPES = [
  'Booth Monitors', 'In-Ear Monitors', 'Both', 'No Preference',
] as const

export const technicalRiderUpdateSchema = z.object({
  deck_model: z.enum(DECK_MODELS).nullable().optional(),
  deck_model_other: z.string().max(100).nullable().optional(),
  deck_quantity: z.coerce.number().int().min(1).max(8).nullable().optional(),
  mixer_model: z.enum(MIXER_MODELS).nullable().optional(),
  mixer_model_other: z.string().max(100).nullable().optional(),
  monitor_type: z.enum(MONITOR_TYPES).nullable().optional(),
  monitor_quantity: z.coerce.number().int().min(1).max(10).nullable().optional(),
  monitor_notes: z.string().max(500).nullable().optional(),
  additional_notes: z.string().max(5000).nullable().optional(),
})

export type TechnicalRiderUpdate = z.infer<typeof technicalRiderUpdateSchema>
```

**Step 2: Update barrel export**

Modify: `src/schemas/index.ts` — update the technical-rider export line to also export the constants:

```ts
export { technicalRiderUpdateSchema, DECK_MODELS, MIXER_MODELS, MONITOR_TYPES, type TechnicalRiderUpdate } from './technical-rider'
```

**Step 3: Verify build**

Run: `npx tsc --noEmit`
Expected: No type errors (the old `editorDataSchema` import in `technical-rider.ts` is removed, but `editorData.ts` still exists for bio page — no breakage).

**Step 4: Commit**

```
feat: structured Zod schema for technical rider
```

---

### Task 3: FormSelect Component

**Files:**
- Create: `src/components/forms/FormSelect.tsx`
- Modify: `src/components/forms/index.ts`

**Step 1: Create FormSelect**

Create `src/components/forms/FormSelect.tsx` matching the existing `FormInput` pattern:

```tsx
import type { UseFormRegisterReturn, FieldError } from 'react-hook-form'
import { FORM_LABEL, FORM_INPUT as INPUT_STYLE, FORM_INPUT_ERROR as INPUT_ERROR_STYLE, FORM_ERROR_MSG } from './styles'

interface FormSelectProps {
  label: string
  registration: UseFormRegisterReturn
  error?: FieldError
  options: { value: string; label: string }[]
  placeholder?: string
  className?: string
}

export function FormSelect({ label, registration, error, options, placeholder, className }: FormSelectProps) {
  return (
    <div className={className}>
      <label className={FORM_LABEL}>{label}</label>
      <select
        {...registration}
        className={error ? INPUT_ERROR_STYLE : INPUT_STYLE}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      {error && <p className={FORM_ERROR_MSG}>{error.message}</p>}
    </div>
  )
}
```

**Step 2: Export from barrel**

Add to `src/components/forms/index.ts`:

```ts
export { FormSelect } from './FormSelect'
```

**Step 3: Verify build**

Run: `npx tsc --noEmit`
Expected: No type errors.

**Step 4: Commit**

```
feat: add FormSelect component
```

---

### Task 4: Dashboard Page — Structured Form

**Files:**
- Modify: `src/routes/_dashboard/dashboard.technical.tsx`

**Step 1: Rewrite the dashboard page**

Replace the entire contents of `src/routes/_dashboard/dashboard.technical.tsx` with a react-hook-form based form. Key details:

- Import `useForm` from `react-hook-form`, `zodResolver` from `@hookform/resolvers/zod`
- Import `technicalRiderUpdateSchema`, `DECK_MODELS`, `MIXER_MODELS`, `MONITOR_TYPES` from `~/schemas/technical-rider`
- Import `FormInput`, `FormSelect`, `FormTextarea`, `FORM_LABEL`, `FORM_INPUT` from `~/components/forms`
- Use `useForm<TechnicalRiderUpdate>` with `zodResolver(technicalRiderUpdateSchema)`
- Default values from loader data (map null to `''` for selects, null to `''` for text fields)
- `watch('deck_model')` to conditionally show `deck_model_other` input when value is `'Other'`
- `watch('mixer_model')` to conditionally show `mixer_model_other` input when value is `'Other'`
- `watch('monitor_type')` to conditionally show `monitor_quantity` when value is `'Booth Monitors'` or `'Both'`
- Group headings using `<h2>` with `FORM_LABEL` styling
- Save handler: call `handleSubmit`, convert empty strings back to `null`, then `onSave()`
- `isDirty` from formState controls Save button (proper dirty tracking)

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { getTechnicalRider, updateTechnicalRider } from '~/server/technical-rider'
import { technicalRiderUpdateSchema, DECK_MODELS, MIXER_MODELS, MONITOR_TYPES, type TechnicalRiderUpdate } from '~/schemas/technical-rider'
import { FormInput, FormSelect, FormTextarea, FORM_LABEL, CARD_SECTION } from '~/components/forms'
import { useDashboardSave } from '~/hooks/useDashboardSave'
import { DashboardHeader } from '~/components/DashboardHeader'
import { useSectionToggle } from '~/hooks/useSectionToggle'

export const Route = createFileRoute('/_dashboard/dashboard/technical')({
  loader: () => getTechnicalRider(),
  component: TechnicalRiderEditor,
})

const deckOptions = DECK_MODELS.map((m) => ({ value: m, label: m }))
const mixerOptions = MIXER_MODELS.map((m) => ({ value: m, label: m }))
const monitorOptions = MONITOR_TYPES.map((m) => ({ value: m, label: m }))
const qtyOptions = [2, 3, 4].map((n) => ({ value: String(n), label: String(n) }))

function TechnicalRiderEditor() {
  const initialData = Route.useLoaderData()
  const { saving, saved, error, onSave } = useDashboardSave(updateTechnicalRider)
  const sectionToggle = useSectionToggle('technical')

  const { register, handleSubmit, watch, formState: { errors, isDirty } } = useForm<TechnicalRiderUpdate>({
    resolver: zodResolver(technicalRiderUpdateSchema) as never,
    defaultValues: {
      deck_model: initialData?.deck_model ?? undefined,
      deck_model_other: initialData?.deck_model_other ?? '',
      deck_quantity: initialData?.deck_quantity ?? undefined,
      mixer_model: initialData?.mixer_model ?? undefined,
      mixer_model_other: initialData?.mixer_model_other ?? '',
      monitor_type: initialData?.monitor_type ?? undefined,
      monitor_quantity: initialData?.monitor_quantity ?? undefined,
      monitor_notes: initialData?.monitor_notes ?? '',
      additional_notes: initialData?.additional_notes ?? '',
    },
  })

  const deckModel = watch('deck_model')
  const mixerModel = watch('mixer_model')
  const monitorType = watch('monitor_type')
  const showMonitorQty = monitorType === 'Booth Monitors' || monitorType === 'Both'

  const onSubmit = handleSubmit(async (formData) => {
    // Convert empty strings to null for DB storage
    const cleaned: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(formData)) {
      cleaned[key] = value === '' ? null : value
    }
    await Promise.all([
      onSave(cleaned as TechnicalRiderUpdate),
      sectionToggle.save(),
    ])
  })

  return (
    <form onSubmit={onSubmit}>
      <DashboardHeader
        title="Technical Rider"
        saving={saving}
        saved={saved}
        error={error}
        isDirty={isDirty || sectionToggle.isDirty}
        sectionEnabled={sectionToggle.enabled}
        onToggleSection={sectionToggle.toggle}
      />

      <div className="space-y-8 max-w-2xl">
        {/* Decks */}
        <div className={CARD_SECTION}>
          <h2 className={FORM_LABEL + ' mb-4 text-sm'}>Decks</h2>
          <div className="grid grid-cols-2 gap-4">
            <FormSelect
              label="Model"
              registration={register('deck_model')}
              error={errors.deck_model}
              options={deckOptions}
              placeholder="Select model..."
            />
            <FormSelect
              label="Quantity"
              registration={register('deck_quantity', { valueAsNumber: true })}
              error={errors.deck_quantity}
              options={qtyOptions}
              placeholder="Qty"
            />
          </div>
          {deckModel === 'Other' && (
            <FormInput
              label="Specify Model"
              registration={register('deck_model_other')}
              error={errors.deck_model_other}
              placeholder="e.g. Rane Twelve MKII"
              className="mt-4"
            />
          )}
        </div>

        {/* Mixer */}
        <div className={CARD_SECTION}>
          <h2 className={FORM_LABEL + ' mb-4 text-sm'}>Mixer</h2>
          <FormSelect
            label="Model"
            registration={register('mixer_model')}
            error={errors.mixer_model}
            options={mixerOptions}
            placeholder="Select model..."
          />
          {mixerModel === 'Other' && (
            <FormInput
              label="Specify Model"
              registration={register('mixer_model_other')}
              error={errors.mixer_model_other}
              placeholder="e.g. Ecler Nuo 4.0"
              className="mt-4"
            />
          )}
        </div>

        {/* Monitoring */}
        <div className={CARD_SECTION}>
          <h2 className={FORM_LABEL + ' mb-4 text-sm'}>Monitoring</h2>
          <div className={`grid ${showMonitorQty ? 'grid-cols-2' : 'grid-cols-1'} gap-4`}>
            <FormSelect
              label="Type"
              registration={register('monitor_type')}
              error={errors.monitor_type}
              options={monitorOptions}
              placeholder="Select type..."
            />
            {showMonitorQty && (
              <FormInput
                label="Quantity"
                registration={register('monitor_quantity', { valueAsNumber: true })}
                error={errors.monitor_quantity}
                type="number"
                placeholder="2"
              />
            )}
          </div>
          <FormInput
            label="Monitor Notes"
            registration={register('monitor_notes')}
            error={errors.monitor_notes}
            placeholder="e.g. Wedge style preferred"
            className="mt-4"
          />
        </div>

        {/* Additional Notes */}
        <div className={CARD_SECTION}>
          <FormTextarea
            label="Additional Notes"
            registration={register('additional_notes')}
            error={errors.additional_notes}
            rows={4}
            placeholder="Power requirements, stage furniture, USB access, etc."
          />
        </div>
      </div>
    </form>
  )
}
```

**Step 2: Verify build**

Run: `npx tsc --noEmit`
Expected: No type errors.

**Step 3: Commit**

```
feat: structured form for technical rider dashboard
```

---

### Task 5: Public Page — Key-Value Display

**Files:**
- Modify: `src/routes/$slug.tsx` (lines 458–475, the `technical` section renderer)

**Step 1: Update the technical section renderer**

Replace the `technical` key in `sectionRenderers` (lines 458–475 of `$slug.tsx`). The new version renders a key-value card instead of BlockRenderer.

The visibility condition changes from checking `preferred_setup || alternative_setup` to checking if any structured field is populated:

```tsx
technical: technicalRider && (technicalRider.deck_model || technicalRider.mixer_model || technicalRider.monitor_type || technicalRider.additional_notes) ? (
  <EPKSection key="technical" id="technical" heading="Technical Rider" maxWidth="max-w-4xl">
    <div className={`${cardBgClass} backdrop-blur-sm border ${borderClass} overflow-hidden`}>
      <dl className="divide-y divide-current/5">
        {technicalRider.deck_model && (
          <div className="px-6 py-4 flex justify-between items-baseline">
            <dt className={`text-sm font-medium`}>Decks</dt>
            <dd className={`text-sm ${textSecClass}`}>
              {technicalRider.deck_quantity ? `${technicalRider.deck_quantity}x ` : ''}
              {technicalRider.deck_model === 'Other' ? technicalRider.deck_model_other : technicalRider.deck_model}
            </dd>
          </div>
        )}
        {technicalRider.mixer_model && (
          <div className="px-6 py-4 flex justify-between items-baseline">
            <dt className={`text-sm font-medium`}>Mixer</dt>
            <dd className={`text-sm ${textSecClass}`}>
              {technicalRider.mixer_model === 'Other' ? technicalRider.mixer_model_other : technicalRider.mixer_model}
            </dd>
          </div>
        )}
        {technicalRider.monitor_type && (
          <div className="px-6 py-4 flex justify-between items-baseline">
            <dt className={`text-sm font-medium`}>Monitoring</dt>
            <dd className={`text-sm ${textSecClass} text-right`}>
              <span>
                {technicalRider.monitor_quantity ? `${technicalRider.monitor_quantity}x ` : ''}
                {technicalRider.monitor_type}
              </span>
              {technicalRider.monitor_notes && (
                <span className="block text-xs mt-1 italic">{technicalRider.monitor_notes}</span>
              )}
            </dd>
          </div>
        )}
      </dl>
      {technicalRider.additional_notes && (
        <>
          <div className={`border-t ${borderClass}`} />
          <div className="px-6 py-4">
            <p className="text-sm font-medium mb-2">Additional Notes</p>
            <p className={`text-sm ${textSecClass} whitespace-pre-line`}>{technicalRider.additional_notes}</p>
          </div>
        </>
      )}
    </div>
  </EPKSection>
) : null,
```

**Step 2: Update the nav section condition**

Also update line 272 (the nav sections array) — replace the old condition:

Old:
```ts
technicalRider && (technicalRider.preferred_setup || technicalRider.alternative_setup) && { label: 'Technical', href: '#technical' },
```

New:
```ts
technicalRider && (technicalRider.deck_model || technicalRider.mixer_model || technicalRider.monitor_type || technicalRider.additional_notes) && { label: 'Technical', href: '#technical' },
```

**Step 3: Clean up unused imports**

If `BlockRenderer` is no longer used by any other section in `$slug.tsx`, remove its import. Check first — it's used by bio section, so it likely stays.

**Step 4: Verify build**

Run: `npx tsc --noEmit`
Expected: No type errors.

**Step 5: Commit**

```
feat: key-value display for technical rider on public page
```

---

### Task 6: Manual Smoke Test

**Step 1: Start dev server**

Run: `npm run dev`

**Step 2: Test dashboard form**

- Navigate to `/dashboard/technical`
- Verify dropdowns render with all options
- Select "Other" for deck model — verify custom text input appears
- Select "Booth Monitors" — verify quantity field appears
- Select "In-Ear Monitors" — verify quantity field hides
- Fill all fields, click Save — verify "Saved" indicator appears
- Refresh page — verify saved values persist

**Step 3: Test public page**

- Navigate to the DJ's public slug page
- Verify technical rider section shows key-value pairs
- Verify "Other" model shows custom text, not "Other"
- Verify monitor notes shows as italic sub-text
- Verify additional notes section shows with divider
- Verify section hides when all fields are empty

**Step 4: Final commit (if any tweaks needed)**

```
fix: polish technical rider form/display
```
