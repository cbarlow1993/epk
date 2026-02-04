# Phase 1: Complete MVP v1.0 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Complete the remaining MVP features: Tiptap WYSIWYG editor, music embeds (oEmbed), public booking request form with inquiry tracking, password reset, OAuth providers, and genre/BPM improvements.

**Architecture:** Tiptap replaces plain textareas for bio + rider. oEmbed resolution happens server-side. Booking requests use a new DB table with public insert RLS. Auth flows use Supabase built-in features.

**Tech Stack:** Tiptap (new), sanitize-html (new), Supabase Auth (OAuth + password reset), Resend (from Phase 0)

**Depends on:** Phase 0 (email service for booking notifications)

---

## Task 1: Install Tiptap Dependencies

**Step 1: Install packages**

```bash
npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-link @tiptap/extension-placeholder sanitize-html
npm install -D @types/sanitize-html
```

**Step 2: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install Tiptap editor and sanitize-html dependencies"
```

---

## Task 2: Create TiptapEditor Component

**Files:**
- Create: `src/components/forms/TiptapEditor.tsx`
- Modify: `src/components/forms/index.ts`

**Step 1: Create the editor component**

```tsx
// src/components/forms/TiptapEditor.tsx
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import { useCallback, useEffect } from 'react'

interface TiptapEditorProps {
  label: string
  content: string
  onChange: (html: string) => void
  placeholder?: string
}

function ToolbarButton({ onClick, active, children, title }: {
  onClick: () => void
  active?: boolean
  children: React.ReactNode
  title: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`px-2 py-1 rounded text-xs font-bold transition-colors ${
        active
          ? 'bg-accent text-black'
          : 'text-text-secondary hover:text-white hover:bg-white/10'
      }`}
    >
      {children}
    </button>
  )
}

export function TiptapEditor({ label, content, onChange, placeholder }: TiptapEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: 'text-accent underline' },
      }),
      Placeholder.configure({
        placeholder: placeholder || 'Start writing...',
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
  })

  // Sync external content changes (e.g., form reset)
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content)
    }
  }, [content, editor])

  const setLink = useCallback(() => {
    if (!editor) return
    const previousUrl = editor.getAttributes('link').href
    const url = window.prompt('URL', previousUrl)
    if (url === null) return
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }, [editor])

  if (!editor) return null

  return (
    <div>
      <label className="block text-sm uppercase tracking-widest font-bold mb-2">{label}</label>
      <div className="border border-white/10 rounded-lg overflow-hidden bg-dark-card">
        {/* Toolbar */}
        <div className="flex flex-wrap gap-1 px-3 py-2 border-b border-white/10 bg-dark-surface/50">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            active={editor.isActive('heading', { level: 2 })}
            title="Heading 2"
          >
            H2
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            active={editor.isActive('heading', { level: 3 })}
            title="Heading 3"
          >
            H3
          </ToolbarButton>
          <div className="w-px bg-white/10 mx-1" />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            active={editor.isActive('bold')}
            title="Bold"
          >
            B
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            active={editor.isActive('italic')}
            title="Italic"
          >
            I
          </ToolbarButton>
          <div className="w-px bg-white/10 mx-1" />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            active={editor.isActive('bulletList')}
            title="Bullet List"
          >
            List
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            active={editor.isActive('orderedList')}
            title="Ordered List"
          >
            1.
          </ToolbarButton>
          <div className="w-px bg-white/10 mx-1" />
          <ToolbarButton
            onClick={setLink}
            active={editor.isActive('link')}
            title="Link"
          >
            Link
          </ToolbarButton>
        </div>
        {/* Editor */}
        <EditorContent
          editor={editor}
          className="prose prose-invert prose-sm max-w-none px-4 py-3 min-h-[200px] focus-within:ring-1 focus-within:ring-accent [&_.tiptap]:outline-none [&_.tiptap]:min-h-[180px] [&_.tiptap_p.is-editor-empty:first-child::before]:text-text-secondary/50 [&_.tiptap_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.tiptap_p.is-editor-empty:first-child::before]:float-left [&_.tiptap_p.is-editor-empty:first-child::before]:h-0 [&_.tiptap_p.is-editor-empty:first-child::before]:pointer-events-none"
        />
      </div>
    </div>
  )
}
```

**Step 2: Export from barrel**

In `src/components/forms/index.ts`, add:

```typescript
export { TiptapEditor } from './TiptapEditor'
```

**Step 3: Commit**

```bash
git add src/components/forms/TiptapEditor.tsx src/components/forms/index.ts
git commit -m "feat: add TiptapEditor WYSIWYG component with toolbar"
```

---

## Task 3: Replace Bio Textareas with Tiptap

**Files:**
- Modify: `src/routes/_dashboard/dashboard.bio.tsx`
- Modify: `src/schemas/profile.ts:27-28`

**Step 1: Update schema character limits**

In `src/schemas/profile.ts`, update the bio fields from 5000 to 10000 (HTML markup is more verbose):

```typescript
  bio_left: z.string().max(10000, 'Max 10000 characters').optional(),
  bio_right: z.string().max(10000, 'Max 10000 characters').optional(),
```

**Step 2: Rewrite dashboard.bio.tsx**

Replace the entire file:

```tsx
// src/routes/_dashboard/dashboard.bio.tsx
import { createFileRoute } from '@tanstack/react-router'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { getProfile, updateProfile } from '~/server/profile'
import { profileUpdateSchema, type ProfileUpdate } from '~/schemas/profile'
import { TiptapEditor } from '~/components/forms'
import { useDashboardSave } from '~/hooks/useDashboardSave'
import { DashboardHeader } from '~/components/DashboardHeader'

export const Route = createFileRoute('/_dashboard/dashboard/bio')({
  loader: () => getProfile(),
  component: BioEditor,
})

function BioEditor() {
  const initialProfile = Route.useLoaderData()
  const { saving, saved, error, onSave: save } = useDashboardSave(updateProfile)

  const { control, handleSubmit, formState: { errors, isDirty } } = useForm<Pick<ProfileUpdate, 'bio_left' | 'bio_right'>>({
    resolver: zodResolver(profileUpdateSchema.pick({ bio_left: true, bio_right: true }).partial()),
    defaultValues: {
      bio_left: initialProfile?.bio_left || '',
      bio_right: initialProfile?.bio_right || '',
    },
  })

  const onSave = handleSubmit(save)

  return (
    <form onSubmit={onSave}>
      <DashboardHeader title="Bio" saving={saving} saved={saved} error={error} isDirty={isDirty} />

      <div className="grid md:grid-cols-2 gap-6">
        <Controller
          name="bio_left"
          control={control}
          render={({ field }) => (
            <TiptapEditor
              label="Left Column"
              content={field.value || ''}
              onChange={field.onChange}
              placeholder="First half of your bio..."
            />
          )}
        />
        <Controller
          name="bio_right"
          control={control}
          render={({ field }) => (
            <TiptapEditor
              label="Right Column"
              content={field.value || ''}
              onChange={field.onChange}
              placeholder="Second half of your bio..."
            />
          )}
        />
      </div>
    </form>
  )
}
```

**Step 3: Commit**

```bash
git add src/routes/_dashboard/dashboard.bio.tsx src/schemas/profile.ts
git commit -m "feat: replace bio textareas with Tiptap WYSIWYG editor"
```

---

## Task 4: Replace Technical Rider Textareas with Tiptap

**Files:**
- Modify: `src/routes/_dashboard/dashboard.technical.tsx`
- Modify: `src/schemas/technical-rider.ts`

**Step 1: Update schema character limits**

In `src/schemas/technical-rider.ts`, update limits from 2000 to 5000:

```typescript
export const technicalRiderUpdateSchema = z.object({
  preferred_setup: z.string().max(5000, 'Max 5000 characters').optional(),
  alternative_setup: z.string().max(5000, 'Max 5000 characters').optional(),
})
```

**Step 2: Rewrite dashboard.technical.tsx**

Replace the entire file:

```tsx
// src/routes/_dashboard/dashboard.technical.tsx
import { createFileRoute } from '@tanstack/react-router'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { getTechnicalRider, updateTechnicalRider } from '~/server/technical-rider'
import { technicalRiderUpdateSchema, type TechnicalRiderUpdate } from '~/schemas/technical-rider'
import { TiptapEditor } from '~/components/forms'
import { useDashboardSave } from '~/hooks/useDashboardSave'
import { DashboardHeader } from '~/components/DashboardHeader'

export const Route = createFileRoute('/_dashboard/dashboard/technical')({
  loader: () => getTechnicalRider(),
  component: TechnicalRiderEditor,
})

function TechnicalRiderEditor() {
  const initialData = Route.useLoaderData()
  const { saving, saved, error, onSave: save } = useDashboardSave(updateTechnicalRider)

  const { control, handleSubmit, formState: { errors, isDirty } } = useForm<TechnicalRiderUpdate>({
    resolver: zodResolver(technicalRiderUpdateSchema),
    defaultValues: {
      preferred_setup: initialData?.preferred_setup || '',
      alternative_setup: initialData?.alternative_setup || '',
    },
  })

  const onSave = handleSubmit(save)

  return (
    <form onSubmit={onSave}>
      <DashboardHeader title="Technical Rider" saving={saving} saved={saved} error={error} isDirty={isDirty} />

      <div className="space-y-6">
        <Controller
          name="preferred_setup"
          control={control}
          render={({ field }) => (
            <TiptapEditor
              label="Preferred Setup"
              content={field.value || ''}
              onChange={field.onChange}
              placeholder="e.g. 2 x CDJ-3000, 1 x DJM-900NXS2..."
            />
          )}
        />
        <Controller
          name="alternative_setup"
          control={control}
          render={({ field }) => (
            <TiptapEditor
              label="Alternative Setup"
              content={field.value || ''}
              onChange={field.onChange}
              placeholder="e.g. 2 x CDJ-2000NXS2..."
            />
          )}
        />
      </div>
    </form>
  )
}
```

**Step 3: Commit**

```bash
git add src/routes/_dashboard/dashboard.technical.tsx src/schemas/technical-rider.ts
git commit -m "feat: replace technical rider textareas with Tiptap WYSIWYG editor"
```

---

## Task 5: Sanitize HTML on Public EPK Page

**Files:**
- Modify: `src/routes/$slug.tsx`

The bio and technical rider now contain HTML from Tiptap. The public page must sanitize before rendering.

**Step 1: Add sanitize helper**

Create `src/utils/sanitize.ts`:

```typescript
// src/utils/sanitize.ts
import sanitizeHtml from 'sanitize-html'

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ['h2', 'h3', 'p', 'br', 'strong', 'em', 'a', 'ul', 'ol', 'li'],
  allowedAttributes: {
    a: ['href', 'target', 'rel'],
  },
  transformTags: {
    a: sanitizeHtml.simpleTransform('a', { target: '_blank', rel: 'noopener noreferrer' }),
  },
}

export function sanitize(html: string): string {
  return sanitizeHtml(html, SANITIZE_OPTIONS)
}
```

**Step 2: Update bio section in $slug.tsx**

Replace the bio section (lines 128-135) with:

```tsx
        {/* Bio */}
        {(profile.bio_left || profile.bio_right) && (
          <EPKSection id="bio" heading="Bio">
            <div className="grid md:grid-cols-2 gap-8 md:gap-12 text-text-secondary leading-relaxed">
              {profile.bio_left && (
                <div
                  className="prose prose-invert prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: sanitize(profile.bio_left) }}
                />
              )}
              {profile.bio_right && (
                <div
                  className="prose prose-invert prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: sanitize(profile.bio_right) }}
                />
              )}
            </div>
          </EPKSection>
        )}
```

**Step 3: Update technical rider section in $slug.tsx**

Replace the technical rider content divs (lines 199 and 205) that use `whitespace-pre-line` with:

```tsx
                  <div
                    className="text-text-secondary text-sm leading-relaxed prose prose-invert prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: sanitize(technicalRider.preferred_setup) }}
                  />
```

And similarly for `alternative_setup`.

**Step 4: Add import at top of $slug.tsx**

```typescript
import { sanitize } from '~/utils/sanitize'
```

**Step 5: Commit**

```bash
git add src/utils/sanitize.ts src/routes/\$slug.tsx
git commit -m "feat: sanitize Tiptap HTML output on public EPK page"
```

---

## Task 6: Music Embeds - Database Migration

**Files:**
- Modify: `supabase/schema.sql`
- Modify: `src/types/database.ts:28-37`
- Modify: `src/schemas/mix.ts`

**Step 1: Add platform column to mixes**

Append to `supabase/schema.sql`:

```sql
-- Migration: Add platform column to mixes for oEmbed support
ALTER TABLE mixes ADD COLUMN IF NOT EXISTS platform TEXT;
ALTER TABLE mixes ADD COLUMN IF NOT EXISTS embed_html TEXT;
```

**Step 2: Update MixRow type**

In `src/types/database.ts`, add to `MixRow`:

```typescript
  platform: string | null
  embed_html: string | null
```

**Step 3: Update mix schema**

In `src/schemas/mix.ts`:

```typescript
import { z } from 'zod'

export const MIX_CATEGORIES = [
  'commercial', 'melodic', 'progressive', 'tech-house', 'deep-house', 'other',
] as const

export const SUPPORTED_PLATFORMS = [
  'soundcloud', 'spotify', 'mixcloud', 'youtube', 'bandcamp', 'other',
] as const

export const mixUpsertSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1, 'Title is required').max(200, 'Max 200 characters'),
  url: z.string().url('Must be a valid URL'),
  category: z.enum(MIX_CATEGORIES, { message: 'Select a valid category' }),
  thumbnail_url: z.string().url().optional(),
  platform: z.string().nullable().optional(),
  embed_html: z.string().nullable().optional(),
  sort_order: z.number().int().min(0).optional(),
})

export type MixUpsert = z.infer<typeof mixUpsertSchema>
```

**Step 4: Run migration and commit**

```bash
npm run db:migrate
git add supabase/schema.sql src/types/database.ts src/schemas/mix.ts
git commit -m "feat: add platform and embed_html columns to mixes table"
```

---

## Task 7: Music Embeds - oEmbed Server Function

**Files:**
- Create: `src/server/oembed.ts`

**Step 1: Create oEmbed resolver**

```typescript
// src/server/oembed.ts
import { createServerFn } from '@tanstack/react-start'

interface OEmbedResult {
  platform: string
  embedHtml: string | null
}

const PLATFORM_PATTERNS: [RegExp, string, string][] = [
  [/soundcloud\.com/, 'soundcloud', 'https://soundcloud.com/oembed?format=json&url='],
  [/open\.spotify\.com/, 'spotify', 'https://open.spotify.com/oembed?url='],
  [/mixcloud\.com/, 'mixcloud', 'https://www.mixcloud.com/oembed/?format=json&url='],
  [/(youtube\.com|youtu\.be)/, 'youtube', 'https://www.youtube.com/oembed?format=json&url='],
  [/bandcamp\.com/, 'bandcamp', ''],
]

function detectPlatform(url: string): { platform: string; oembedEndpoint: string } | null {
  for (const [pattern, platform, endpoint] of PLATFORM_PATTERNS) {
    if (pattern.test(url)) return { platform, oembedEndpoint: endpoint }
  }
  return null
}

export const resolveEmbed = createServerFn({ method: 'POST' })
  .inputValidator((data: { url: string }) => data)
  .handler(async ({ data: { url } }): Promise<OEmbedResult> => {
    const detected = detectPlatform(url)
    if (!detected) return { platform: 'other', embedHtml: null }

    const { platform, oembedEndpoint } = detected

    // Bandcamp doesn't support oEmbed — return platform only
    if (platform === 'bandcamp') {
      return { platform, embedHtml: null }
    }

    try {
      const response = await fetch(`${oembedEndpoint}${encodeURIComponent(url)}`)
      if (!response.ok) return { platform, embedHtml: null }

      const data = await response.json()
      return { platform, embedHtml: data.html || null }
    } catch {
      return { platform, embedHtml: null }
    }
  })
```

**Step 2: Commit**

```bash
git add src/server/oembed.ts
git commit -m "feat: add oEmbed resolution server function for music platforms"
```

---

## Task 8: Music Embeds - Update Dashboard Music Page

**Files:**
- Modify: `src/routes/_dashboard/dashboard.music.tsx`

**Step 1: Update the add form to resolve embeds on URL paste**

The key changes to `dashboard.music.tsx`:

1. Import `resolveEmbed` from `~/server/oembed`
2. After user submits a mix, call `resolveEmbed` with the URL to detect platform and get embed HTML
3. Pass `platform` and `embed_html` to the `upsertMix` call
4. Show platform badge on mix items

Replace the `onAdd` handler (around line 36-44):

```tsx
  const onAdd = handleSubmit(async (data) => {
    setAdding(true)
    // Resolve embed before saving
    const embed = await resolveEmbed({ data: { url: data.url } })
    const result = await upsertMix({
      data: {
        ...data,
        platform: embed.platform,
        embed_html: embed.embedHtml,
        sort_order: mixes.length,
      },
    })
    if ('mix' in result && result.mix) {
      addItem(result.mix)
      reset()
    }
    setAdding(false)
  })
```

Also update `handleSaveEdit` similarly to re-resolve embed when URL changes.

Add import at top:

```typescript
import { resolveEmbed } from '~/server/oembed'
```

**Step 2: Commit**

```bash
git add src/routes/_dashboard/dashboard.music.tsx
git commit -m "feat: resolve oEmbed data when adding/editing mixes"
```

---

## Task 9: Music Embeds - Render on Public EPK

**Files:**
- Modify: `src/routes/$slug.tsx` (mixes section, around lines 137-163)

**Step 1: Replace mix link cards with embed players**

Replace the mix card rendering (inside the `categoryMixes.map`) with:

```tsx
                  {categoryMixes.map((mix) => (
                    <div key={mix.id} className="bg-dark-card border border-white/5 rounded-lg overflow-hidden">
                      {mix.embed_html ? (
                        <div
                          className="w-full [&_iframe]:w-full [&_iframe]:rounded-none"
                          dangerouslySetInnerHTML={{ __html: mix.embed_html }}
                        />
                      ) : (
                        <a
                          href={mix.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block p-4 hover:border-accent/30 transition-colors"
                        >
                          <p className="font-bold text-sm mb-1">{mix.title}</p>
                          <p className="text-xs text-text-secondary truncate">{mix.url}</p>
                        </a>
                      )}
                    </div>
                  ))}
```

**Note:** The `embed_html` from oEmbed providers (SoundCloud, Spotify, etc.) is generally safe since it only contains iframes pointing to their domains. However, it was fetched server-side from trusted oEmbed endpoints, not from user input.

**Step 2: Commit**

```bash
git add src/routes/\$slug.tsx
git commit -m "feat: render oEmbed players for mixes on public EPK page"
```

---

## Task 10: Booking Requests - Database Table

**Files:**
- Modify: `supabase/schema.sql`
- Modify: `src/types/database.ts`

**Step 1: Add booking_requests table**

Append to `supabase/schema.sql`:

```sql
-- Booking requests (public inquiry form)
CREATE TABLE booking_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  event_name TEXT DEFAULT '',
  event_date DATE,
  venue_location TEXT DEFAULT '',
  budget_range TEXT DEFAULT '',
  message TEXT NOT NULL,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'read', 'replied', 'archived')),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE booking_requests ENABLE ROW LEVEL SECURITY;

-- Anyone can insert a booking request (public form)
CREATE POLICY "Public can submit booking requests" ON booking_requests
  FOR INSERT WITH CHECK (true);

-- Only the profile owner can read/update their booking requests
CREATE POLICY "Owner can view booking requests" ON booking_requests
  FOR SELECT USING (is_profile_owner(profile_id));

CREATE POLICY "Owner can update booking requests" ON booking_requests
  FOR UPDATE USING (is_profile_owner(profile_id));
```

**Step 2: Add BookingRequestRow type**

In `src/types/database.ts`, add:

```typescript
export interface BookingRequestRow {
  id: string
  profile_id: string
  name: string
  email: string
  event_name: string | null
  event_date: string | null
  venue_location: string | null
  budget_range: string | null
  message: string
  status: 'new' | 'read' | 'replied' | 'archived'
  created_at: string
}
```

**Step 3: Run migration and commit**

```bash
npm run db:migrate
git add supabase/schema.sql src/types/database.ts
git commit -m "feat: add booking_requests table with public insert RLS"
```

---

## Task 11: Booking Requests - Schema and Server Functions

**Files:**
- Create: `src/schemas/booking-request.ts`
- Create: `src/server/booking-requests.ts`
- Modify: `src/schemas/index.ts`

**Step 1: Create Zod schema**

```typescript
// src/schemas/booking-request.ts
import { z } from 'zod'

export const bookingRequestSubmitSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  email: z.string().email('Valid email required'),
  event_name: z.string().max(200).optional(),
  event_date: z.string().optional(), // ISO date string
  venue_location: z.string().max(200).optional(),
  budget_range: z.string().max(100).optional(),
  message: z.string().min(1, 'Message is required').max(2000, 'Max 2000 characters'),
  honeypot: z.string().max(0, 'Bot detected').optional(), // spam trap
})

export const bookingRequestStatusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(['new', 'read', 'replied', 'archived']),
})

export type BookingRequestSubmit = z.infer<typeof bookingRequestSubmitSchema>
```

**Step 2: Create server functions**

```typescript
// src/server/booking-requests.ts
import { createServerFn } from '@tanstack/react-start'
import { bookingRequestSubmitSchema, bookingRequestStatusSchema } from '~/schemas/booking-request'
import { getSupabaseServerClient } from '~/utils/supabase'
import { withAuth } from './utils'
import { sendBookingNotification, sendBookingConfirmation } from './email'

// Public — no auth required
export const submitBookingRequest = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => {
    const parsed = bookingRequestSubmitSchema.parse(data)
    // Reject if honeypot is filled
    if (parsed.honeypot) throw new Error('Invalid submission')
    return parsed
  })
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const { honeypot, ...fields } = data

    // We need the profile_id from the slug — caller passes slug
    // Actually, let's accept slug as a separate field
    return { error: 'Use submitBookingRequestForSlug instead' }
  })

// Public — accepts slug to find the profile
export const submitBookingRequestForSlug = createServerFn({ method: 'POST' })
  .inputValidator((data: { slug: string; request: unknown }) => ({
    slug: data.slug,
    request: bookingRequestSubmitSchema.parse(data.request),
  }))
  .handler(async ({ data: { slug, request } }) => {
    const supabase = getSupabaseServerClient()

    // Look up profile by slug
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, display_name')
      .eq('slug', slug)
      .eq('published', true)
      .single()

    if (!profile) return { error: 'Profile not found' }

    // Look up booking contact email for forwarding
    const { data: contact } = await supabase
      .from('booking_contact')
      .select('email')
      .eq('profile_id', profile.id)
      .single()

    const { honeypot, ...fields } = request

    // Insert booking request
    const { error } = await supabase
      .from('booking_requests')
      .insert({ profile_id: profile.id, ...fields })

    if (error) return { error: error.message }

    // Send email notifications (fire and forget — don't block response)
    const artistName = profile.display_name || 'Artist'
    if (contact?.email) {
      sendBookingNotification(contact.email, { ...fields, artistName }).catch(console.error)
    }
    sendBookingConfirmation(fields.email, artistName).catch(console.error)

    return { success: true }
  })

// Auth required — dashboard
export const getBookingRequests = createServerFn({ method: 'GET' }).handler(async () => {
  const { supabase, user } = await withAuth()
  const { data } = await supabase
    .from('booking_requests')
    .select('*')
    .eq('profile_id', user.id)
    .order('created_at', { ascending: false })
  return data || []
})

export const updateBookingRequestStatus = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => bookingRequestStatusSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabase, user } = await withAuth()
    const { error } = await supabase
      .from('booking_requests')
      .update({ status: data.status })
      .eq('id', data.id)
      .eq('profile_id', user.id)
    if (error) return { error: error.message }
    return { success: true }
  })
```

**Step 3: Add to schemas barrel export**

In `src/schemas/index.ts`, add:

```typescript
export * from './booking-request'
```

**Step 4: Commit**

```bash
git add src/schemas/booking-request.ts src/server/booking-requests.ts src/schemas/index.ts
git commit -m "feat: add booking request schema and server functions with email forwarding"
```

---

## Task 12: Booking Request Form on Public EPK

**Files:**
- Modify: `src/routes/$slug.tsx` (contact section, around lines 233-242)

**Step 1: Add booking form component**

Add a `BookingForm` component inside `$slug.tsx` (above the `PublicEPK` function):

```tsx
function BookingForm({ slug }: { slug: string }) {
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    name: '', email: '', event_name: '', event_date: '', venue_location: '',
    budget_range: '', message: '', honeypot: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.honeypot) return // spam trap
    setSubmitting(true)
    setError('')

    const result = await submitBookingRequestForSlug({
      data: { slug, request: formData },
    })

    if ('error' in result && result.error) {
      setError(result.error)
      setSubmitting(false)
      return
    }

    setSubmitted(true)
    setSubmitting(false)
  }

  if (submitted) {
    return (
      <div className="bg-dark-card border border-accent/20 rounded-xl p-8 text-center">
        <p className="text-accent font-bold text-lg mb-2">Inquiry Sent!</p>
        <p className="text-text-secondary text-sm">Thanks for reaching out. You'll hear back soon.</p>
      </div>
    )
  }

  const inputClass = 'w-full bg-dark-surface border border-white/10 rounded-lg px-4 py-3 text-white placeholder-text-secondary/50 focus:border-accent focus:outline-none transition-colors text-sm'

  return (
    <form onSubmit={handleSubmit} className="bg-dark-card border border-white/5 rounded-xl p-6 mt-8">
      <h3 className="text-sm uppercase tracking-widest font-bold mb-6">Send Booking Inquiry</h3>
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 mb-4 text-red-400 text-sm">{error}</div>
      )}
      {/* Honeypot — hidden from real users */}
      <input
        type="text"
        name="website"
        value={formData.honeypot}
        onChange={(e) => setFormData(prev => ({ ...prev, honeypot: e.target.value }))}
        className="absolute -left-[9999px]"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
      />
      <div className="grid sm:grid-cols-2 gap-4 mb-4">
        <input type="text" placeholder="Your Name *" required value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          className={inputClass} />
        <input type="email" placeholder="Your Email *" required value={formData.email}
          onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
          className={inputClass} />
        <input type="text" placeholder="Event Name" value={formData.event_name}
          onChange={(e) => setFormData(prev => ({ ...prev, event_name: e.target.value }))}
          className={inputClass} />
        <input type="date" placeholder="Event Date" value={formData.event_date}
          onChange={(e) => setFormData(prev => ({ ...prev, event_date: e.target.value }))}
          className={inputClass} />
        <input type="text" placeholder="Venue / Location" value={formData.venue_location}
          onChange={(e) => setFormData(prev => ({ ...prev, venue_location: e.target.value }))}
          className={inputClass} />
        <input type="text" placeholder="Budget Range" value={formData.budget_range}
          onChange={(e) => setFormData(prev => ({ ...prev, budget_range: e.target.value }))}
          className={inputClass} />
      </div>
      <textarea placeholder="Your Message *" required rows={4} value={formData.message}
        onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
        className={`${inputClass} mb-4`} />
      <button type="submit" disabled={submitting}
        className="bg-accent hover:bg-accent/80 disabled:opacity-50 text-black font-bold uppercase tracking-widest py-3 px-8 rounded-lg transition-colors text-sm">
        {submitting ? 'Sending...' : 'Send Inquiry'}
      </button>
    </form>
  )
}
```

**Step 2: Update the contact section to include the form**

Replace the contact section (lines 233-242) with:

```tsx
        {/* Contact */}
        {bookingContact && bookingContact.manager_name && (
          <EPKSection id="contact" heading="Booking Contact" maxWidth="max-w-4xl">
            <div className="text-text-secondary space-y-2">
              <p><strong>Management:</strong> {bookingContact.manager_name}</p>
              {bookingContact.email && <p><strong>Email:</strong> {bookingContact.email}</p>}
              {bookingContact.phone && <p><strong>Phone:</strong> {bookingContact.phone}</p>}
            </div>
            <BookingForm slug={profile.slug} />
          </EPKSection>
        )}
```

**Step 3: Add imports at top of $slug.tsx**

```typescript
import { useState } from 'react'
import { submitBookingRequestForSlug } from '~/server/booking-requests'
```

**Step 4: Commit**

```bash
git add src/routes/\$slug.tsx
git commit -m "feat: add public booking request form to EPK contact section"
```

---

## Task 13: Booking Inquiries Dashboard Page

**Files:**
- Create: `src/routes/_dashboard/dashboard.inquiries.tsx`
- Modify: `src/components/DashboardSidebar.tsx:8-19`

**Step 1: Create the inquiries dashboard page**

```tsx
// src/routes/_dashboard/dashboard.inquiries.tsx
import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { getBookingRequests, updateBookingRequestStatus } from '~/server/booking-requests'
import { BTN_BASE } from '~/components/forms'
import type { BookingRequestRow } from '~/types/database'

export const Route = createFileRoute('/_dashboard/dashboard/inquiries')({
  loader: () => getBookingRequests(),
  component: InquiriesDashboard,
})

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-accent/20 text-accent',
  read: 'bg-blue-500/20 text-blue-400',
  replied: 'bg-green-500/20 text-green-400',
  archived: 'bg-white/10 text-text-secondary',
}

const STATUS_OPTIONS: BookingRequestRow['status'][] = ['new', 'read', 'replied', 'archived']

function InquiriesDashboard() {
  const initialRequests = Route.useLoaderData()
  const [requests, setRequests] = useState<BookingRequestRow[]>(initialRequests || [])
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const handleStatusChange = async (id: string, status: BookingRequestRow['status']) => {
    const result = await updateBookingRequestStatus({ data: { id, status } })
    if ('success' in result) {
      setRequests(prev => prev.map(r => r.id === id ? { ...r, status } : r))
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-black uppercase tracking-wider mb-8">Booking Inquiries</h1>

      {requests.length === 0 ? (
        <p className="text-text-secondary text-sm">No booking inquiries yet. They'll appear here when someone submits the form on your EPK.</p>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => (
            <div
              key={req.id}
              className="bg-dark-card border border-white/10 rounded-xl overflow-hidden"
            >
              {/* Summary row */}
              <button
                type="button"
                onClick={() => setExpandedId(expandedId === req.id ? null : req.id)}
                className="w-full flex items-center gap-4 px-4 py-3 text-left hover:bg-white/5 transition-colors"
              >
                <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded ${STATUS_COLORS[req.status]}`}>
                  {req.status}
                </span>
                <span className="font-bold text-sm flex-1 truncate">{req.name}</span>
                <span className="text-xs text-text-secondary">{req.event_name || 'No event name'}</span>
                <span className="text-xs text-text-secondary">
                  {new Date(req.created_at).toLocaleDateString()}
                </span>
              </button>

              {/* Expanded detail */}
              {expandedId === req.id && (
                <div className="px-4 pb-4 border-t border-white/5">
                  <div className="grid sm:grid-cols-2 gap-x-8 gap-y-2 py-4 text-sm">
                    <div><span className="text-text-secondary">Email:</span> <a href={`mailto:${req.email}`} className="text-accent hover:underline">{req.email}</a></div>
                    {req.event_name && <div><span className="text-text-secondary">Event:</span> {req.event_name}</div>}
                    {req.event_date && <div><span className="text-text-secondary">Date:</span> {new Date(req.event_date).toLocaleDateString()}</div>}
                    {req.venue_location && <div><span className="text-text-secondary">Venue:</span> {req.venue_location}</div>}
                    {req.budget_range && <div><span className="text-text-secondary">Budget:</span> {req.budget_range}</div>}
                  </div>
                  <div className="bg-dark-surface/50 rounded-lg p-4 mb-4">
                    <p className="text-xs text-text-secondary uppercase tracking-wider mb-2">Message</p>
                    <p className="text-sm whitespace-pre-line">{req.message}</p>
                  </div>
                  <div className="flex gap-2">
                    {STATUS_OPTIONS.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => handleStatusChange(req.id, s)}
                        className={`${BTN_BASE} text-xs ${req.status === s ? 'bg-accent text-black' : 'bg-white/10 text-white hover:bg-white/20'}`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

**Step 2: Add to sidebar navigation**

In `src/components/DashboardSidebar.tsx`, add to `NAV_ITEMS` array after the Contact item (line 15):

```typescript
  { label: 'Inquiries', href: '/dashboard/inquiries' },
```

**Step 3: Commit**

```bash
git add src/routes/_dashboard/dashboard.inquiries.tsx src/components/DashboardSidebar.tsx
git commit -m "feat: add booking inquiries dashboard with status tracking"
```

---

## Task 14: Password Reset Flow

**Files:**
- Create: `src/routes/forgot-password.tsx`
- Create: `src/routes/reset-password.tsx`
- Modify: `src/routes/login.tsx`

**Step 1: Create forgot password page**

```tsx
// src/routes/forgot-password.tsx
import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { getSupabaseBrowserClient } from '~/utils/supabase'
import { FORM_INPUT, FORM_LABEL } from '~/components/forms'

export const Route = createFileRoute('/forgot-password')({
  component: ForgotPasswordPage,
})

function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = getSupabaseBrowserClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setSent(true)
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-black uppercase tracking-wider text-center mb-8">Reset Password</h1>

        {sent ? (
          <div className="bg-accent/10 border border-accent/20 rounded-lg px-4 py-6 text-center">
            <p className="text-accent font-bold mb-2">Check your email</p>
            <p className="text-text-secondary text-sm">We've sent a password reset link to <strong className="text-white">{email}</strong></p>
          </div>
        ) : (
          <>
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 mb-6 text-red-400 text-sm">{error}</div>
            )}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="email" className={FORM_LABEL}>Email</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={FORM_INPUT}
                  placeholder="your@email.com"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-accent hover:bg-accent/80 disabled:opacity-50 text-white font-bold uppercase tracking-widest py-3 rounded-lg transition-colors"
              >
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>
          </>
        )}

        <p className="text-text-secondary text-sm text-center mt-6">
          Remember your password?{' '}
          <Link to="/login" className="text-accent hover:underline">Log in</Link>
        </p>
      </div>
    </div>
  )
}
```

**Step 2: Create reset password page**

```tsx
// src/routes/reset-password.tsx
import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { getSupabaseBrowserClient } from '~/utils/supabase'
import { FORM_INPUT, FORM_LABEL } from '~/components/forms'

export const Route = createFileRoute('/reset-password')({
  component: ResetPasswordPage,
})

function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setLoading(true)

    const supabase = getSupabaseBrowserClient()
    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setDone(true)
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-black uppercase tracking-wider text-center mb-8">New Password</h1>

        {done ? (
          <div className="bg-accent/10 border border-accent/20 rounded-lg px-4 py-6 text-center">
            <p className="text-accent font-bold mb-2">Password Updated</p>
            <p className="text-text-secondary text-sm mb-4">Your password has been reset successfully.</p>
            <Link to="/dashboard" className="text-accent hover:underline font-bold text-sm">Go to Dashboard</Link>
          </div>
        ) : (
          <>
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 mb-6 text-red-400 text-sm">{error}</div>
            )}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="password" className={FORM_LABEL}>New Password</label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={FORM_INPUT}
                  placeholder="At least 6 characters"
                  minLength={6}
                  required
                />
              </div>
              <div>
                <label htmlFor="confirm" className={FORM_LABEL}>Confirm Password</label>
                <input
                  id="confirm"
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className={FORM_INPUT}
                  placeholder="Confirm your new password"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-accent hover:bg-accent/80 disabled:opacity-50 text-white font-bold uppercase tracking-widest py-3 rounded-lg transition-colors"
              >
                {loading ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
```

**Step 3: Add "Forgot password?" link to login page**

In `src/routes/login.tsx`, add after the footer prop (line 24), add a `forgotPasswordLink` or simply update the `AuthForm` footer. Actually, it's simpler to add the link directly in the login page by modifying the `footer` to include the link. Update the AuthForm call:

Add a link below the form in `login.tsx`. Replace the `footer` prop:

```typescript
      footer={{
        text: "Don't have an account?",
        linkText: 'Sign up',
        linkTo: '/signup',
      }}
      extraFooter={
        <Link to="/forgot-password" className="text-accent hover:underline text-sm">
          Forgot your password?
        </Link>
      }
```

Since `AuthForm` doesn't support `extraFooter`, the simpler approach is to add the prop. In `src/components/AuthForm.tsx`, add `extraFooter?: React.ReactNode` to props and render it below the footer paragraph. Or just add the link to the existing footer text.

Alternative: Just put "Forgot password?" as part of the footer text. The cleanest solution is to add support in AuthForm.

In `src/components/AuthForm.tsx`:
- Add `extraFooter?: React.ReactNode` to `AuthFormProps` interface
- Render it below the existing footer: `{extraFooter && <div className="text-center mt-3">{extraFooter}</div>}`

Then in `login.tsx`, add the prop.

**Step 4: Commit**

```bash
git add src/routes/forgot-password.tsx src/routes/reset-password.tsx src/routes/login.tsx src/components/AuthForm.tsx
git commit -m "feat: add password reset flow (forgot + reset pages)"
```

---

## Task 15: OAuth Providers (Google, Apple, Discord)

**Files:**
- Modify: `src/components/AuthForm.tsx`

**Prerequisites:** Configure Google, Apple, and Discord OAuth providers in Supabase Dashboard under Authentication > Providers. Get client IDs and secrets for each.

**Step 1: Add OAuth buttons to AuthForm**

In `src/components/AuthForm.tsx`, add an `oauthProviders` section above the email form. Add after the `<h1>` and error display, before `<form>`:

```tsx
      {/* OAuth Buttons */}
      <div className="space-y-3 mb-6">
        {(['google', 'apple', 'discord'] as const).map((provider) => (
          <button
            key={provider}
            type="button"
            onClick={async () => {
              const supabase = getSupabaseBrowserClient()
              await supabase.auth.signInWithOAuth({
                provider,
                options: { redirectTo: `${window.location.origin}/dashboard` },
              })
            }}
            className="w-full border border-white/10 hover:border-white/20 text-white font-bold py-3 rounded-lg transition-colors text-sm uppercase tracking-wider"
          >
            Continue with {provider.charAt(0).toUpperCase() + provider.slice(1)}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1 h-px bg-white/10" />
        <span className="text-text-secondary text-xs uppercase tracking-wider">or</span>
        <div className="flex-1 h-px bg-white/10" />
      </div>
```

Add import at top:

```typescript
import { getSupabaseBrowserClient } from '~/utils/supabase'
```

**Step 2: Commit**

```bash
git add src/components/AuthForm.tsx
git commit -m "feat: add OAuth buttons (Google, Apple, Discord) to auth forms"
```

---

## Task 16: Genres Predefined List + BPM Range

**Files:**
- Modify: `supabase/schema.sql`
- Modify: `src/types/database.ts:7-26`
- Modify: `src/schemas/profile.ts`
- Modify: `src/routes/_dashboard/dashboard.index.tsx`
- Modify: `src/routes/$slug.tsx`
- Modify: `src/server/profile.ts:6-19`

**Step 1: Database migration**

Append to `supabase/schema.sql`:

```sql
-- Migration: Add BPM range columns to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bpm_min INTEGER;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bpm_max INTEGER;
```

**Step 2: Update types**

In `src/types/database.ts` `ProfileRow`, add:

```typescript
  bpm_min: number | null
  bpm_max: number | null
```

**Step 3: Update profile schema**

In `src/schemas/profile.ts`, add:

```typescript
  bpm_min: z.number().int().min(60).max(200).nullable().optional(),
  bpm_max: z.number().int().min(60).max(200).nullable().optional(),
```

**Step 4: Define predefined genres**

Create `src/utils/genres.ts`:

```typescript
export const PREDEFINED_GENRES = [
  'House', 'Techno', 'Trance', 'Drum & Bass', 'Dubstep',
  'Garage', 'Disco', 'Funk', 'Hip-Hop', 'Afrobeats',
  'Melodic Techno', 'Progressive House', 'Deep House',
  'Tech House', 'Minimal', 'Breaks', 'Electro',
  'Ambient', 'Downtempo',
] as const
```

**Step 5: Update dashboard.index.tsx**

Replace the current genres text input with a multi-select using checkboxes + custom input. In the genre section of `dashboard.index.tsx`:

```tsx
{/* Genres */}
<div>
  <label className={FORM_LABEL}>Genres</label>
  <div className="flex flex-wrap gap-2 mb-2">
    {PREDEFINED_GENRES.map((genre) => {
      const current = watch('genres') || []
      const isSelected = current.includes(genre)
      return (
        <button
          key={genre}
          type="button"
          onClick={() => {
            const updated = isSelected
              ? current.filter((g: string) => g !== genre)
              : [...current, genre]
            setValue('genres', updated, { shouldDirty: true })
          }}
          className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
            isSelected
              ? 'bg-accent text-black'
              : 'bg-dark-card border border-white/10 text-text-secondary hover:border-accent/30'
          }`}
        >
          {genre}
        </button>
      )
    })}
  </div>
  {/* Custom genre input */}
  <div className="flex gap-2 mt-2">
    <input
      type="text"
      placeholder="Add custom genre..."
      className={FORM_INPUT}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          const input = e.currentTarget
          const value = input.value.trim()
          if (value) {
            const current = watch('genres') || []
            if (!current.includes(value)) {
              setValue('genres', [...current, value], { shouldDirty: true })
            }
            input.value = ''
          }
        }
      }}
    />
  </div>
</div>

{/* BPM Range */}
<div>
  <label className={FORM_LABEL}>BPM Range</label>
  <div className="flex items-center gap-3">
    <input
      type="number"
      placeholder="Min"
      min={60}
      max={200}
      {...register('bpm_min', { valueAsNumber: true })}
      className={`${FORM_INPUT} w-24`}
    />
    <span className="text-text-secondary">—</span>
    <input
      type="number"
      placeholder="Max"
      min={60}
      max={200}
      {...register('bpm_max', { valueAsNumber: true })}
      className={`${FORM_INPUT} w-24`}
    />
    <span className="text-text-secondary text-sm">BPM</span>
  </div>
</div>
```

Add imports: `PREDEFINED_GENRES` from `~/utils/genres`, and add `bpm_min`, `bpm_max` to `ALLOWED_PROFILE_FIELDS` in `src/server/profile.ts`.

**Step 6: Update public EPK hero section**

In `$slug.tsx`, add genre tags and BPM below the tagline in the hero section:

```tsx
            {profile.genres && profile.genres.length > 0 && (
              <div className="flex flex-wrap justify-center gap-2 mt-4">
                {(profile.genres as string[]).map((genre) => (
                  <span key={genre} className="px-3 py-1 rounded-full text-xs font-bold bg-accent/20 text-accent">
                    {genre}
                  </span>
                ))}
              </div>
            )}
            {(profile.bpm_min || profile.bpm_max) && (
              <p className="text-sm text-text-secondary mt-3">
                {profile.bpm_min && profile.bpm_max
                  ? `${profile.bpm_min}–${profile.bpm_max} BPM`
                  : profile.bpm_min ? `${profile.bpm_min}+ BPM` : `Up to ${profile.bpm_max} BPM`}
              </p>
            )}
```

**Step 7: Run migration and commit**

```bash
npm run db:migrate
git add supabase/schema.sql src/types/database.ts src/schemas/profile.ts src/utils/genres.ts src/routes/_dashboard/dashboard.index.tsx src/routes/\$slug.tsx src/server/profile.ts
git commit -m "feat: add predefined genre picker with custom genres and BPM range"
```

---

## Verification Checklist

- [ ] Tiptap editor renders in bio page with toolbar (H2, H3, bold, italic, lists, links)
- [ ] Tiptap editor renders in technical rider page
- [ ] Bio HTML is sanitized on public page (no script tags, only safe HTML)
- [ ] Adding a SoundCloud URL to mixes resolves an oEmbed player
- [ ] Adding a Spotify URL to mixes resolves an oEmbed player
- [ ] Embeds render on the public EPK page within iframes
- [ ] Non-embeddable URLs fall back to link cards
- [ ] Booking form appears on public EPK below contact info
- [ ] Submitting booking form creates a row in booking_requests
- [ ] Email notification is sent to booking contact email
- [ ] Confirmation email is sent to the person who submitted
- [ ] Honeypot field prevents spam submissions
- [ ] Inquiries dashboard shows all requests with expand/collapse
- [ ] Status can be changed (new/read/replied/archived)
- [ ] "Inquiries" appears in dashboard sidebar
- [ ] Forgot password page sends reset email
- [ ] Reset password page accepts new password with confirmation
- [ ] OAuth buttons appear on login and signup pages
- [ ] Genre picker shows predefined genres as selectable pills
- [ ] Custom genres can be added via text input
- [ ] BPM range inputs appear and save correctly
- [ ] Genre pills and BPM display on public EPK hero section
