# Creative Features Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add video hero backgrounds, photo gallery with lightbox, and animated section transitions to the DJ EPK platform.

**Architecture:** Three independent features that each touch the database (migrations), server functions, dashboard pages, and the public EPK page. Video hero extends the existing hero page. Photo gallery is a new CRUD entity following the mixes/events pattern. Animated transitions modify the existing `FadeIn` component to be profile-aware.

**Tech Stack:** TanStack Start, Supabase (Postgres + RLS + Storage), react-hook-form + Zod, Tailwind CSS v4, @dnd-kit for drag reorder.

**Design doc:** `docs/plans/2026-02-06-creative-features-design.md`

---

## Task 1: Migration — Add hero_video_url and animate_sections to profiles

**Files:**
- Create: `supabase/migrations/20260206300000_add_video_hero_and_animate.sql`

**Step 1: Write the migration**

```sql
-- Add hero video URL and animate sections toggle
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS hero_video_url text,
  ADD COLUMN IF NOT EXISTS animate_sections boolean DEFAULT true;
```

**Step 2: Push migration**

Run: `npx supabase db push`
Expected: Migration applied successfully.

**Step 3: Commit**

```bash
git add supabase/migrations/20260206300000_add_video_hero_and_animate.sql
git commit -m "feat: add hero_video_url and animate_sections columns to profiles"
```

---

## Task 2: Migration — Create photos table

**Files:**
- Create: `supabase/migrations/20260206300100_create_photos_table.sql`

**Step 1: Write the migration**

```sql
-- Create photos table for gallery section
CREATE TABLE photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  caption text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;

-- Owner CRUD policies
CREATE POLICY "Owner select on photos" ON photos FOR SELECT USING (is_profile_owner(profile_id));
CREATE POLICY "Owner insert on photos" ON photos FOR INSERT WITH CHECK (is_profile_owner(profile_id));
CREATE POLICY "Owner update on photos" ON photos FOR UPDATE USING (is_profile_owner(profile_id));
CREATE POLICY "Owner delete on photos" ON photos FOR DELETE USING (is_profile_owner(profile_id));

-- Public read for published profiles
CREATE POLICY "Public read on photos" ON photos FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = photos.profile_id AND published = true));
```

**Step 2: Push migration**

Run: `npx supabase db push`
Expected: Migration applied successfully.

**Step 3: Commit**

```bash
git add supabase/migrations/20260206300100_create_photos_table.sql
git commit -m "feat: create photos table with RLS policies"
```

---

## Task 3: Schema + server functions for hero_video_url and animate_sections

**Files:**
- Modify: `src/schemas/profile.ts` — add `hero_video_url` and `animate_sections` fields
- Modify: `src/server/profile.ts` — add both fields to `ALLOWED_PROFILE_FIELDS` and null-coercion list
- Modify: `src/server/upload.ts` — add video content types and `'photos'` folder

**Step 1: Update profile schema**

In `src/schemas/profile.ts`, add these two fields to `profileUpdateSchema` (after `hero_style` on line 50):

```ts
hero_video_url: z.string().url('Invalid URL').optional().or(z.literal('')),
animate_sections: z.boolean().optional(),
```

**Step 2: Update ALLOWED_PROFILE_FIELDS**

In `src/server/profile.ts`, add to the `ALLOWED_PROFILE_FIELDS` set (after `'hero_style'` on line 34):

```ts
'hero_video_url',
'animate_sections',
```

**Step 3: Add hero_video_url to null-coercion list**

In `src/server/profile.ts`, add `'hero_video_url'` to the empty-string-to-null coercion array on line 73:

```ts
for (const key of ['og_title', 'og_description', 'og_image_url', 'hero_image_url', 'hero_video_url', 'press_kit_url']) {
```

**Step 4: Add video content types and photos folder to upload.ts**

In `src/server/upload.ts`, add video types to `ALLOWED_CONTENT_TYPES` (after line 14):

```ts
'video/mp4',
'video/webm',
```

Add `'photos'` to `ALLOWED_FOLDERS` on line 16:

```ts
const ALLOWED_FOLDERS = new Set(['images', 'press', 'audio', 'profile', 'hero', 'events', 'photos'])
```

Update `MAX_FILE_SIZE` to support video uploads. Add a separate constant for video max size:

```ts
const MAX_VIDEO_SIZE = 50 * 1024 * 1024 // 50MB
```

And update the size check in the handler to use the appropriate limit based on content type:

```ts
const maxSize = data.contentType.startsWith('video/') ? MAX_VIDEO_SIZE : MAX_FILE_SIZE
if (buffer.byteLength > maxSize) {
  return { error: `File exceeds ${data.contentType.startsWith('video/') ? '50MB' : '10MB'} limit` }
}
```

**Step 5: Verify dev server starts**

Run: `npm run dev`
Expected: No type errors, server starts.

**Step 6: Commit**

```bash
git add src/schemas/profile.ts src/server/profile.ts src/server/upload.ts
git commit -m "feat: add hero_video_url and animate_sections to profile schema and server"
```

---

## Task 4: Schema + server functions for photos CRUD

**Files:**
- Create: `src/schemas/photo.ts`
- Modify: `src/schemas/index.ts` — barrel export
- Create: `src/server/photos.ts`

**Step 1: Create photo schema**

Create `src/schemas/photo.ts`:

```ts
import { z } from 'zod'

export const photoUpsertSchema = z.object({
  id: z.string().uuid().optional(),
  image_url: z.string().url('Image URL is required'),
  caption: z.string().max(200, 'Max 200 characters').optional().or(z.literal('')),
  sort_order: z.number().int().min(0).optional(),
})

export type PhotoUpsert = z.infer<typeof photoUpsertSchema>
```

**Step 2: Add barrel export**

In `src/schemas/index.ts`, add:

```ts
export { photoUpsertSchema, type PhotoUpsert } from './photo'
```

**Step 3: Create server functions**

Create `src/server/photos.ts`:

```ts
import { createServerFn } from '@tanstack/react-start'
import { photoUpsertSchema } from '~/schemas/photo'
import { getListItems, upsertListItem, deleteListItem, reorderListItems, deleteIdSchema, reorderSchema } from './list-helpers'

export const getPhotos = createServerFn({ method: 'GET' }).handler(() => getListItems('photos'))

export const upsertPhoto = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => photoUpsertSchema.parse(data))
  .handler(({ data }) => upsertListItem('photos', 'photo', data as Record<string, unknown>))

export const deletePhoto = createServerFn({ method: 'POST' })
  .inputValidator((id: unknown) => deleteIdSchema.parse(id))
  .handler(({ data: id }) => deleteListItem('photos', id))

export const reorderPhotos = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => reorderSchema.parse(data))
  .handler(({ data }) => reorderListItems('photos', data.ids))
```

**Step 4: Verify dev server starts**

Run: `npm run dev`
Expected: No type errors, server starts.

**Step 5: Commit**

```bash
git add src/schemas/photo.ts src/schemas/index.ts src/server/photos.ts
git commit -m "feat: add photo schema and CRUD server functions"
```

---

## Task 5: Video hero — Dashboard UI

**Files:**
- Modify: `src/routes/_dashboard/dashboard.hero.tsx`

**Step 1: Update the hero form to support video**

This is the most complex dashboard change. The hero page needs:

1. A "Hero Media" toggle (Image / Video) that appears when hero style is not 'minimal'
2. When "Video" is selected, show video-specific upload with guidance text and validation
3. Video preview in the existing preview area showing the video with overlay text
4. Client-side validation: file type (mp4/webm), size (50MB max), duration (30s max)

Update `src/routes/_dashboard/dashboard.hero.tsx`:

- Add `hero_video_url` to the form schema pick and type:
  ```ts
  const heroFormSchema = profileUpdateSchema.pick({ hero_image_url: true, hero_video_url: true, hero_style: true, tagline: true })
  type HeroFormValues = Pick<ProfileUpdate, 'hero_image_url' | 'hero_video_url' | 'hero_style' | 'tagline'>
  ```

- Add `hero_video_url` to form `defaultValues`:
  ```ts
  hero_video_url: initialProfile?.hero_video_url || '',
  ```

- Add state for media type toggle and video upload:
  ```ts
  const [heroMediaType, setHeroMediaType] = useState<'image' | 'video'>(
    initialProfile?.hero_video_url ? 'video' : 'image'
  )
  const [videoUploading, setVideoUploading] = useState(false)
  const [videoUploadProgress, setVideoUploadProgress] = useState(0)
  const [videoError, setVideoError] = useState('')
  const videoInputRef = useRef<HTMLInputElement>(null)
  ```

- Add video validation function:
  ```ts
  const validateVideo = (file: File): Promise<string | null> => {
    return new Promise((resolve) => {
      if (!['video/mp4', 'video/webm'].includes(file.type)) {
        return resolve('Only MP4 and WebM files are supported.')
      }
      if (file.size > 50 * 1024 * 1024) {
        return resolve(`File is ${Math.round(file.size / 1024 / 1024)}MB — must be under 50MB.`)
      }
      const video = document.createElement('video')
      video.preload = 'metadata'
      video.onloadedmetadata = () => {
        URL.revokeObjectURL(video.src)
        if (video.duration > 30) {
          return resolve(`Video is ${Math.round(video.duration)} seconds — trim it to 30 seconds or under.`)
        }
        resolve(null)
      }
      video.onerror = () => {
        URL.revokeObjectURL(video.src)
        resolve('Could not read video file. Try a different format.')
      }
      video.src = URL.createObjectURL(file)
    })
  }
  ```

- Add video upload handler:
  ```ts
  const handleVideoUpload = async (file: File) => {
    setVideoError('')
    const error = await validateVideo(file)
    if (error) {
      setVideoError(error)
      return
    }
    setVideoUploading(true)
    const result = await uploadFileFromInput(file, 'hero')
    setVideoUploading(false)
    if (result) {
      setValue('hero_video_url', result.url, { shouldDirty: true })
    } else {
      setVideoError('Upload failed. Please try again.')
    }
  }
  ```

- Add remove video handler:
  ```ts
  const handleRemoveVideo = () => {
    setValue('hero_video_url', '', { shouldDirty: true })
    if (videoInputRef.current) videoInputRef.current.value = ''
  }
  ```

- Watch `hero_video_url`:
  ```ts
  const heroVideoUrl = watch('hero_video_url')
  ```

- When hero media type toggles, clear the other media type:
  ```ts
  const handleMediaTypeChange = (type: 'image' | 'video') => {
    setHeroMediaType(type)
    if (type === 'image') {
      setValue('hero_video_url', '', { shouldDirty: true })
    } else {
      setValue('hero_image_url', '', { shouldDirty: true })
    }
  }
  ```

- In the JSX, after hero style cards and before image upload, add a media type toggle (only when style is not 'minimal'):
  ```tsx
  {heroStyle !== 'minimal' && (
    <div>
      <label className={FORM_LABEL}>Hero Media</label>
      <div className="grid grid-cols-2 gap-3">
        {(['image', 'video'] as const).map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => handleMediaTypeChange(type)}
            className={`border p-3 text-left transition-all ${
              heroMediaType === type
                ? 'border-accent bg-accent/5 ring-1 ring-accent'
                : 'border-border hover:border-text-secondary'
            }`}
          >
            <p className="text-sm font-medium capitalize">{type}</p>
            <p className="text-xs text-text-secondary mt-0.5">
              {type === 'image' ? 'Static image background' : 'Looping video background'}
            </p>
          </button>
        ))}
      </div>
    </div>
  )}
  ```

- Conditionally show image upload (existing) or video upload based on `heroMediaType`:
  - Wrap existing image upload block in `{heroMediaType === 'image' && (...)}`
  - Add video upload block for `{heroMediaType === 'video' && (...)}`:
  ```tsx
  {heroStyle !== 'minimal' && heroMediaType === 'video' && (
    <div>
      <label className={FORM_LABEL}>Hero Video</label>
      <input
        ref={videoInputRef}
        type="file"
        accept="video/mp4,video/webm"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleVideoUpload(file)
        }}
        className={FORM_FILE_INPUT}
      />
      <p className="text-xs text-text-secondary mt-2">
        Best results: 10–30 seconds, 1080p landscape, under 50MB. Subtle or slow-moving footage works best (crowd panning, DJ booth shots, abstract visuals). Avoid fast cuts — they compete with the text overlay.
      </p>
      <p className="text-xs text-text-secondary mt-1 italic">
        Tip: Use your phone's built-in editor to trim before uploading.
      </p>
      {videoUploading && <p className="text-xs text-accent mt-1">Uploading video...</p>}
      {videoError && <p className="text-xs text-red-500 mt-1">{videoError}</p>}
      {heroVideoUrl && (
        <button
          type="button"
          onClick={handleRemoveVideo}
          className="text-xs text-red-500 hover:text-red-600 mt-2 font-medium uppercase tracking-wider"
        >
          Remove Video
        </button>
      )}
    </div>
  )}
  ```

- Update the preview section to show video when `heroMediaType === 'video'` and `heroVideoUrl`:
  ```tsx
  {heroStyle === 'minimal' ? (
    <p className="text-sm text-text-secondary italic">
      Minimal style does not display hero media.
    </p>
  ) : heroMediaType === 'video' && heroVideoUrl ? (
    <div className="relative aspect-video overflow-hidden border border-border">
      <video
        src={heroVideoUrl}
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div
        className="absolute inset-0"
        style={{ background: `linear-gradient(to top, ${bgColor}e6, transparent, ${bgColor}99)` }}
      />
      <div className="absolute inset-0 flex flex-col items-center justify-center text-white text-center px-6">
        <p className="text-xl font-bold font-display tracking-wide">
          {initialProfile?.display_name || 'Artist Name'}
        </p>
        {tagline && (
          <p className="text-sm mt-1 opacity-80 uppercase tracking-widest">{tagline}</p>
        )}
      </div>
    </div>
  ) : heroImageUrl ? (
    /* existing image preview — keep as-is */
  ) : (
    /* existing no-image placeholder — keep as-is */
  )}
  ```

**Step 2: Verify in browser**

Run: `npm run dev`
Navigate to `/dashboard/hero`. Verify:
- Media type toggle appears for fullbleed/contained styles
- Video upload validates file type, size, duration
- Preview shows video with overlay
- Switching media type clears the other URL
- Save persists to database

**Step 3: Commit**

```bash
git add src/routes/_dashboard/dashboard.hero.tsx
git commit -m "feat: video hero upload with validation and preview on hero dashboard"
```

---

## Task 6: Video hero — Public page rendering

**Files:**
- Modify: `src/routes/$slug.tsx` — hero section rendering
- Modify: `src/server/public-profile.ts` — strip hero_video_url for non-published (it already returns `*`)

**Step 1: Update hero section in $slug.tsx**

In the hero section (around lines 299-358), update the media rendering inside the `{heroStyle !== 'minimal' && (...)}` block.

Replace the image-only rendering with video-first + image-fallback:

```tsx
{heroStyle !== 'minimal' && (
  <>
    {profile.hero_video_url ? (
      <>
        {/* Video hero — hidden on mobile and reduced-motion for perf/a11y */}
        <video
          src={profile.hero_video_url}
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 w-full h-full object-cover hidden md:block motion-safe:block motion-reduce:hidden"
        />
        {/* Fallback image for mobile / reduced-motion */}
        {profile.hero_image_url && (
          <img
            src={profile.hero_image_url}
            alt=""
            className="absolute inset-0 w-full h-full object-cover md:hidden motion-reduce:block"
          />
        )}
      </>
    ) : profile.hero_image_url ? (
      <img src={profile.hero_image_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
    ) : (
      <div className="absolute inset-0" style={{ background: `linear-gradient(to bottom, ${bg}, ${isLight ? '#f0ede8' : '#111'}, ${bg})` }} />
    )}
    <div className="absolute inset-0" style={{ background: `linear-gradient(to top, ${bg}e6, transparent, ${bg}99)` }} />
  </>
)}
```

Note: The Tailwind classes `motion-safe:block` and `motion-reduce:hidden` handle the `prefers-reduced-motion` accessibility requirement. On mobile (`hidden md:block`), the video is hidden and only the fallback image shows.

**Step 2: Verify on public page**

Run: `npm run dev`
Upload a test video via the dashboard, navigate to the public EPK page. Verify:
- Video plays on desktop
- Image fallback on mobile viewport
- Gradient overlay still works
- Text is readable

**Step 3: Commit**

```bash
git add src/routes/\$slug.tsx
git commit -m "feat: render video hero on public EPK page with mobile and a11y fallbacks"
```

---

## Task 7: Photo gallery — Dashboard page

**Files:**
- Create: `src/routes/_dashboard/dashboard.photos.tsx`
- Modify: `src/components/DashboardSidebar.tsx` — add nav item

**Step 1: Add sidebar nav item**

In `src/components/DashboardSidebar.tsx`, add the Photos entry to `NAV_ITEMS` after the Events entry (line 14):

```ts
{ label: 'Photos', href: '/dashboard/photos' },
```

**Step 2: Create the dashboard photos page**

Create `src/routes/_dashboard/dashboard.photos.tsx`. This follows the events/mixes pattern — a list page with modal add/edit, image upload, reorder, and delete.

```tsx
import { useState, useRef } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { getPhotos, upsertPhoto, deletePhoto, reorderPhotos } from '~/server/photos'
import { photoUpsertSchema, type PhotoUpsert } from '~/schemas/photo'
import { DashboardHeader } from '~/components/DashboardHeader'
import { FormInput, FORM_LABEL, FORM_FILE_INPUT } from '~/components/forms'
import { Modal } from '~/components/Modal'
import { ReorderButtons } from '~/components/ReorderButtons'
import { useListEditor } from '~/hooks/useListEditor'
import { useSectionToggle } from '~/hooks/useSectionToggle'
import { uploadFileFromInput } from '~/utils/upload'
import { BTN_PRIMARY, BTN_DELETE } from '~/components/forms/styles'

type PhotoRow = { id: string; image_url: string; caption: string | null; sort_order: number }

export const Route = createFileRoute('/_dashboard/dashboard/photos')({
  loader: () => getPhotos(),
  component: PhotosEditor,
})

function PhotosEditor() {
  const initialPhotos = Route.useLoaderData() as PhotoRow[]
  const { items: photos, handleDelete, handleReorder, addItem, setItems: setPhotos } = useListEditor(
    initialPhotos || [],
    { deleteFn: deletePhoto, reorderFn: reorderPhotos }
  )

  const sectionToggle = useSectionToggle('photos')
  const [sectionSaving, setSectionSaving] = useState(false)
  const [sectionSaved, setSectionSaved] = useState(false)

  const [modalItem, setModalItem] = useState<'add' | PhotoRow | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { register, handleSubmit, formState: { errors }, setValue, watch, reset } = useForm<PhotoUpsert>({
    resolver: zodResolver(photoUpsertSchema),
  })

  const imageUrl = watch('image_url')

  const handleSectionSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSectionSaving(true)
    await sectionToggle.save()
    setSectionSaving(false)
    setSectionSaved(true)
    setTimeout(() => setSectionSaved(false), 3000)
  }

  const openModal = (item: 'add' | PhotoRow) => {
    if (item === 'add') {
      reset({ image_url: '', caption: '' })
    } else {
      reset({ id: item.id, image_url: item.image_url, caption: item.caption || '' })
    }
    setUploadError('')
    setModalItem(item)
  }

  const handleUpload = async (file: File) => {
    setUploading(true)
    setUploadError('')
    const result = await uploadFileFromInput(file, 'photos')
    setUploading(false)
    if (result) {
      setValue('image_url', result.url, { shouldDirty: true })
    } else {
      setUploadError('Upload failed. Please try again.')
    }
  }

  const onSubmit = handleSubmit(async (data) => {
    setSaving(true)
    const result = await upsertPhoto({ data })
    setSaving(false)
    if ('error' in result && typeof result.error === 'string') {
      setUploadError(result.error)
      return
    }
    if ('photo' in result && result.photo) {
      const photo = result.photo as PhotoRow
      if (modalItem === 'add') {
        addItem(photo)
      } else {
        setPhotos((prev) => prev.map((p) => (p.id === photo.id ? photo : p)))
      }
    }
    setModalItem(null)
  })

  return (
    <>
      <form onSubmit={handleSectionSave}>
        <DashboardHeader
          title="Photos"
          saving={sectionSaving}
          saved={sectionSaved}
          error=""
          isDirty={sectionToggle.isDirty}
          sectionEnabled={sectionToggle.enabled}
          onToggleSection={sectionToggle.toggle}
        />
      </form>

      <div className="mb-6 flex items-center justify-between">
        <p className="text-sm text-text-secondary">
          {photos.length} of 20 photos
        </p>
        <button
          type="button"
          onClick={() => openModal('add')}
          disabled={photos.length >= 20}
          className={BTN_PRIMARY}
        >
          Add Photo
        </button>
      </div>

      {photos.length === 0 ? (
        <div className="border border-dashed border-border p-12 text-center text-sm text-text-secondary">
          No photos yet. Add your first photo to create a gallery on your EPK.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {photos.map((photo, index) => (
            <div key={photo.id} className="group relative border border-border overflow-hidden">
              <img
                src={photo.image_url}
                alt={photo.caption || ''}
                className="w-full aspect-square object-cover"
              />
              {photo.caption && (
                <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1">
                  <p className="text-xs text-white truncate">{photo.caption}</p>
                </div>
              )}
              <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                <ReorderButtons
                  index={index}
                  total={photos.length}
                  onReorder={handleReorder!}
                />
                <button
                  type="button"
                  onClick={() => openModal(photo)}
                  className="bg-white/90 text-text-primary px-2 py-1 text-xs font-medium"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(photo.id)}
                  className="bg-red-500/90 text-white px-2 py-1 text-xs font-medium"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal open={modalItem !== null} onClose={() => setModalItem(null)} title={modalItem === 'add' ? 'Add Photo' : 'Edit Photo'}>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className={FORM_LABEL}>Image</label>
            {imageUrl ? (
              <div className="mb-3">
                <img src={imageUrl} alt="Preview" className="w-full max-h-48 object-contain border border-border" />
                <button
                  type="button"
                  onClick={() => {
                    setValue('image_url', '', { shouldDirty: true })
                    if (fileInputRef.current) fileInputRef.current.value = ''
                  }}
                  className="text-xs text-red-500 hover:text-red-600 mt-1 font-medium uppercase tracking-wider"
                >
                  Remove
                </button>
              </div>
            ) : null}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleUpload(file)
              }}
              className={FORM_FILE_INPUT}
            />
            <p className="text-xs text-text-secondary mt-1">JPG, PNG, or WebP. Max 10MB.</p>
            {uploading && <p className="text-xs text-accent mt-1">Uploading...</p>}
            {uploadError && <p className="text-xs text-red-500 mt-1">{uploadError}</p>}
            {errors.image_url && <p className="text-xs text-red-500 mt-1">{errors.image_url.message}</p>}
          </div>

          <FormInput
            label="Caption"
            registration={register('caption')}
            error={errors.caption}
            placeholder="Optional caption"
          />

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving || uploading || !imageUrl} className={BTN_PRIMARY}>
              {saving ? 'Saving...' : modalItem === 'add' ? 'Add Photo' : 'Update Photo'}
            </button>
            <button type="button" onClick={() => setModalItem(null)} className="text-sm text-text-secondary hover:text-text-primary">
              Cancel
            </button>
          </div>
        </form>
      </Modal>
    </>
  )
}
```

**Step 3: Verify in browser**

Run: `npm run dev`
Navigate to `/dashboard/photos`. Verify:
- Photos link appears in sidebar
- Can add photos with upload and caption
- Grid shows uploaded photos
- Reorder buttons work
- Edit/delete work
- Section toggle works

**Step 4: Commit**

```bash
git add src/routes/_dashboard/dashboard.photos.tsx src/components/DashboardSidebar.tsx
git commit -m "feat: photo gallery dashboard page with upload, reorder, and section toggle"
```

---

## Task 8: Photo gallery — Register in section system

**Files:**
- Modify: `src/routes/_dashboard/dashboard.pages.tsx` — add 'photos' to `ALL_SECTIONS`
- Modify: `src/components/SortableSectionList.tsx` — add label
- Modify: `src/utils/templates.ts` — add 'photos' to each template's `sectionOrder`
- Modify: `src/server/public-profile.ts` — fetch photos in parallel

**Step 1: Add to ALL_SECTIONS in dashboard.pages.tsx**

On line 16, add `'photos'`:

```ts
const ALL_SECTIONS = ['bio', 'music', 'events', 'photos', 'technical', 'press', 'contact']
```

**Step 2: Add label in SortableSectionList.tsx**

On line 19, add to `SECTION_LABELS`:

```ts
photos: 'Photos',
```

**Step 3: Add to template section orders in templates.ts**

Add `'photos'` to each template's `sectionOrder` array (place after 'events' in each):

- `default`: `['bio', 'music', 'events', 'photos', 'technical', 'press', 'contact']`
- `minimal`: `['bio', 'music', 'events', 'photos', 'press', 'technical', 'contact']`
- `festival`: `['music', 'bio', 'events', 'photos', 'press', 'technical', 'contact']`
- `underground`: `['music', 'bio', 'technical', 'events', 'photos', 'press', 'contact']`

**Step 4: Fetch photos in public-profile.ts**

In `src/server/public-profile.ts`, add photos to the parallel fetch (around line 34-50):

Add to the destructured array:
```ts
{ data: photos },
```

Add to the `Promise.all` array:
```ts
supabase.from('photos').select('*').eq('profile_id', profileId).order('sort_order'),
```

Add to the return object:
```ts
photos: photos || [],
```

**Step 5: Verify dev server**

Run: `npm run dev`
Expected: No errors. Photos section appears in the Pages dashboard ordering list.

**Step 6: Commit**

```bash
git add src/routes/_dashboard/dashboard.pages.tsx src/components/SortableSectionList.tsx src/utils/templates.ts src/server/public-profile.ts
git commit -m "feat: register photos section in section system and fetch in public profile"
```

---

## Task 9: Photo gallery — Public page rendering with lightbox

**Files:**
- Modify: `src/routes/$slug.tsx` — add photos section renderer + lightbox component

**Step 1: Add PhotoRow type and photos data**

At the top of `$slug.tsx` with the other type imports, add:

```ts
type PhotoRow = { id: string; image_url: string; caption: string | null; sort_order: number }
```

In the component where `data` is destructured, add:

```ts
const photos = (data?.photos || []) as PhotoRow[]
```

**Step 2: Add lightbox state**

In the EPK component, add state for the lightbox:

```ts
const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
```

**Step 3: Add photos section renderer**

In the `sectionRenderers` map (after `events`), add:

```tsx
photos: photos.length > 0 ? (
  <EPKSection key="photos" id="photos" heading="Photos">
    <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4">
      {photos.map((photo: PhotoRow, index: number) => (
        <button
          key={photo.id}
          type="button"
          onClick={() => setLightboxIndex(index)}
          className="w-full break-inside-avoid overflow-hidden border border-current/5 hover:border-accent/30 transition-all cursor-pointer group block"
        >
          <img
            src={photo.image_url}
            alt={photo.caption || ''}
            className="w-full h-auto group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
          {photo.caption && (
            <div className={`px-3 py-2 ${cardBgClass}`}>
              <p className={`text-xs ${textSecClass}`}>{photo.caption}</p>
            </div>
          )}
        </button>
      ))}
    </div>
  </EPKSection>
) : null,
```

**Step 4: Add lightbox component**

After the closing `</main>` tag (but still inside the root div), add the lightbox:

```tsx
{/* Photo Lightbox */}
{lightboxIndex !== null && photos.length > 0 && (
  <div
    className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
    onClick={() => setLightboxIndex(null)}
    onKeyDown={(e) => {
      if (e.key === 'Escape') setLightboxIndex(null)
      if (e.key === 'ArrowLeft') setLightboxIndex((prev) => prev !== null && prev > 0 ? prev - 1 : prev)
      if (e.key === 'ArrowRight') setLightboxIndex((prev) => prev !== null && prev < photos.length - 1 ? prev + 1 : prev)
    }}
    tabIndex={0}
    role="dialog"
    aria-modal="true"
    ref={(el) => el?.focus()}
  >
    {/* Close button */}
    <button
      onClick={() => setLightboxIndex(null)}
      className="absolute top-4 right-4 text-white/70 hover:text-white text-2xl z-10"
      aria-label="Close lightbox"
    >
      ✕
    </button>

    {/* Previous arrow */}
    {lightboxIndex > 0 && (
      <button
        onClick={(e) => { e.stopPropagation(); setLightboxIndex(lightboxIndex - 1) }}
        className="absolute left-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white text-3xl z-10"
        aria-label="Previous photo"
      >
        ‹
      </button>
    )}

    {/* Next arrow */}
    {lightboxIndex < photos.length - 1 && (
      <button
        onClick={(e) => { e.stopPropagation(); setLightboxIndex(lightboxIndex + 1) }}
        className="absolute right-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white text-3xl z-10"
        aria-label="Next photo"
      >
        ›
      </button>
    )}

    {/* Image + caption */}
    <div onClick={(e) => e.stopPropagation()} className="max-w-5xl max-h-[90vh] flex flex-col items-center">
      <img
        src={photos[lightboxIndex].image_url}
        alt={photos[lightboxIndex].caption || ''}
        className="max-w-full max-h-[80vh] object-contain"
      />
      {photos[lightboxIndex].caption && (
        <p className="text-white/70 text-sm mt-3 text-center px-4">
          {photos[lightboxIndex].caption}
        </p>
      )}
      <p className="text-white/40 text-xs mt-2">
        {lightboxIndex + 1} / {photos.length}
      </p>
    </div>
  </div>
)}
```

**Step 5: Verify on public page**

Run: `npm run dev`
Add some photos via dashboard, view the public EPK. Verify:
- Photos section appears in correct order
- Masonry grid layout works
- Clicking opens lightbox
- Arrow keys and click navigation work
- Escape / click outside closes lightbox
- Captions display

**Step 6: Commit**

```bash
git add src/routes/\$slug.tsx
git commit -m "feat: photo gallery section with masonry grid and lightbox on public EPK"
```

---

## Task 10: Animated section transitions — Profile-aware FadeIn

**Files:**
- Modify: `src/components/FadeIn.tsx` — accept `enabled` prop
- Modify: `src/components/EPKSection.tsx` — pass `animate` prop through
- Modify: `src/routes/$slug.tsx` — pass `animate_sections` profile field to sections

**Step 1: Update FadeIn to accept enabled prop**

Replace `src/components/FadeIn.tsx`:

```tsx
import { useInView } from '~/hooks/useInView'
import type { ReactNode } from 'react'

export function FadeIn({ children, className = '', enabled = true }: { children: ReactNode; className?: string; enabled?: boolean }) {
  const { ref, inView } = useInView()

  if (!enabled) {
    return <div className={className}>{children}</div>
  }

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 motion-reduce:transition-none ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 motion-reduce:opacity-100 motion-reduce:translate-y-0'} ${className}`}
    >
      {children}
    </div>
  )
}
```

**Step 2: Update EPKSection to accept animate prop**

Replace `src/components/EPKSection.tsx`:

```tsx
import { FadeIn } from './FadeIn'
import { SectionHeading } from './SectionHeading'

interface EPKSectionProps {
  id: string
  heading: React.ReactNode
  maxWidth?: 'max-w-4xl' | 'max-w-6xl'
  children: React.ReactNode
  animate?: boolean
}

export function EPKSection({ id, heading, maxWidth = 'max-w-6xl', children, animate = true }: EPKSectionProps) {
  return (
    <FadeIn enabled={animate}>
      <section id={id} className="py-20 px-4">
        <div className={`${maxWidth} mx-auto`}>
          <SectionHeading>{heading}</SectionHeading>
          {children}
        </div>
      </section>
    </FadeIn>
  )
}
```

**Step 3: Pass animate_sections to EPKSection in $slug.tsx**

In the EPK component, derive the animate flag:

```ts
const animateSections = profile.animate_sections !== false
```

Then update every `<EPKSection>` usage in the `sectionRenderers` map to include `animate={animateSections}`:

```tsx
<EPKSection key="bio" id="bio" heading="Bio" animate={animateSections}>
<EPKSection key="music" id="music" heading="Listen" animate={animateSections}>
<EPKSection key="events" id="events" heading={...} animate={animateSections}>
<EPKSection key="photos" id="photos" heading="Photos" animate={animateSections}>
<EPKSection key="technical" id="technical" heading="Technical Rider" animate={animateSections}>
<EPKSection key="press" id="press" heading="Press Assets" animate={animateSections}>
<EPKSection key="contact" id="contact" heading="Booking Contact" maxWidth="max-w-4xl" animate={animateSections}>
```

Also update the integration sections further down (listen-embeds, newsletter, etc.) to pass `animate={animateSections}`.

**Step 4: Verify**

Run: `npm run dev`
View public EPK — sections should animate in on scroll. Set `animate_sections = false` in database to verify they render immediately.

**Step 5: Commit**

```bash
git add src/components/FadeIn.tsx src/components/EPKSection.tsx src/routes/\$slug.tsx
git commit -m "feat: profile-aware animated section transitions with reduced-motion support"
```

---

## Task 11: Animated section transitions — Dashboard toggle

**Files:**
- Modify: `src/routes/_dashboard/dashboard.theme.tsx` — add animate toggle

**Step 1: Add animate_sections to the theme form**

In `dashboard.theme.tsx`, update the form schema pick to include `animate_sections`:

```ts
const { register, handleSubmit, watch, formState: { errors, isDirty }, setValue } = useForm<Pick<ProfileUpdate, 'accent_color' | 'bg_color' | 'font_family' | 'template' | 'animate_sections'>>({
  resolver: zodResolver(profileUpdateSchema.pick({ accent_color: true, bg_color: true, font_family: true, template: true, animate_sections: true }).partial()),
  defaultValues: {
    accent_color: initial?.accent_color || '#3b82f6',
    bg_color: initial?.bg_color || '#0a0a0f',
    font_family: initial?.font_family || 'Inter',
    template: (initial?.template as ProfileUpdate['template']) || 'default',
    animate_sections: initial?.animate_sections !== false,
  },
})
```

Watch the value:
```ts
const animateSections = watch('animate_sections') !== false
```

**Step 2: Add toggle in the theme page JSX**

After the existing form fields (colors, fonts, template), add a section for animation:

```tsx
<div className="mt-8 pt-8 border-t border-border">
  <label className={FORM_LABEL}>Animation</label>
  <div className="flex items-center justify-between bg-white border border-border p-4">
    <div>
      <p className="text-sm font-medium">Animate sections on scroll</p>
      <p className="text-xs text-text-secondary mt-0.5">Sections fade in as visitors scroll down your EPK</p>
    </div>
    <button
      type="button"
      onClick={() => setValue('animate_sections', !animateSections, { shouldDirty: true })}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
        animateSections ? 'bg-accent' : 'bg-text-secondary/30'
      }`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
          animateSections ? 'translate-x-[18px]' : 'translate-x-[3px]'
        }`}
      />
    </button>
  </div>
</div>
```

**Step 3: Verify in browser**

Run: `npm run dev`
Navigate to `/dashboard/theme`. Verify:
- Animation toggle appears below existing theme options
- Toggle changes form dirty state
- Saving persists the value
- Public page respects the setting

**Step 4: Commit**

```bash
git add src/routes/_dashboard/dashboard.theme.tsx
git commit -m "feat: animate sections toggle on theme dashboard page"
```

---

## Task 12: Final verification and cleanup

**Step 1: Run build**

Run: `npm run build`
Expected: No TypeScript errors, build succeeds.

**Step 2: Manual QA checklist**

- [ ] Video hero: upload video on dashboard, see it play on public page
- [ ] Video hero: mobile viewport shows image fallback
- [ ] Video hero: validation rejects >50MB, >30s, wrong format
- [ ] Video hero: preview shows video with overlay text
- [ ] Video hero: switching image↔video clears the other URL
- [ ] Photos: add/edit/delete/reorder photos on dashboard
- [ ] Photos: 20 photo limit enforced
- [ ] Photos: masonry grid on public page
- [ ] Photos: lightbox opens, navigates, closes (keyboard + click)
- [ ] Photos: section appears in Pages ordering
- [ ] Animation: toggle on Theme page persists
- [ ] Animation: sections animate on scroll when enabled
- [ ] Animation: sections render immediately when disabled
- [ ] Animation: `prefers-reduced-motion` disables animations

**Step 3: Final commit if any cleanup needed**

```bash
git add -A
git commit -m "feat: creative features — video hero, photo gallery, animated transitions"
```
