# Layout Customization — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add independent layout controls (hero style, bio layout, section order, section visibility) to the Theme page, with templates acting as presets.

**Architecture:** New profile columns store layout settings. Theme page gains a Layout section with radio buttons and drag-drop section list. Public page reads layout from profile instead of template config. Templates set all values when clicked.

**Tech Stack:** Supabase (migration), Zod (schema), @dnd-kit/sortable (drag-drop), TanStack Start, Tailwind CSS v4

---

### Task 1: Install @dnd-kit Dependencies

**Files:**
- Modify: `package.json`

**Step 1: Install @dnd-kit packages**

Run:
```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

**Step 2: Verify installation**

Run: `npm ls @dnd-kit/core`
Expected: Shows installed version

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add @dnd-kit for drag-drop section ordering"
```

---

### Task 2: Database Migration

**Files:**
- Create: `supabase/migrations/20260206100000_add_layout_columns.sql`

**Step 1: Create migration file**

```sql
-- Add layout customization columns to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS section_order text[] DEFAULT ARRAY['bio','music','events','technical','press','contact'],
  ADD COLUMN IF NOT EXISTS section_visibility jsonb DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS hero_style text DEFAULT 'fullbleed',
  ADD COLUMN IF NOT EXISTS bio_layout text DEFAULT 'two-column';

-- Add check constraints for enum-like columns
ALTER TABLE profiles
  ADD CONSTRAINT profiles_hero_style_check CHECK (hero_style IN ('fullbleed', 'contained', 'minimal')),
  ADD CONSTRAINT profiles_bio_layout_check CHECK (bio_layout IN ('two-column', 'single-column'));

COMMENT ON COLUMN profiles.section_order IS 'Ordered array of section IDs for public page';
COMMENT ON COLUMN profiles.section_visibility IS 'Map of section ID to boolean visibility';
COMMENT ON COLUMN profiles.hero_style IS 'Hero section style: fullbleed, contained, or minimal';
COMMENT ON COLUMN profiles.bio_layout IS 'Bio section layout: two-column or single-column';
```

**Step 2: Push migration to database**

Run: `npx supabase db push`
Expected: Migration applied successfully

**Step 3: Commit**

```bash
git add supabase/migrations/20260206100000_add_layout_columns.sql
git commit -m "feat(db): add layout customization columns to profiles"
```

---

### Task 3: Update TypeScript Types

**Files:**
- Modify: `src/types/database.ts`

**Step 1: Add new fields to ProfileRow interface**

In `src/types/database.ts`, add these fields to the `ProfileRow` interface after line 30 (`template: string`):

```ts
  section_order: string[] | null
  section_visibility: Record<string, boolean> | null
  hero_style: 'fullbleed' | 'contained' | 'minimal' | null
  bio_layout: 'two-column' | 'single-column' | null
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/types/database.ts
git commit -m "feat(types): add layout columns to ProfileRow"
```

---

### Task 4: Update Profile Schema

**Files:**
- Modify: `src/schemas/profile.ts`

**Step 1: Add layout fields to profileUpdateSchema**

In `src/schemas/profile.ts`, add these fields before the closing `})`:

```ts
  section_order: z.array(z.string()).max(10).optional(),
  section_visibility: z.record(z.string(), z.boolean()).optional(),
  hero_style: z.enum(['fullbleed', 'contained', 'minimal']).optional(),
  bio_layout: z.enum(['two-column', 'single-column']).optional(),
```

**Step 2: Verify schema compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/schemas/profile.ts
git commit -m "feat(schema): add layout fields to profileUpdateSchema"
```

---

### Task 5: Update Server Function Allowlist

**Files:**
- Modify: `src/server/profile.ts`

**Step 1: Add new fields to ALLOWED_PROFILE_FIELDS**

In `src/server/profile.ts`, add these to the `ALLOWED_PROFILE_FIELDS` Set (around line 7-30):

```ts
  'section_order',
  'section_visibility',
  'hero_style',
  'bio_layout',
```

**Step 2: Verify server compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/server/profile.ts
git commit -m "feat(server): allow layout fields in profile updates"
```

---

### Task 6: Create SortableSectionList Component

**Files:**
- Create: `src/components/SortableSectionList.tsx`

**Step 1: Create the drag-drop section list component**

```tsx
import { useState } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

const SECTION_LABELS: Record<string, string> = {
  bio: 'Bio',
  music: 'Music',
  events: 'Events & Brands',
  technical: 'Technical Rider',
  press: 'Press Assets',
  contact: 'Booking Contact',
}

interface SortableItemProps {
  id: string
  visible: boolean
  onToggleVisibility: (id: string) => void
}

function SortableItem({ id, visible, onToggleVisibility }: SortableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 p-3 border border-border bg-white ${isDragging ? 'shadow-lg' : ''}`}
    >
      <button
        type="button"
        className="cursor-grab active:cursor-grabbing text-text-secondary hover:text-text-primary"
        {...attributes}
        {...listeners}
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path d="M7 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" />
        </svg>
      </button>
      <span className="flex-1 text-sm font-medium">{SECTION_LABELS[id] || id}</span>
      <label className="flex items-center gap-2 text-xs text-text-secondary">
        <input
          type="checkbox"
          checked={visible}
          onChange={() => onToggleVisibility(id)}
          className="w-4 h-4 accent-accent"
        />
        {visible ? 'Visible' : 'Hidden'}
      </label>
    </div>
  )
}

interface SortableSectionListProps {
  order: string[]
  visibility: Record<string, boolean>
  onOrderChange: (newOrder: string[]) => void
  onVisibilityChange: (newVisibility: Record<string, boolean>) => void
}

export function SortableSectionList({
  order,
  visibility,
  onOrderChange,
  onVisibilityChange,
}: SortableSectionListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      const oldIndex = order.indexOf(active.id as string)
      const newIndex = order.indexOf(over.id as string)
      onOrderChange(arrayMove(order, oldIndex, newIndex))
    }
  }

  const toggleVisibility = (id: string) => {
    onVisibilityChange({ ...visibility, [id]: !visibility[id] })
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={order} strategy={verticalListSortingStrategy}>
        <div className="space-y-1">
          {order.map((id) => (
            <SortableItem
              key={id}
              id={id}
              visible={visibility[id] !== false}
              onToggleVisibility={toggleVisibility}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}
```

**Step 2: Verify component compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/components/SortableSectionList.tsx
git commit -m "feat: add SortableSectionList component for drag-drop section ordering"
```

---

### Task 7: Update Theme Page with Layout Controls

**Files:**
- Modify: `src/routes/_dashboard/dashboard.theme.tsx`

**Step 1: Add imports and form fields**

At the top of the file, add:

```tsx
import { SortableSectionList } from '~/components/SortableSectionList'
```

**Step 2: Expand the form schema and default values**

Update the `useForm` call to include layout fields:

```tsx
const { register, handleSubmit, watch, formState: { errors, isDirty }, setValue } = useForm<Pick<ProfileUpdate, 'accent_color' | 'bg_color' | 'font_family' | 'template' | 'hero_style' | 'bio_layout' | 'section_order' | 'section_visibility'>>({
  resolver: zodResolver(profileUpdateSchema.pick({
    accent_color: true,
    bg_color: true,
    font_family: true,
    template: true,
    hero_style: true,
    bio_layout: true,
    section_order: true,
    section_visibility: true,
  }).partial()),
  defaultValues: {
    accent_color: initial?.accent_color || '#3b82f6',
    bg_color: initial?.bg_color || '#0a0a0f',
    font_family: initial?.font_family || 'Inter',
    template: (initial?.template as ProfileUpdate['template']) || 'default',
    hero_style: (initial?.hero_style as ProfileUpdate['hero_style']) || 'fullbleed',
    bio_layout: (initial?.bio_layout as ProfileUpdate['bio_layout']) || 'two-column',
    section_order: initial?.section_order || ['bio', 'music', 'events', 'technical', 'press', 'contact'],
    section_visibility: (initial?.section_visibility as Record<string, boolean>) || {},
  },
})
```

**Step 3: Add watchers for new fields**

After the existing watchers, add:

```tsx
const heroStyle = watch('hero_style') || 'fullbleed'
const bioLayout = watch('bio_layout') || 'two-column'
const sectionOrder = watch('section_order') || ['bio', 'music', 'events', 'technical', 'press', 'contact']
const sectionVisibility = watch('section_visibility') || {}
```

**Step 4: Update template onClick to set layout values**

Update the template button onClick handler to also set layout fields:

```tsx
onClick={() => {
  setValue('template', tpl.id as ProfileUpdate['template'], { shouldDirty: true })
  setValue('accent_color', tpl.defaults.accent_color, { shouldDirty: true })
  setValue('bg_color', tpl.defaults.bg_color, { shouldDirty: true })
  setValue('font_family', tpl.defaults.font_family, { shouldDirty: true })
  setValue('hero_style', tpl.heroStyle, { shouldDirty: true })
  setValue('bio_layout', tpl.bioLayout, { shouldDirty: true })
  setValue('section_order', tpl.sectionOrder, { shouldDirty: true })
  setValue('section_visibility', {}, { shouldDirty: true })
}}
```

**Step 5: Add Layout section UI**

After the existing grid (Colors & Fonts + Live Preview), add a new section before the closing `</form>`:

```tsx
{/* Layout Section */}
<div className="mt-8 border-t border-border pt-8">
  <h2 className="text-sm uppercase tracking-widest font-bold mb-6">Layout</h2>

  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
    {/* Hero Style */}
    <div>
      <label className={FORM_LABEL}>Hero Style</label>
      <div className="space-y-2">
        {(['fullbleed', 'contained', 'minimal'] as const).map((style) => (
          <label key={style} className="flex items-center gap-3 cursor-pointer">
            <input
              type="radio"
              value={style}
              checked={heroStyle === style}
              onChange={() => setValue('hero_style', style, { shouldDirty: true })}
              className="w-4 h-4 accent-accent"
            />
            <span className="text-sm capitalize">{style}</span>
          </label>
        ))}
      </div>
    </div>

    {/* Bio Layout */}
    <div>
      <label className={FORM_LABEL}>Bio Layout</label>
      <div className="space-y-2">
        {(['two-column', 'single-column'] as const).map((layout) => (
          <label key={layout} className="flex items-center gap-3 cursor-pointer">
            <input
              type="radio"
              value={layout}
              checked={bioLayout === layout}
              onChange={() => setValue('bio_layout', layout, { shouldDirty: true })}
              className="w-4 h-4 accent-accent"
            />
            <span className="text-sm">{layout === 'two-column' ? 'Two Column' : 'Single Column'}</span>
          </label>
        ))}
      </div>
    </div>

    {/* Section Order */}
    <div className="md:col-span-2 lg:col-span-1">
      <label className={FORM_LABEL}>Section Order</label>
      <SortableSectionList
        order={sectionOrder}
        visibility={sectionVisibility}
        onOrderChange={(newOrder) => setValue('section_order', newOrder, { shouldDirty: true })}
        onVisibilityChange={(newVis) => setValue('section_visibility', newVis, { shouldDirty: true })}
      />
    </div>
  </div>
</div>
```

**Step 6: Verify page compiles and loads**

Run: `npm run dev`
Navigate to `/dashboard/theme` and verify the Layout section appears.

**Step 7: Commit**

```bash
git add src/routes/_dashboard/dashboard.theme.tsx
git commit -m "feat: add layout controls to theme page"
```

---

### Task 8: Update Public Page Rendering

**Files:**
- Modify: `src/routes/$slug.tsx`

**Step 1: Read layout settings from profile**

In the `PublicEPK` component, after getting template config, read layout from profile:

Replace:
```tsx
const template = getTemplate(profile.template || 'default')
```

With:
```tsx
const templateConfig = getTemplate(profile.template || 'default')
// Layout settings from profile (with fallbacks to template defaults)
const heroStyle = profile.hero_style || templateConfig.heroStyle
const bioLayout = profile.bio_layout || templateConfig.bioLayout
const sectionOrder = profile.section_order || templateConfig.sectionOrder
const sectionVisibility = (profile.section_visibility || {}) as Record<string, boolean>
```

**Step 2: Update hero section to use heroStyle variable**

The hero section already references `template.heroStyle`. Update it to use the local `heroStyle` variable:

Replace:
```tsx
template.heroStyle === 'fullbleed'
template.heroStyle === 'contained'
template.heroStyle !== 'minimal'
```

With:
```tsx
heroStyle === 'fullbleed'
heroStyle === 'contained'
heroStyle !== 'minimal'
```

**Step 3: Filter sections by visibility**

Before the section render loop, filter out hidden sections:

```tsx
const visibleSections = sectionOrder.filter(
  (id) => sectionVisibility[id] !== false
)
```

Then update the render loop to use `visibleSections`:

Replace:
```tsx
{template.sectionOrder.map((sectionId) => {
```

With:
```tsx
{visibleSections.map((sectionId) => {
```

**Step 4: Implement two-column bio layout**

Update the bio section renderer to support two-column layout. Find the bio section in `sectionRenderers` and update it:

```tsx
bio: profile.bio || profile.short_bio ? (
  <EPKSection key="bio" id="bio" heading="Bio">
    <div className={bioLayout === 'two-column' && profile.profile_image_url ? 'grid md:grid-cols-[200px_1fr] gap-8 items-start' : ''}>
      {bioLayout === 'two-column' && profile.profile_image_url && (
        <img
          src={profile.profile_image_url}
          alt={profile.display_name || 'Artist'}
          className="w-full aspect-square object-cover"
        />
      )}
      <div>
        {profile.short_bio && (
          <p className={`text-lg leading-relaxed mb-6 ${textSecClass}`}>{profile.short_bio}</p>
        )}
        {profile.bio && (
          <BioContent
            bio={profile.bio as import('@editorjs/editorjs').OutputData}
            proseClass={proseClass}
            textSecClass={textSecClass}
            accentColor={accent}
          />
        )}
      </div>
    </div>
  </EPKSection>
) : null,
```

**Step 5: Update preview URL to pass layout params**

In the Theme page, update the iframe src to include layout params:

```tsx
src={`${previewUrl}?preview=true&accent=${encodeURIComponent(accentColor)}&bg=${encodeURIComponent(bgColor)}&font=${encodeURIComponent(fontFamily)}&hero=${heroStyle}&bioLayout=${bioLayout}&sections=${sectionOrder.filter(s => sectionVisibility[s] !== false).join(',')}`}
```

**Step 6: Update search validation to include new params**

In `$slug.tsx`, update `validateSearch`:

```tsx
validateSearch: (search: Record<string, unknown>) => ({
  preview: search.preview === 'true',
  accent: (search.accent as string) || undefined,
  bg: (search.bg as string) || undefined,
  font: (search.font as string) || undefined,
  hero: (search.hero as string) || undefined,
  bioLayout: (search.bioLayout as string) || undefined,
  sections: (search.sections as string) || undefined,
}),
```

**Step 7: Apply preview overrides for layout**

In `PublicEPK`, after the existing preview overrides, add layout overrides:

```tsx
const heroStyle = search.hero || profile.hero_style || templateConfig.heroStyle
const bioLayout = search.bioLayout || profile.bio_layout || templateConfig.bioLayout
const sectionOrder = search.sections
  ? search.sections.split(',')
  : profile.section_order || templateConfig.sectionOrder
```

**Step 8: Verify public page renders correctly**

Run: `npm run dev`
Test the public page with different layout settings.

**Step 9: Commit**

```bash
git add src/routes/$slug.tsx src/routes/_dashboard/dashboard.theme.tsx
git commit -m "feat: apply layout settings to public EPK page"
```

---

### Task 9: Manual Testing

**Step 1: Test template preset behavior**

1. Go to `/dashboard/theme`
2. Click each template card
3. Verify colors, fonts, AND layout settings all update
4. Save and verify public page reflects template layout

**Step 2: Test independent customization**

1. Select a template
2. Change just the hero style
3. Save
4. Verify only hero style changed on public page

**Step 3: Test section ordering**

1. Drag sections to reorder
2. Save
3. Verify public page sections appear in new order

**Step 4: Test section visibility**

1. Uncheck "Visible" for a section
2. Save
3. Verify section is hidden on public page
4. Re-enable and verify it reappears

**Step 5: Test bio layouts**

1. Set bio layout to "Two Column"
2. Ensure profile has a profile image
3. Save
4. Verify bio shows image on left, text on right

**Step 6: Commit any fixes**

If any issues found, fix and commit.

---

### Task 10: Final Cleanup and Commit

**Step 1: Run type check**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 2: Run linter (if configured)**

Run: `npm run lint` (if available)
Expected: No errors

**Step 3: Final commit**

```bash
git add -A
git commit -m "feat: complete layout customization feature

- Add section ordering with drag-and-drop
- Add section visibility toggles
- Add hero style selection (fullbleed/contained/minimal)
- Add bio layout selection (two-column/single-column)
- Templates now act as presets for all settings"
```

---

**Plan complete and saved.** Two execution options:

**1. Subagent-Driven (this session)** — I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** — Open new session with executing-plans, batch execution with checkpoints

Which approach?
