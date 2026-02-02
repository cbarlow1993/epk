# Phase 2: Content Management — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add all remaining dashboard content editors: mixes, events, technical rider, press assets, booking contact, and social links — each with CRUD, reordering, image uploads, and auto-save.

**Architecture:** Each content section gets a server functions file for CRUD operations and a dashboard route page. All editors follow the same pattern: load data via `loader`, auto-save on change (debounced), drag-to-reorder via sort_order field. Image uploads go to Supabase Storage "uploads" bucket.

**Tech Stack:** Supabase (Postgres + Storage), @supabase/ssr, TanStack Start, Tailwind CSS v4

---

### Task 1: Shared Upload Utility

**Files:**
- Create: `src/server/upload.ts`
- Create: `src/utils/upload.ts`

**Step 1: Create `src/server/upload.ts`**

Server function that accepts a file (as base64 + metadata) and uploads it to Supabase Storage.

```ts
import { createServerFn } from '@tanstack/react-start'
import { getSupabaseServerClient } from '~/utils/supabase'
import { getWebRequest } from '@tanstack/react-start/server'

export const uploadFile = createServerFn({ method: 'POST' })
  .validator((data: { base64: string; fileName: string; contentType: string; folder: string }) => data)
  .handler(async ({ data }) => {
    const request = getWebRequest()
    const { supabase } = getSupabaseServerClient(request)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    const buffer = Buffer.from(data.base64, 'base64')
    const path = `${user.id}/${data.folder}/${Date.now()}-${data.fileName}`

    const { error } = await supabase.storage
      .from('uploads')
      .upload(path, buffer, { contentType: data.contentType, upsert: false })

    if (error) return { error: error.message }

    const { data: urlData } = supabase.storage.from('uploads').getPublicUrl(path)
    return { url: urlData.publicUrl }
  })
```

**Step 2: Create `src/utils/upload.ts`**

Client-side helper to convert a File to base64 and call the server function.

```ts
import { uploadFile } from '~/server/upload'

export async function uploadFileFromInput(file: File, folder: string): Promise<string | null> {
  const base64 = await fileToBase64(file)
  const result = await uploadFile({
    data: {
      base64,
      fileName: file.name,
      contentType: file.type,
      folder,
    },
  })
  if ('error' in result) {
    console.error('Upload failed:', result.error)
    return null
  }
  return result.url
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      resolve(dataUrl.split(',')[1])
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
```

**Step 3: Verify dev server starts**

```bash
npm run dev
```

**Step 4: Commit**

```bash
git add -A && git commit -m "feat: add file upload utility for Supabase Storage"
```

---

### Task 2: Mixes / Music Editor

**Files:**
- Create: `src/server/mixes.ts`
- Create: `src/routes/_dashboard/dashboard.music.tsx`

**Step 1: Create `src/server/mixes.ts`**

```ts
import { createServerFn } from '@tanstack/react-start'
import { getSupabaseServerClient } from '~/utils/supabase'
import { getWebRequest } from '@tanstack/react-start/server'

export const getMixes = createServerFn({ method: 'GET' }).handler(async () => {
  const request = getWebRequest()
  const { supabase } = getSupabaseServerClient(request)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('mixes')
    .select('*')
    .eq('profile_id', user.id)
    .order('sort_order')

  return data || []
})

export const upsertMix = createServerFn({ method: 'POST' })
  .validator((data: {
    id?: string
    title: string
    url: string
    category: string
    thumbnail_url?: string
    sort_order?: number
  }) => data)
  .handler(async ({ data }) => {
    const request = getWebRequest()
    const { supabase } = getSupabaseServerClient(request)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    if (data.id) {
      const { data: mix, error } = await supabase
        .from('mixes')
        .update({ title: data.title, url: data.url, category: data.category, thumbnail_url: data.thumbnail_url, sort_order: data.sort_order })
        .eq('id', data.id)
        .eq('profile_id', user.id)
        .select()
        .single()
      if (error) return { error: error.message }
      return { mix }
    }

    const { data: mix, error } = await supabase
      .from('mixes')
      .insert({ profile_id: user.id, title: data.title, url: data.url, category: data.category, thumbnail_url: data.thumbnail_url, sort_order: data.sort_order ?? 0 })
      .select()
      .single()
    if (error) return { error: error.message }
    return { mix }
  })

export const deleteMix = createServerFn({ method: 'POST' })
  .validator((id: string) => id)
  .handler(async ({ data: id }) => {
    const request = getWebRequest()
    const { supabase } = getSupabaseServerClient(request)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    const { error } = await supabase.from('mixes').delete().eq('id', id).eq('profile_id', user.id)
    if (error) return { error: error.message }
    return { success: true }
  })

export const reorderMixes = createServerFn({ method: 'POST' })
  .validator((data: { ids: string[] }) => data)
  .handler(async ({ data }) => {
    const request = getWebRequest()
    const { supabase } = getSupabaseServerClient(request)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    for (let i = 0; i < data.ids.length; i++) {
      await supabase.from('mixes').update({ sort_order: i }).eq('id', data.ids[i]).eq('profile_id', user.id)
    }
    return { success: true }
  })
```

**Step 2: Create `src/routes/_dashboard/dashboard.music.tsx`**

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { getMixes, upsertMix, deleteMix, reorderMixes } from '~/server/mixes'

export const Route = createFileRoute('/_dashboard/dashboard/music')({
  loader: () => getMixes(),
  component: MusicEditor,
})

interface Mix {
  id: string
  title: string
  url: string
  category: string
  thumbnail_url: string
  sort_order: number
}

const CATEGORIES = ['commercial', 'melodic', 'progressive', 'tech-house', 'deep-house', 'other']

function MusicEditor() {
  const initialMixes = Route.useLoaderData() as Mix[]
  const [mixes, setMixes] = useState(initialMixes)
  const [editing, setEditing] = useState<string | null>(null)
  const [form, setForm] = useState({ title: '', url: '', category: 'commercial' })

  const handleAdd = async () => {
    const result = await upsertMix({ data: { ...form, sort_order: mixes.length } })
    if ('mix' in result && result.mix) {
      setMixes([...mixes, result.mix as Mix])
      setForm({ title: '', url: '', category: 'commercial' })
    }
  }

  const handleUpdate = async (mix: Mix) => {
    await upsertMix({ data: { id: mix.id, title: mix.title, url: mix.url, category: mix.category, sort_order: mix.sort_order } })
  }

  const handleDelete = async (id: string) => {
    await deleteMix({ data: id })
    setMixes(mixes.filter((m) => m.id !== id))
  }

  const handleMoveUp = async (index: number) => {
    if (index === 0) return
    const newMixes = [...mixes]
    ;[newMixes[index - 1], newMixes[index]] = [newMixes[index], newMixes[index - 1]]
    setMixes(newMixes)
    await reorderMixes({ data: { ids: newMixes.map((m) => m.id) } })
  }

  const handleMoveDown = async (index: number) => {
    if (index === mixes.length - 1) return
    const newMixes = [...mixes]
    ;[newMixes[index], newMixes[index + 1]] = [newMixes[index + 1], newMixes[index]]
    setMixes(newMixes)
    await reorderMixes({ data: { ids: newMixes.map((m) => m.id) } })
  }

  return (
    <div>
      <h1 className="text-2xl font-black uppercase tracking-wider mb-8">Music</h1>

      {/* Add new mix */}
      <div className="bg-dark-card border border-white/10 rounded-lg p-4 mb-8 space-y-4">
        <p className="text-sm uppercase tracking-widest font-bold">Add Mix</p>
        <input
          type="text"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          placeholder="Mix title"
          className="w-full bg-dark-bg border border-white/10 rounded-lg px-4 py-2 text-white text-sm focus:border-accent focus:outline-none"
        />
        <input
          type="url"
          value={form.url}
          onChange={(e) => setForm({ ...form, url: e.target.value })}
          placeholder="SoundCloud / Mixcloud URL"
          className="w-full bg-dark-bg border border-white/10 rounded-lg px-4 py-2 text-white text-sm focus:border-accent focus:outline-none"
        />
        <select
          value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value })}
          className="bg-dark-bg border border-white/10 rounded-lg px-4 py-2 text-white text-sm focus:border-accent focus:outline-none"
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1).replace('-', ' ')}</option>
          ))}
        </select>
        <button
          onClick={handleAdd}
          disabled={!form.title || !form.url}
          className="bg-accent hover:bg-accent/80 disabled:opacity-30 text-white text-sm font-bold uppercase tracking-widest px-6 py-2 rounded-lg transition-colors"
        >
          Add
        </button>
      </div>

      {/* Existing mixes */}
      <div className="space-y-3">
        {mixes.map((mix, i) => (
          <div key={mix.id} className="bg-dark-card border border-white/5 rounded-lg p-4 flex items-center gap-4">
            <div className="flex flex-col gap-1">
              <button onClick={() => handleMoveUp(i)} className="text-text-secondary hover:text-white text-xs">▲</button>
              <button onClick={() => handleMoveDown(i)} className="text-text-secondary hover:text-white text-xs">▼</button>
            </div>
            <div className="flex-1 min-w-0">
              {editing === mix.id ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={mix.title}
                    onChange={(e) => setMixes(mixes.map((m) => m.id === mix.id ? { ...m, title: e.target.value } : m))}
                    className="w-full bg-dark-bg border border-white/10 rounded px-3 py-1 text-white text-sm focus:border-accent focus:outline-none"
                  />
                  <input
                    type="url"
                    value={mix.url}
                    onChange={(e) => setMixes(mixes.map((m) => m.id === mix.id ? { ...m, url: e.target.value } : m))}
                    className="w-full bg-dark-bg border border-white/10 rounded px-3 py-1 text-white text-sm focus:border-accent focus:outline-none"
                  />
                  <button
                    onClick={() => { handleUpdate(mix); setEditing(null) }}
                    className="text-accent text-xs hover:underline"
                  >
                    Save
                  </button>
                </div>
              ) : (
                <>
                  <p className="text-sm font-bold truncate">{mix.title}</p>
                  <p className="text-xs text-text-secondary truncate">{mix.url}</p>
                  <span className="text-xs text-accent">{mix.category}</span>
                </>
              )}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setEditing(editing === mix.id ? null : mix.id)} className="text-text-secondary hover:text-white text-xs">
                {editing === mix.id ? 'Cancel' : 'Edit'}
              </button>
              <button onClick={() => handleDelete(mix.id)} className="text-red-400 hover:text-red-300 text-xs">Delete</button>
            </div>
          </div>
        ))}
        {mixes.length === 0 && <p className="text-text-secondary text-sm">No mixes yet. Add your first mix above.</p>}
      </div>
    </div>
  )
}
```

**Step 3: Verify music editor loads and CRUD works**

**Step 4: Commit**

```bash
git add -A && git commit -m "feat: add mixes/music dashboard editor with CRUD and reordering"
```

---

### Task 3: Events Editor with Image Upload

**Files:**
- Create: `src/server/events.ts`
- Create: `src/routes/_dashboard/dashboard.events.tsx`

**Step 1: Create `src/server/events.ts`**

```ts
import { createServerFn } from '@tanstack/react-start'
import { getSupabaseServerClient } from '~/utils/supabase'
import { getWebRequest } from '@tanstack/react-start/server'

export const getEvents = createServerFn({ method: 'GET' }).handler(async () => {
  const request = getWebRequest()
  const { supabase } = getSupabaseServerClient(request)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('events')
    .select('*')
    .eq('profile_id', user.id)
    .order('sort_order')

  return data || []
})

export const upsertEvent = createServerFn({ method: 'POST' })
  .validator((data: {
    id?: string
    name: string
    image_url?: string
    link_url?: string
    sort_order?: number
  }) => data)
  .handler(async ({ data }) => {
    const request = getWebRequest()
    const { supabase } = getSupabaseServerClient(request)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    if (data.id) {
      const { data: event, error } = await supabase
        .from('events')
        .update({ name: data.name, image_url: data.image_url, link_url: data.link_url, sort_order: data.sort_order })
        .eq('id', data.id)
        .eq('profile_id', user.id)
        .select()
        .single()
      if (error) return { error: error.message }
      return { event }
    }

    const { data: event, error } = await supabase
      .from('events')
      .insert({ profile_id: user.id, name: data.name, image_url: data.image_url, link_url: data.link_url, sort_order: data.sort_order ?? 0 })
      .select()
      .single()
    if (error) return { error: error.message }
    return { event }
  })

export const deleteEvent = createServerFn({ method: 'POST' })
  .validator((id: string) => id)
  .handler(async ({ data: id }) => {
    const request = getWebRequest()
    const { supabase } = getSupabaseServerClient(request)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    const { error } = await supabase.from('events').delete().eq('id', id).eq('profile_id', user.id)
    if (error) return { error: error.message }
    return { success: true }
  })

export const reorderEvents = createServerFn({ method: 'POST' })
  .validator((data: { ids: string[] }) => data)
  .handler(async ({ data }) => {
    const request = getWebRequest()
    const { supabase } = getSupabaseServerClient(request)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    for (let i = 0; i < data.ids.length; i++) {
      await supabase.from('events').update({ sort_order: i }).eq('id', data.ids[i]).eq('profile_id', user.id)
    }
    return { success: true }
  })
```

**Step 2: Create `src/routes/_dashboard/dashboard.events.tsx`**

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { useState, useRef } from 'react'
import { getEvents, upsertEvent, deleteEvent, reorderEvents } from '~/server/events'
import { uploadFileFromInput } from '~/utils/upload'

export const Route = createFileRoute('/_dashboard/dashboard/events')({
  loader: () => getEvents(),
  component: EventsEditor,
})

interface Event {
  id: string
  name: string
  image_url: string
  link_url: string
  sort_order: number
}

function EventsEditor() {
  const initialEvents = Route.useLoaderData() as Event[]
  const [events, setEvents] = useState(initialEvents)
  const [form, setForm] = useState({ name: '', link_url: '' })
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const [pendingFile, setPendingFile] = useState<File | null>(null)

  const handleAdd = async () => {
    let image_url = ''
    if (pendingFile) {
      setUploading(true)
      image_url = (await uploadFileFromInput(pendingFile, 'events')) || ''
      setUploading(false)
    }
    const result = await upsertEvent({ data: { name: form.name, image_url, link_url: form.link_url, sort_order: events.length } })
    if ('event' in result && result.event) {
      setEvents([...events, result.event as Event])
      setForm({ name: '', link_url: '' })
      setPendingFile(null)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const handleDelete = async (id: string) => {
    await deleteEvent({ data: id })
    setEvents(events.filter((e) => e.id !== id))
  }

  const handleMoveUp = async (index: number) => {
    if (index === 0) return
    const updated = [...events]
    ;[updated[index - 1], updated[index]] = [updated[index], updated[index - 1]]
    setEvents(updated)
    await reorderEvents({ data: { ids: updated.map((e) => e.id) } })
  }

  const handleMoveDown = async (index: number) => {
    if (index === events.length - 1) return
    const updated = [...events]
    ;[updated[index], updated[index + 1]] = [updated[index + 1], updated[index]]
    setEvents(updated)
    await reorderEvents({ data: { ids: updated.map((e) => e.id) } })
  }

  return (
    <div>
      <h1 className="text-2xl font-black uppercase tracking-wider mb-8">Events & Brands</h1>

      {/* Add new event */}
      <div className="bg-dark-card border border-white/10 rounded-lg p-4 mb-8 space-y-4">
        <p className="text-sm uppercase tracking-widest font-bold">Add Event</p>
        <input
          type="text"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Event / brand name"
          className="w-full bg-dark-bg border border-white/10 rounded-lg px-4 py-2 text-white text-sm focus:border-accent focus:outline-none"
        />
        <input
          type="url"
          value={form.link_url}
          onChange={(e) => setForm({ ...form, link_url: e.target.value })}
          placeholder="Link URL (optional)"
          className="w-full bg-dark-bg border border-white/10 rounded-lg px-4 py-2 text-white text-sm focus:border-accent focus:outline-none"
        />
        <div>
          <label className="block text-xs text-text-secondary mb-1">Image (square recommended)</label>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={(e) => setPendingFile(e.target.files?.[0] || null)}
            className="text-sm text-text-secondary"
          />
        </div>
        <button
          onClick={handleAdd}
          disabled={!form.name || uploading}
          className="bg-accent hover:bg-accent/80 disabled:opacity-30 text-white text-sm font-bold uppercase tracking-widest px-6 py-2 rounded-lg transition-colors"
        >
          {uploading ? 'Uploading...' : 'Add'}
        </button>
      </div>

      {/* Existing events grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {events.map((event, i) => (
          <div key={event.id} className="group relative rounded-lg overflow-hidden border border-white/5">
            <div className="aspect-square overflow-hidden bg-dark-surface">
              {event.image_url ? (
                <img src={event.image_url} alt={event.name} className="w-full h-full object-cover object-center" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-text-secondary text-xs">No image</div>
              )}
            </div>
            <div className="bg-dark-card/80 px-3 py-2">
              <p className="text-xs text-center text-text-secondary truncate">{event.name}</p>
            </div>
            {/* Overlay controls on hover */}
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <button onClick={() => handleMoveUp(i)} className="text-white text-xs bg-white/20 rounded px-2 py-1">▲</button>
              <button onClick={() => handleMoveDown(i)} className="text-white text-xs bg-white/20 rounded px-2 py-1">▼</button>
              <button onClick={() => handleDelete(event.id)} className="text-red-400 text-xs bg-white/20 rounded px-2 py-1">✕</button>
            </div>
          </div>
        ))}
      </div>
      {events.length === 0 && <p className="text-text-secondary text-sm">No events yet.</p>}
    </div>
  )
}
```

**Step 3: Verify events editor works with image upload**

**Step 4: Commit**

```bash
git add -A && git commit -m "feat: add events dashboard editor with image upload and reordering"
```

---

### Task 4: Technical Rider Editor

**Files:**
- Create: `src/server/technical-rider.ts`
- Create: `src/routes/_dashboard/dashboard.technical.tsx`

**Step 1: Create `src/server/technical-rider.ts`**

```ts
import { createServerFn } from '@tanstack/react-start'
import { getSupabaseServerClient } from '~/utils/supabase'
import { getWebRequest } from '@tanstack/react-start/server'

export const getTechnicalRider = createServerFn({ method: 'GET' }).handler(async () => {
  const request = getWebRequest()
  const { supabase } = getSupabaseServerClient(request)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('technical_rider')
    .select('*')
    .eq('profile_id', user.id)
    .single()

  return data
})

export const updateTechnicalRider = createServerFn({ method: 'POST' })
  .validator((data: { preferred_setup?: string; alternative_setup?: string }) => data)
  .handler(async ({ data }) => {
    const request = getWebRequest()
    const { supabase } = getSupabaseServerClient(request)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    const { data: rider, error } = await supabase
      .from('technical_rider')
      .update(data)
      .eq('profile_id', user.id)
      .select()
      .single()

    if (error) return { error: error.message }
    return { rider }
  })
```

**Step 2: Create `src/routes/_dashboard/dashboard.technical.tsx`**

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { useState, useCallback } from 'react'
import { getTechnicalRider, updateTechnicalRider } from '~/server/technical-rider'

export const Route = createFileRoute('/_dashboard/dashboard/technical')({
  loader: () => getTechnicalRider(),
  component: TechnicalRiderEditor,
})

function TechnicalRiderEditor() {
  const initial = Route.useLoaderData()
  const [preferred, setPreferred] = useState(initial?.preferred_setup || '')
  const [alternative, setAlternative] = useState(initial?.alternative_setup || '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const [timer, setTimer] = useState<ReturnType<typeof setTimeout> | null>(null)
  const autoSave = useCallback((field: string, value: string) => {
    if (timer) clearTimeout(timer)
    const t = setTimeout(async () => {
      setSaving(true)
      setSaved(false)
      await updateTechnicalRider({ data: { [field]: value } })
      setSaving(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }, 800)
    setTimer(t)
  }, [timer])

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-black uppercase tracking-wider">Technical Rider</h1>
        <span className="text-xs text-text-secondary">
          {saving ? 'Saving...' : saved ? 'Saved' : ''}
        </span>
      </div>

      <div className="space-y-6 max-w-2xl">
        <div>
          <label className="block text-sm uppercase tracking-widest font-bold mb-2">Preferred Setup</label>
          <textarea
            value={preferred}
            onChange={(e) => { setPreferred(e.target.value); autoSave('preferred_setup', e.target.value) }}
            rows={8}
            className="w-full bg-dark-card border border-white/10 rounded-lg px-4 py-3 text-white text-sm leading-relaxed focus:border-accent focus:outline-none transition-colors resize-none"
            placeholder="e.g. 2 x CDJ-3000, 1 x DJM-900NXS2..."
          />
        </div>
        <div>
          <label className="block text-sm uppercase tracking-widest font-bold mb-2">Alternative Setup</label>
          <textarea
            value={alternative}
            onChange={(e) => { setAlternative(e.target.value); autoSave('alternative_setup', e.target.value) }}
            rows={8}
            className="w-full bg-dark-card border border-white/10 rounded-lg px-4 py-3 text-white text-sm leading-relaxed focus:border-accent focus:outline-none transition-colors resize-none"
            placeholder="e.g. 2 x CDJ-2000NXS2..."
          />
        </div>
      </div>
    </div>
  )
}
```

**Step 3: Verify technical rider editor loads and auto-saves**

**Step 4: Commit**

```bash
git add -A && git commit -m "feat: add technical rider dashboard editor with auto-save"
```

---

### Task 5: Booking Contact Editor

**Files:**
- Create: `src/server/booking-contact.ts`
- Create: `src/routes/_dashboard/dashboard.contact.tsx`

**Step 1: Create `src/server/booking-contact.ts`**

```ts
import { createServerFn } from '@tanstack/react-start'
import { getSupabaseServerClient } from '~/utils/supabase'
import { getWebRequest } from '@tanstack/react-start/server'

export const getBookingContact = createServerFn({ method: 'GET' }).handler(async () => {
  const request = getWebRequest()
  const { supabase } = getSupabaseServerClient(request)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('booking_contact')
    .select('*')
    .eq('profile_id', user.id)
    .single()

  return data
})

export const updateBookingContact = createServerFn({ method: 'POST' })
  .validator((data: { manager_name?: string; email?: string; phone?: string; address?: string }) => data)
  .handler(async ({ data }) => {
    const request = getWebRequest()
    const { supabase } = getSupabaseServerClient(request)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    const { data: contact, error } = await supabase
      .from('booking_contact')
      .update(data)
      .eq('profile_id', user.id)
      .select()
      .single()

    if (error) return { error: error.message }
    return { contact }
  })
```

**Step 2: Create `src/routes/_dashboard/dashboard.contact.tsx`**

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { useState, useCallback } from 'react'
import { getBookingContact, updateBookingContact } from '~/server/booking-contact'

export const Route = createFileRoute('/_dashboard/dashboard/contact')({
  loader: () => getBookingContact(),
  component: ContactEditor,
})

function ContactEditor() {
  const initial = Route.useLoaderData()
  const [fields, setFields] = useState({
    manager_name: initial?.manager_name || '',
    email: initial?.email || '',
    phone: initial?.phone || '',
    address: initial?.address || '',
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const [timer, setTimer] = useState<ReturnType<typeof setTimeout> | null>(null)
  const autoSave = useCallback((field: string, value: string) => {
    if (timer) clearTimeout(timer)
    const t = setTimeout(async () => {
      setSaving(true)
      setSaved(false)
      await updateBookingContact({ data: { [field]: value } })
      setSaving(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }, 800)
    setTimer(t)
  }, [timer])

  const handleChange = (field: string, value: string) => {
    setFields((f) => ({ ...f, [field]: value }))
    autoSave(field, value)
  }

  const FIELDS = [
    { key: 'manager_name', label: 'Manager / Agent Name', placeholder: 'e.g. Helen' },
    { key: 'email', label: 'Email', placeholder: 'booking@example.com', type: 'email' },
    { key: 'phone', label: 'Phone', placeholder: '+44 7xxx xxx xxx', type: 'tel' },
    { key: 'address', label: 'Address', placeholder: 'City, Country' },
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-black uppercase tracking-wider">Booking Contact</h1>
        <span className="text-xs text-text-secondary">
          {saving ? 'Saving...' : saved ? 'Saved' : ''}
        </span>
      </div>

      <div className="space-y-6 max-w-2xl">
        {FIELDS.map(({ key, label, placeholder, type }) => (
          <div key={key}>
            <label className="block text-sm uppercase tracking-widest font-bold mb-2">{label}</label>
            <input
              type={type || 'text'}
              value={fields[key as keyof typeof fields]}
              onChange={(e) => handleChange(key, e.target.value)}
              placeholder={placeholder}
              className="w-full bg-dark-card border border-white/10 rounded-lg px-4 py-3 text-white focus:border-accent focus:outline-none transition-colors"
            />
          </div>
        ))}
      </div>
    </div>
  )
}
```

**Step 3: Verify contact editor loads and auto-saves**

**Step 4: Commit**

```bash
git add -A && git commit -m "feat: add booking contact dashboard editor with auto-save"
```

---

### Task 6: Social Links Editor

**Files:**
- Create: `src/server/social-links.ts`
- Create: `src/routes/_dashboard/dashboard.socials.tsx`

**Step 1: Create `src/server/social-links.ts`**

```ts
import { createServerFn } from '@tanstack/react-start'
import { getSupabaseServerClient } from '~/utils/supabase'
import { getWebRequest } from '@tanstack/react-start/server'

export const getSocialLinks = createServerFn({ method: 'GET' }).handler(async () => {
  const request = getWebRequest()
  const { supabase } = getSupabaseServerClient(request)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('social_links')
    .select('*')
    .eq('profile_id', user.id)
    .order('sort_order')

  return data || []
})

export const upsertSocialLink = createServerFn({ method: 'POST' })
  .validator((data: {
    id?: string
    platform: string
    url: string
    handle: string
    sort_order?: number
  }) => data)
  .handler(async ({ data }) => {
    const request = getWebRequest()
    const { supabase } = getSupabaseServerClient(request)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    if (data.id) {
      const { data: link, error } = await supabase
        .from('social_links')
        .update({ platform: data.platform, url: data.url, handle: data.handle, sort_order: data.sort_order })
        .eq('id', data.id)
        .eq('profile_id', user.id)
        .select()
        .single()
      if (error) return { error: error.message }
      return { link }
    }

    const { data: link, error } = await supabase
      .from('social_links')
      .insert({ profile_id: user.id, platform: data.platform, url: data.url, handle: data.handle, sort_order: data.sort_order ?? 0 })
      .select()
      .single()
    if (error) return { error: error.message }
    return { link }
  })

export const deleteSocialLink = createServerFn({ method: 'POST' })
  .validator((id: string) => id)
  .handler(async ({ data: id }) => {
    const request = getWebRequest()
    const { supabase } = getSupabaseServerClient(request)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    const { error } = await supabase.from('social_links').delete().eq('id', id).eq('profile_id', user.id)
    if (error) return { error: error.message }
    return { success: true }
  })

export const reorderSocialLinks = createServerFn({ method: 'POST' })
  .validator((data: { ids: string[] }) => data)
  .handler(async ({ data }) => {
    const request = getWebRequest()
    const { supabase } = getSupabaseServerClient(request)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    for (let i = 0; i < data.ids.length; i++) {
      await supabase.from('social_links').update({ sort_order: i }).eq('id', data.ids[i]).eq('profile_id', user.id)
    }
    return { success: true }
  })
```

**Step 2: Create `src/routes/_dashboard/dashboard.socials.tsx`**

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { getSocialLinks, upsertSocialLink, deleteSocialLink, reorderSocialLinks } from '~/server/social-links'

export const Route = createFileRoute('/_dashboard/dashboard/socials')({
  loader: () => getSocialLinks(),
  component: SocialLinksEditor,
})

interface SocialLink {
  id: string
  platform: string
  url: string
  handle: string
  sort_order: number
}

const PLATFORMS = ['instagram', 'soundcloud', 'tiktok', 'twitter', 'youtube', 'spotify', 'facebook', 'mixcloud', 'other']

function SocialLinksEditor() {
  const initialLinks = Route.useLoaderData() as SocialLink[]
  const [links, setLinks] = useState(initialLinks)
  const [form, setForm] = useState({ platform: 'instagram', url: '', handle: '' })

  const handleAdd = async () => {
    const result = await upsertSocialLink({ data: { ...form, sort_order: links.length } })
    if ('link' in result && result.link) {
      setLinks([...links, result.link as SocialLink])
      setForm({ platform: 'instagram', url: '', handle: '' })
    }
  }

  const handleDelete = async (id: string) => {
    await deleteSocialLink({ data: id })
    setLinks(links.filter((l) => l.id !== id))
  }

  const handleMoveUp = async (index: number) => {
    if (index === 0) return
    const updated = [...links]
    ;[updated[index - 1], updated[index]] = [updated[index], updated[index - 1]]
    setLinks(updated)
    await reorderSocialLinks({ data: { ids: updated.map((l) => l.id) } })
  }

  const handleMoveDown = async (index: number) => {
    if (index === links.length - 1) return
    const updated = [...links]
    ;[updated[index], updated[index + 1]] = [updated[index + 1], updated[index]]
    setLinks(updated)
    await reorderSocialLinks({ data: { ids: updated.map((l) => l.id) } })
  }

  return (
    <div>
      <h1 className="text-2xl font-black uppercase tracking-wider mb-8">Social Links</h1>

      {/* Add new link */}
      <div className="bg-dark-card border border-white/10 rounded-lg p-4 mb-8 space-y-4">
        <p className="text-sm uppercase tracking-widest font-bold">Add Social Link</p>
        <select
          value={form.platform}
          onChange={(e) => setForm({ ...form, platform: e.target.value })}
          className="bg-dark-bg border border-white/10 rounded-lg px-4 py-2 text-white text-sm focus:border-accent focus:outline-none"
        >
          {PLATFORMS.map((p) => (
            <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
          ))}
        </select>
        <input
          type="url"
          value={form.url}
          onChange={(e) => setForm({ ...form, url: e.target.value })}
          placeholder="Profile URL"
          className="w-full bg-dark-bg border border-white/10 rounded-lg px-4 py-2 text-white text-sm focus:border-accent focus:outline-none"
        />
        <input
          type="text"
          value={form.handle}
          onChange={(e) => setForm({ ...form, handle: e.target.value })}
          placeholder="Handle (e.g. @issysmithdj)"
          className="w-full bg-dark-bg border border-white/10 rounded-lg px-4 py-2 text-white text-sm focus:border-accent focus:outline-none"
        />
        <button
          onClick={handleAdd}
          disabled={!form.url}
          className="bg-accent hover:bg-accent/80 disabled:opacity-30 text-white text-sm font-bold uppercase tracking-widest px-6 py-2 rounded-lg transition-colors"
        >
          Add
        </button>
      </div>

      {/* Existing links */}
      <div className="space-y-3">
        {links.map((link, i) => (
          <div key={link.id} className="bg-dark-card border border-white/5 rounded-lg p-4 flex items-center gap-4">
            <div className="flex flex-col gap-1">
              <button onClick={() => handleMoveUp(i)} className="text-text-secondary hover:text-white text-xs">▲</button>
              <button onClick={() => handleMoveDown(i)} className="text-text-secondary hover:text-white text-xs">▼</button>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold capitalize">{link.platform}</p>
              <p className="text-xs text-text-secondary truncate">{link.handle || link.url}</p>
            </div>
            <button onClick={() => handleDelete(link.id)} className="text-red-400 hover:text-red-300 text-xs">Delete</button>
          </div>
        ))}
        {links.length === 0 && <p className="text-text-secondary text-sm">No social links yet.</p>}
      </div>
    </div>
  )
}
```

**Step 3: Verify social links editor works**

**Step 4: Commit**

```bash
git add -A && git commit -m "feat: add social links dashboard editor with CRUD and reordering"
```

---

### Task 7: Press Assets Editor with File Upload

**Files:**
- Create: `src/server/press-assets.ts`
- Create: `src/routes/_dashboard/dashboard.press.tsx`

**Step 1: Create `src/server/press-assets.ts`**

```ts
import { createServerFn } from '@tanstack/react-start'
import { getSupabaseServerClient } from '~/utils/supabase'
import { getWebRequest } from '@tanstack/react-start/server'

export const getPressAssets = createServerFn({ method: 'GET' }).handler(async () => {
  const request = getWebRequest()
  const { supabase } = getSupabaseServerClient(request)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('press_assets')
    .select('*')
    .eq('profile_id', user.id)
    .order('sort_order')

  return data || []
})

export const upsertPressAsset = createServerFn({ method: 'POST' })
  .validator((data: {
    id?: string
    title: string
    file_url: string
    type: string
    sort_order?: number
  }) => data)
  .handler(async ({ data }) => {
    const request = getWebRequest()
    const { supabase } = getSupabaseServerClient(request)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    if (data.id) {
      const { data: asset, error } = await supabase
        .from('press_assets')
        .update({ title: data.title, file_url: data.file_url, type: data.type, sort_order: data.sort_order })
        .eq('id', data.id)
        .eq('profile_id', user.id)
        .select()
        .single()
      if (error) return { error: error.message }
      return { asset }
    }

    const { data: asset, error } = await supabase
      .from('press_assets')
      .insert({ profile_id: user.id, title: data.title, file_url: data.file_url, type: data.type, sort_order: data.sort_order ?? 0 })
      .select()
      .single()
    if (error) return { error: error.message }
    return { asset }
  })

export const deletePressAsset = createServerFn({ method: 'POST' })
  .validator((id: string) => id)
  .handler(async ({ data: id }) => {
    const request = getWebRequest()
    const { supabase } = getSupabaseServerClient(request)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    const { error } = await supabase.from('press_assets').delete().eq('id', id).eq('profile_id', user.id)
    if (error) return { error: error.message }
    return { success: true }
  })
```

**Step 2: Create `src/routes/_dashboard/dashboard.press.tsx`**

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { useState, useRef } from 'react'
import { getPressAssets, upsertPressAsset, deletePressAsset } from '~/server/press-assets'
import { uploadFileFromInput } from '~/utils/upload'

export const Route = createFileRoute('/_dashboard/dashboard/press')({
  loader: () => getPressAssets(),
  component: PressAssetsEditor,
})

interface PressAsset {
  id: string
  title: string
  file_url: string
  type: string
  sort_order: number
}

const ASSET_TYPES = ['photo', 'video', 'logo']

function PressAssetsEditor() {
  const initialAssets = Route.useLoaderData() as PressAsset[]
  const [assets, setAssets] = useState(initialAssets)
  const [form, setForm] = useState({ title: '', type: 'photo' })
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const [pendingFile, setPendingFile] = useState<File | null>(null)

  const handleAdd = async () => {
    if (!pendingFile) return
    setUploading(true)
    const file_url = (await uploadFileFromInput(pendingFile, 'press')) || ''
    setUploading(false)
    if (!file_url) return

    const result = await upsertPressAsset({
      data: { title: form.title || pendingFile.name, file_url, type: form.type, sort_order: assets.length },
    })
    if ('asset' in result && result.asset) {
      setAssets([...assets, result.asset as PressAsset])
      setForm({ title: '', type: 'photo' })
      setPendingFile(null)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const handleDelete = async (id: string) => {
    await deletePressAsset({ data: id })
    setAssets(assets.filter((a) => a.id !== id))
  }

  return (
    <div>
      <h1 className="text-2xl font-black uppercase tracking-wider mb-8">Press Assets</h1>

      {/* Upload new asset */}
      <div className="bg-dark-card border border-white/10 rounded-lg p-4 mb-8 space-y-4">
        <p className="text-sm uppercase tracking-widest font-bold">Upload Asset</p>
        <input
          type="text"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          placeholder="Title (optional, defaults to filename)"
          className="w-full bg-dark-bg border border-white/10 rounded-lg px-4 py-2 text-white text-sm focus:border-accent focus:outline-none"
        />
        <select
          value={form.type}
          onChange={(e) => setForm({ ...form, type: e.target.value })}
          className="bg-dark-bg border border-white/10 rounded-lg px-4 py-2 text-white text-sm focus:border-accent focus:outline-none"
        >
          {ASSET_TYPES.map((t) => (
            <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
          ))}
        </select>
        <input
          ref={fileRef}
          type="file"
          accept="image/*,video/*"
          onChange={(e) => setPendingFile(e.target.files?.[0] || null)}
          className="text-sm text-text-secondary"
        />
        <button
          onClick={handleAdd}
          disabled={!pendingFile || uploading}
          className="bg-accent hover:bg-accent/80 disabled:opacity-30 text-white text-sm font-bold uppercase tracking-widest px-6 py-2 rounded-lg transition-colors"
        >
          {uploading ? 'Uploading...' : 'Upload'}
        </button>
      </div>

      {/* Existing assets */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {assets.map((asset) => (
          <div key={asset.id} className="group relative bg-dark-card border border-white/5 rounded-lg overflow-hidden">
            {asset.type === 'photo' || asset.type === 'logo' ? (
              <div className="aspect-square">
                <img src={asset.file_url} alt={asset.title} className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="aspect-square flex items-center justify-center bg-dark-surface">
                <span className="text-text-secondary text-xs uppercase">Video</span>
              </div>
            )}
            <div className="px-3 py-2">
              <p className="text-xs text-text-secondary truncate">{asset.title}</p>
              <span className="text-xs text-accent capitalize">{asset.type}</span>
            </div>
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <button onClick={() => handleDelete(asset.id)} className="text-red-400 text-xs bg-white/20 rounded px-3 py-1">Delete</button>
            </div>
          </div>
        ))}
      </div>
      {assets.length === 0 && <p className="text-text-secondary text-sm">No press assets yet.</p>}
    </div>
  )
}
```

**Step 3: Verify press assets editor works with file upload**

**Step 4: Commit**

```bash
git add -A && git commit -m "feat: add press assets dashboard editor with file upload"
```

---

### Task 8: Profile Image & Hero Image Upload (Profile Page Enhancement)

**Files:**
- Modify: `src/routes/_dashboard/dashboard.tsx`

**Step 1: Add image upload fields to the profile editor**

Add profile photo and hero image upload inputs to the existing profile editor page. Import `uploadFileFromInput` from `~/utils/upload` and add two file inputs that upload to Supabase Storage and save the resulting URL to the profile.

Add after the "Genres" field in the existing profile editor:

```tsx
// Add these imports at the top:
import { useRef } from 'react'
import { uploadFileFromInput } from '~/utils/upload'

// Add this state inside ProfileEditor component:
const [uploadingProfile, setUploadingProfile] = useState(false)
const [uploadingHero, setUploadingHero] = useState(false)

// Add these handlers:
const handleProfileImage = async (file: File) => {
  setUploadingProfile(true)
  const url = await uploadFileFromInput(file, 'profile')
  setUploadingProfile(false)
  if (url) {
    handleChange('profile_image_url', url)
  }
}

const handleHeroImage = async (file: File) => {
  setUploadingHero(true)
  const url = await uploadFileFromInput(file, 'hero')
  setUploadingHero(false)
  if (url) {
    handleChange('hero_image_url', url)
  }
}

// Add these fields after the Genres input in the JSX:
<div>
  <label className="block text-sm uppercase tracking-widest font-bold mb-2">Profile Photo</label>
  {profile.profile_image_url && (
    <img src={profile.profile_image_url} alt="Profile" className="w-24 h-24 rounded-full object-cover mb-3" />
  )}
  <input
    type="file"
    accept="image/*"
    onChange={(e) => e.target.files?.[0] && handleProfileImage(e.target.files[0])}
    className="text-sm text-text-secondary"
  />
  {uploadingProfile && <p className="text-xs text-accent mt-1">Uploading...</p>}
</div>

<div>
  <label className="block text-sm uppercase tracking-widest font-bold mb-2">Hero Image</label>
  {profile.hero_image_url && (
    <img src={profile.hero_image_url} alt="Hero" className="w-full h-32 rounded-lg object-cover mb-3" />
  )}
  <input
    type="file"
    accept="image/*"
    onChange={(e) => e.target.files?.[0] && handleHeroImage(e.target.files[0])}
    className="text-sm text-text-secondary"
  />
  {uploadingHero && <p className="text-xs text-accent mt-1">Uploading...</p>}
</div>
```

**Step 2: Verify image uploads work on profile page**

**Step 3: Commit**

```bash
git add -A && git commit -m "feat: add profile photo and hero image upload to profile editor"
```

---

### Task 9: Update Public EPK Page with Mixes & Social Links

**Files:**
- Modify: `src/routes/$slug.tsx`

**Step 1: Add mixes section and social links to the public EPK page**

Add between the Bio and Events sections in the `$slug.tsx` public page:

```tsx
{/* Mixes - grouped by category */}
{mixes.length > 0 && (
  <FadeIn>
    <section id="music" className="py-20 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="w-20 h-1 bg-accent mb-8 shadow-[0_0_10px_var(--color-accent-glow)]" />
        <h2 className="text-4xl md:text-5xl font-black uppercase tracking-wider mb-12">Listen</h2>
        {Object.entries(
          mixes.reduce((acc: Record<string, typeof mixes>, mix) => {
            const cat = mix.category || 'other'
            if (!acc[cat]) acc[cat] = []
            acc[cat].push(mix)
            return acc
          }, {})
        ).map(([category, categoryMixes]) => (
          <div key={category} className="mb-10">
            <h3 className="text-lg font-bold uppercase tracking-wider text-accent mb-6 capitalize">
              {category.replace('-', ' ')}
            </h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {categoryMixes.map((mix) => (
                <a
                  key={mix.id}
                  href={mix.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-dark-card border border-white/5 rounded-lg p-4 hover:border-accent/30 transition-colors"
                >
                  <p className="font-bold text-sm mb-1">{mix.title}</p>
                  <p className="text-xs text-text-secondary truncate">{mix.url}</p>
                </a>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  </FadeIn>
)}
```

Also add social links to the Hero section (after the display name and tagline):

```tsx
{socialLinks.length > 0 && (
  <div className="flex items-center justify-center gap-4 mt-6">
    {socialLinks.map((link) => (
      <a
        key={link.id}
        href={link.url}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={link.platform}
        className="w-10 h-10 rounded-full border border-text-secondary/30 flex items-center justify-center hover:border-accent transition-colors text-sm capitalize"
      >
        {link.platform.charAt(0).toUpperCase()}
      </a>
    ))}
  </div>
)}
```

And add press assets section before the Contact section:

```tsx
{pressAssets.length > 0 && (
  <FadeIn>
    <section id="press" className="py-20 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="w-20 h-1 bg-accent mb-8 shadow-[0_0_10px_var(--color-accent-glow)]" />
        <h2 className="text-4xl md:text-5xl font-black uppercase tracking-wider mb-12">Press Assets</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {pressAssets.map((asset) => (
            <a
              key={asset.id}
              href={asset.file_url}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-dark-card border border-white/5 rounded-lg overflow-hidden hover:border-accent/30 transition-colors"
            >
              {(asset.type === 'photo' || asset.type === 'logo') && (
                <div className="aspect-square">
                  <img src={asset.file_url} alt={asset.title} className="w-full h-full object-cover" loading="lazy" />
                </div>
              )}
              <div className="px-3 py-2">
                <p className="text-xs text-text-secondary truncate">{asset.title}</p>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  </FadeIn>
)}
```

**Step 2: Add `pressAssets` to the destructured data** (update the destructuring line):

```tsx
const { profile, socialLinks, mixes, events, technicalRider, bookingContact, pressAssets } = data
```

**Step 3: Verify public EPK shows all sections**

**Step 4: Commit**

```bash
git add -A && git commit -m "feat: add mixes, social links, and press assets to public EPK page"
```

---

**Phase 2 is complete after these 9 tasks.** At this point you have all content management sections in the dashboard:
- File upload utility (Supabase Storage)
- Mixes / Music editor with CRUD + reorder
- Events editor with image upload + reorder
- Technical rider editor with auto-save
- Booking contact editor with auto-save
- Social links editor with CRUD + reorder
- Press assets editor with file upload
- Profile photo + hero image upload
- Public EPK page renders all content sections
