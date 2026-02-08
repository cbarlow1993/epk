# What to Do Next — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a phased "What to do next" dashboard page that guides users through completing, promoting, and leveling up their EPK.

**Architecture:** New dashboard route at `/dashboard/next` with a dedicated server function that computes checklist state from existing profile/relation data plus a new `checklist_progress` JSONB column for manual checkoff items. Sidebar updated with a new nav entry and conditional badge.

**Tech Stack:** TanStack Start server functions, Supabase Postgres (migration), React, Tailwind CSS v4, Zod

---

### Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/20260207000000_add_checklist_progress.sql`

**Step 1: Create the migration file**

```sql
ALTER TABLE profiles
ADD COLUMN checklist_progress jsonb DEFAULT '{}'::jsonb;
```

**Step 2: Push the migration**

Run: `npx supabase db push`
Expected: Migration applied successfully.

**Step 3: Update TypeScript types**

Modify: `src/types/database.ts` — add to `ProfileRow`:

```ts
checklist_progress: Record<string, boolean> | null
```

Add it after `press_kit_url` (line 29), before `template`.

**Step 4: Update allowed fields in server**

Modify: `src/server/profile.ts` — add `'checklist_progress'` to `ALLOWED_PROFILE_FIELDS` Set.

**Step 5: Update profile schema**

Modify: `src/schemas/profile.ts` — add to `profileUpdateSchema`:

```ts
checklist_progress: z.record(z.string(), z.boolean()).optional(),
```

**Step 6: Commit**

```bash
git add supabase/migrations/20260207000000_add_checklist_progress.sql src/types/database.ts src/server/profile.ts src/schemas/profile.ts
git commit -m "feat: add checklist_progress column to profiles"
```

---

### Task 2: Server Function — Checklist Loader

**Files:**
- Create: `src/server/checklist.ts`

**Step 1: Create the server function**

Create `src/server/checklist.ts` with a `getChecklistState` server function:

```ts
import { createServerFn } from '@tanstack/react-start'
import { withAuthOrNull } from './utils'

export interface ChecklistState {
  // Phase 1: Complete your EPK
  has_display_name: boolean
  has_profile_image: boolean
  has_bio: boolean
  has_hero_image: boolean
  has_mixes: boolean
  has_contact: boolean
  has_socials: boolean
  // Phase 2: Go live & share
  is_published: boolean
  has_social_preview: boolean
  shared_social: boolean      // manual
  added_to_bio: boolean       // manual
  sent_to_promoter: boolean   // manual
  // Phase 3: Level up
  has_custom_domain: boolean
  added_to_email_sig: boolean // manual
  included_in_demo: boolean   // manual
  has_custom_theme: boolean
}

const MANUAL_KEYS = ['shared_social', 'added_to_bio', 'sent_to_promoter', 'added_to_email_sig', 'included_in_demo'] as const

export const getChecklistState = createServerFn({ method: 'GET' }).handler(async (): Promise<ChecklistState | null> => {
  const { supabase, user } = await withAuthOrNull()
  if (!user) return null

  // Fetch profile + counts in parallel
  const [profileResult, mixesResult, socialsResult, contactResult] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('mixes').select('id', { count: 'exact', head: true }).eq('profile_id', user.id),
    supabase.from('social_links').select('id', { count: 'exact', head: true }).eq('profile_id', user.id),
    supabase.from('booking_contact').select('email, phone').eq('profile_id', user.id).single(),
  ])

  const profile = profileResult.data
  if (!profile) return null

  const manualProgress: Record<string, boolean> = (profile.checklist_progress as Record<string, boolean>) || {}

  return {
    // Phase 1
    has_display_name: !!profile.display_name?.trim(),
    has_profile_image: !!profile.profile_image_url,
    has_bio: !!(profile.bio || profile.short_bio),
    has_hero_image: !!profile.hero_image_url,
    has_mixes: (mixesResult.count ?? 0) > 0,
    has_contact: !!(contactResult.data?.email || contactResult.data?.phone),
    has_socials: (socialsResult.count ?? 0) > 0,
    // Phase 2
    is_published: profile.published,
    has_social_preview: !!(profile.og_title || profile.og_image_url),
    shared_social: !!manualProgress.shared_social,
    added_to_bio: !!manualProgress.added_to_bio,
    sent_to_promoter: !!manualProgress.sent_to_promoter,
    // Phase 3
    has_custom_domain: !!profile.custom_domain,
    added_to_email_sig: !!manualProgress.added_to_email_sig,
    included_in_demo: !!manualProgress.included_in_demo,
    has_custom_theme: profile.template !== 'default' || profile.accent_color !== null,
  }
})
```

**Step 2: Create the toggle mutation**

Add to the same file `src/server/checklist.ts`:

```ts
import { z } from 'zod'
import { withAuth } from './utils'

const toggleChecklistItemSchema = z.object({
  key: z.enum(['shared_social', 'added_to_bio', 'sent_to_promoter', 'added_to_email_sig', 'included_in_demo']),
  checked: z.boolean(),
})

export const toggleChecklistItem = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => toggleChecklistItemSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabase, user } = await withAuth()

    // Read current progress
    const { data: profile } = await supabase
      .from('profiles')
      .select('checklist_progress')
      .eq('id', user.id)
      .single()

    const current: Record<string, boolean> = (profile?.checklist_progress as Record<string, boolean>) || {}
    const updated = { ...current, [data.key]: data.checked }

    const { error } = await supabase
      .from('profiles')
      .update({ checklist_progress: updated })
      .eq('id', user.id)

    if (error) return { error: error.message }
    return { data: updated }
  })
```

**Step 3: Commit**

```bash
git add src/server/checklist.ts
git commit -m "feat: add checklist state loader and toggle mutation"
```

---

### Task 3: Dashboard Route — What to Do Next Page

**Files:**
- Create: `src/routes/_dashboard/dashboard.next.tsx`

**Step 1: Create the route file**

Create `src/routes/_dashboard/dashboard.next.tsx`:

```tsx
import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { getChecklistState, toggleChecklistItem, type ChecklistState } from '~/server/checklist'

export const Route = createFileRoute('/_dashboard/dashboard/next')({
  loader: () => getChecklistState(),
  component: WhatToDoNext,
})

interface ChecklistItem {
  key: keyof ChecklistState
  label: string
  description: string
  type: 'auto' | 'manual'
  link?: string // dashboard page link for auto items
}

const PHASES: { title: string; items: ChecklistItem[] }[] = [
  {
    title: 'Complete your EPK',
    items: [
      { key: 'has_display_name', label: 'Add a display name', description: 'Set your artist name so people know who you are.', type: 'auto', link: '/dashboard' },
      { key: 'has_profile_image', label: 'Upload a profile photo', description: 'A professional photo makes your EPK stand out.', type: 'auto', link: '/dashboard/bio' },
      { key: 'has_bio', label: 'Write your bio', description: 'Tell promoters and fans your story.', type: 'auto', link: '/dashboard/bio' },
      { key: 'has_hero_image', label: 'Upload a hero image', description: 'The first thing visitors see on your page.', type: 'auto', link: '/dashboard/hero' },
      { key: 'has_mixes', label: 'Add at least one mix', description: 'Showcase your sound with a mix or track.', type: 'auto', link: '/dashboard/music' },
      { key: 'has_contact', label: 'Add your contact info', description: 'Let promoters know how to book you.', type: 'auto', link: '/dashboard/contact' },
      { key: 'has_socials', label: 'Add your social links', description: 'Connect your Instagram, SoundCloud, and more.', type: 'auto', link: '/dashboard/socials' },
    ],
  },
  {
    title: 'Go live & share',
    items: [
      { key: 'is_published', label: 'Publish your EPK', description: 'Flip the switch in the sidebar to make your page live.', type: 'auto' },
      { key: 'has_social_preview', label: 'Set up your social preview', description: 'Control how your link looks when shared on social media.', type: 'auto', link: '/dashboard/social-preview' },
      { key: 'shared_social', label: 'Share your EPK on social media', description: 'Post your EPK link on Instagram, Twitter, or Facebook.', type: 'manual' },
      { key: 'added_to_bio', label: 'Add your EPK link to your bio/Linktree', description: 'Make your EPK easy to find from your social profiles.', type: 'manual' },
      { key: 'sent_to_promoter', label: 'Send your EPK to a promoter or venue', description: 'Email your link to someone who books shows.', type: 'manual' },
    ],
  },
  {
    title: 'Level up',
    items: [
      { key: 'has_custom_domain', label: 'Set up a custom domain', description: 'Use your own domain for a professional look.', type: 'auto', link: '/dashboard/settings' },
      { key: 'added_to_email_sig', label: 'Add your EPK to your email signature', description: 'Every email becomes a chance to share your work.', type: 'manual' },
      { key: 'included_in_demo', label: 'Include your EPK in a demo submission', description: 'Attach your EPK link when sending demos to labels.', type: 'manual' },
      { key: 'has_custom_theme', label: 'Choose a theme that fits your brand', description: 'Customise colors and fonts to match your identity.', type: 'auto', link: '/dashboard/theme' },
    ],
  },
]

function WhatToDoNext() {
  const initialState = Route.useLoaderData()
  const [state, setState] = useState<ChecklistState>(initialState!)

  const handleToggle = async (key: keyof ChecklistState, checked: boolean) => {
    // Optimistic update
    setState((prev) => ({ ...prev, [key]: checked }))
    const result = await toggleChecklistItem({ data: { key: key as any, checked } })
    if ('error' in result) {
      // Revert on error
      setState((prev) => ({ ...prev, [key]: !checked }))
    }
  }

  // Find the earliest phase that's not fully complete
  const focusPhaseIndex = PHASES.findIndex((phase) =>
    phase.items.some((item) => !state[item.key])
  )

  return (
    <div>
      <div className="mb-8 pb-6 border-b border-border">
        <h1 className="font-display font-extrabold text-2xl tracking-tight uppercase">What to do next</h1>
        <p className="text-sm text-text-secondary mt-1">Make the most of your EPK with these steps.</p>
      </div>

      <div className="space-y-6 max-w-2xl">
        {PHASES.map((phase, phaseIndex) => {
          const completed = phase.items.filter((item) => state[item.key]).length
          const total = phase.items.length
          const isFullyComplete = completed === total
          const isFocus = phaseIndex === focusPhaseIndex
          const isPastFocus = focusPhaseIndex !== -1 && phaseIndex > focusPhaseIndex

          return (
            <PhaseCard
              key={phaseIndex}
              phaseNumber={phaseIndex + 1}
              title={phase.title}
              items={phase.items}
              state={state}
              completed={completed}
              total={total}
              isFullyComplete={isFullyComplete}
              defaultExpanded={isFocus || (focusPhaseIndex === -1)}
              muted={isPastFocus}
              onToggle={handleToggle}
            />
          )
        })}
      </div>
    </div>
  )
}

function PhaseCard({
  phaseNumber,
  title,
  items,
  state,
  completed,
  total,
  isFullyComplete,
  defaultExpanded,
  muted,
  onToggle,
}: {
  phaseNumber: number
  title: string
  items: ChecklistItem[]
  state: ChecklistState
  completed: number
  total: number
  isFullyComplete: boolean
  defaultExpanded: boolean
  muted: boolean
  onToggle: (key: keyof ChecklistState, checked: boolean) => void
}) {
  const [expanded, setExpanded] = useState(defaultExpanded)

  return (
    <div className={`border border-border transition-opacity ${muted ? 'opacity-60' : ''}`}>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-6 py-4 text-left"
      >
        <div className="flex items-center gap-3">
          {isFullyComplete ? (
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-green-500 text-white text-xs">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
            </span>
          ) : (
            <span className="flex items-center justify-center w-6 h-6 rounded-full border-2 border-border text-xs font-bold text-text-secondary">
              {phaseNumber}
            </span>
          )}
          <span className="font-display font-bold text-sm uppercase tracking-wider">{title}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-text-secondary font-medium">{completed}/{total}</span>
          <div className="w-20 h-1.5 bg-border rounded-full overflow-hidden">
            <div
              className="h-full bg-accent rounded-full transition-all"
              style={{ width: `${(completed / total) * 100}%` }}
            />
          </div>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className={`transition-transform ${expanded ? 'rotate-180' : ''}`}
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </div>
      </button>

      {expanded && (
        <div className="px-6 pb-4 space-y-1">
          {items.map((item) => {
            const checked = state[item.key]
            const isManual = item.type === 'manual'

            return (
              <div key={item.key} className="flex items-start gap-3 py-2">
                {isManual ? (
                  <button
                    type="button"
                    onClick={() => onToggle(item.key, !checked)}
                    className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded border-2 transition-colors flex items-center justify-center ${
                      checked ? 'bg-accent border-accent' : 'border-border hover:border-accent/50'
                    }`}
                    aria-label={checked ? `Uncheck: ${item.label}` : `Check: ${item.label}`}
                  >
                    {checked && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                    )}
                  </button>
                ) : (
                  <span className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center ${
                    checked ? 'bg-accent border-accent' : 'border-border'
                  }`}>
                    {checked && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                    )}
                  </span>
                )}
                <div className="flex-1 min-w-0">
                  {!checked && item.link ? (
                    <Link to={item.link} className="text-sm font-medium text-text-primary hover:text-accent transition-colors">
                      {item.label}
                    </Link>
                  ) : (
                    <span className={`text-sm font-medium ${checked ? 'text-text-secondary line-through' : 'text-text-primary'}`}>
                      {item.label}
                    </span>
                  )}
                  <p className={`text-xs mt-0.5 ${checked ? 'text-text-secondary/50' : 'text-text-secondary'}`}>
                    {item.description}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/routes/_dashboard/dashboard.next.tsx
git commit -m "feat: add What to do next dashboard page"
```

---

### Task 4: Sidebar — Add Nav Entry with Badge

**Files:**
- Modify: `src/components/DashboardSidebar.tsx`

**Step 1: Add the nav item**

In `DashboardSidebar.tsx`, insert a new item as the second entry in `NAV_ITEMS`:

```ts
const NAV_ITEMS = [
  { label: 'Profile', href: '/dashboard' },
  { label: 'What to do next', href: '/dashboard/next' },
  // ... rest unchanged
]
```

**Step 2: Add badge support**

The sidebar needs to know if Phase 1 has incomplete items. Rather than adding a separate loader to the layout, we'll keep this simple: the sidebar receives a `showNextBadge` prop, and the `_dashboard.tsx` layout passes it.

In `DashboardSidebar.tsx`:

1. Add `showNextBadge?: boolean` to the component props.
2. In the nav item rendering, add a conditional dot after "What to do next":

```tsx
<Link key={item.href} to={item.href} ...>
  {item.label}
  {item.href === '/dashboard/next' && showNextBadge && (
    <span className="ml-2 inline-block w-2 h-2 rounded-full bg-accent" />
  )}
</Link>
```

**Step 3: Update the dashboard layout to compute the badge**

Modify: `src/routes/_dashboard.tsx`

Import `getChecklistState` and call it in the `beforeLoad` alongside `getCurrentUser`. Use the Phase 1 keys to determine if the badge should show.

```ts
import { getChecklistState } from '~/server/checklist'

// In beforeLoad, after getting user/profile:
const checklist = await getChecklistState()
const phase1Keys = ['has_display_name', 'has_profile_image', 'has_bio', 'has_hero_image', 'has_mixes', 'has_contact', 'has_socials'] as const
const showNextBadge = checklist ? phase1Keys.some((k) => !checklist[k]) : false

return { user: result.user, profile: result.profile, showNextBadge }
```

Then in `DashboardLayout`, pass `showNextBadge` to `<DashboardSidebar>`:

```tsx
const { profile, showNextBadge } = Route.useRouteContext()
// ...
<DashboardSidebar profile={safeProfile} showNextBadge={showNextBadge} />
```

**Step 4: Commit**

```bash
git add src/components/DashboardSidebar.tsx src/routes/_dashboard.tsx
git commit -m "feat: add What to do next to sidebar with Phase 1 badge"
```

---

### Task 5: Manual Testing

**Step 1: Start dev server**

Run: `npm run dev`

**Step 2: Verify the page**

1. Navigate to `/dashboard/next`
2. Confirm three phase cards render with correct items
3. Confirm auto-detected items reflect actual profile state (filled checkboxes for things you've done)
4. Click a manual checkbox — confirm it toggles and persists on page refresh
5. Confirm incomplete auto items link to the correct dashboard pages
6. Confirm phase expansion/collapse works (focus phase expanded, later ones collapsed)

**Step 3: Verify the sidebar**

1. Confirm "What to do next" appears as second sidebar item
2. Confirm dot badge shows when Phase 1 is incomplete
3. Complete all Phase 1 items — confirm badge disappears

**Step 4: Verify build**

Run: `npm run build`
Expected: Build succeeds with no TypeScript errors.

**Step 5: Commit any fixes**

```bash
git add -A
git commit -m "fix: address issues found in manual testing"
```
