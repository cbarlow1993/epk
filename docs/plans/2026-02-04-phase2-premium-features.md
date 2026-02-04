# Phase 2: Premium Features v1.1 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add premium-tier features: PostHog analytics, file repository with folders/tags, white-label branding, and a template system.

**Architecture:** PostHog for analytics (client-side tracking, server-side API for dashboard). New `files`, `folders`, `file_tags` tables for file repository. Template system via config objects with conditional rendering.

**Tech Stack:** PostHog (posthog-js, new), recharts (new for charts), existing Supabase Storage

**Depends on:** Phase 0 (infrastructure), Phase 1 (MVP complete)

---

## Task 1: Install PostHog and Recharts

**Step 1: Install packages**

```bash
npm install posthog-js recharts
```

**Step 2: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install posthog-js and recharts for analytics"
```

---

## Task 2: PostHog Tracking on Public EPK

**Files:**
- Create: `src/components/Analytics.tsx`
- Modify: `src/routes/$slug.tsx`

**Step 1: Create Analytics component**

This component initializes PostHog only on public EPK pages. It does NOT load on dashboard.

```tsx
// src/components/Analytics.tsx
import { useEffect } from 'react'
import posthog from 'posthog-js'

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com'

let initialized = false

interface AnalyticsProps {
  slug: string
  profileId?: string
}

export function Analytics({ slug }: AnalyticsProps) {
  useEffect(() => {
    if (!POSTHOG_KEY || typeof window === 'undefined') return

    if (!initialized) {
      posthog.init(POSTHOG_KEY, {
        api_host: POSTHOG_HOST,
        persistence: 'memory',          // No cookies — privacy friendly
        capture_pageview: false,         // We'll capture manually
        capture_pageleave: true,
        autocapture: false,
      })
      initialized = true
    }

    // Track page view with slug as a property
    posthog.capture('epk_page_view', {
      slug,
      referrer: document.referrer || 'direct',
      device_type: window.innerWidth < 768 ? 'mobile' : window.innerWidth < 1024 ? 'tablet' : 'desktop',
    })
  }, [slug])

  return null
}

// Helper to track section views from IntersectionObserver
export function trackSectionView(slug: string, section: string) {
  if (!POSTHOG_KEY || typeof window === 'undefined') return
  posthog.capture('epk_section_view', { slug, section })
}

// Helper for embed interactions
export function trackEmbedPlay(slug: string, mixTitle: string, platform: string) {
  if (!POSTHOG_KEY || typeof window === 'undefined') return
  posthog.capture('epk_embed_play', { slug, mix_title: mixTitle, platform })
}

// Helper for file downloads
export function trackFileDownload(slug: string, fileName: string) {
  if (!POSTHOG_KEY || typeof window === 'undefined') return
  posthog.capture('epk_file_download', { slug, file_name: fileName })
}

// Helper for booking form submissions
export function trackBookingSubmit(slug: string) {
  if (!POSTHOG_KEY || typeof window === 'undefined') return
  posthog.capture('epk_booking_submit', { slug })
}
```

**Step 2: Add Analytics to public EPK page**

In `src/routes/$slug.tsx`, add inside the `PublicEPK` component, right after the opening `<div>`:

```tsx
      <Analytics slug={profile.slug} />
```

Add import:

```typescript
import { Analytics } from '~/components/Analytics'
```

**Step 3: Add section view tracking**

In the `EPKSection` component or in `$slug.tsx`, add IntersectionObserver to track when sections scroll into view. The simplest approach is to update `EPKSection.tsx` to optionally call a callback on visible.

Alternatively, add tracking inline in `$slug.tsx` using `useEffect` with IntersectionObserver for each section. This is simpler and avoids coupling EPKSection to analytics.

**Step 4: Commit**

```bash
git add src/components/Analytics.tsx src/routes/\$slug.tsx
git commit -m "feat: add PostHog analytics tracking on public EPK pages"
```

---

## Task 3: Analytics Dashboard Page

**Files:**
- Create: `src/server/analytics.ts`
- Create: `src/routes/_dashboard/dashboard.analytics.tsx`
- Modify: `src/components/DashboardSidebar.tsx`

**Step 1: Create analytics server functions**

PostHog provides an API to query events. We'll use it server-side to fetch analytics data.

```typescript
// src/server/analytics.ts
import { createServerFn } from '@tanstack/react-start'
import { withAuth } from './utils'

const POSTHOG_API_KEY = process.env.POSTHOG_API_KEY // Personal API key (not project key)
const POSTHOG_PROJECT_ID = process.env.POSTHOG_PROJECT_ID
const POSTHOG_HOST = process.env.POSTHOG_HOST || 'https://us.posthog.com'

interface AnalyticsSummary {
  pageViews: number
  uniqueVisitors: number
  topReferrers: { referrer: string; count: number }[]
  deviceBreakdown: { device: string; count: number }[]
  dailyViews: { date: string; count: number }[]
}

export const getAnalyticsSummary = createServerFn({ method: 'POST' })
  .inputValidator((data: { days: number }) => data)
  .handler(async ({ data: { days } }): Promise<AnalyticsSummary | { error: string }> => {
    const { supabase, user } = await withAuth()

    // Check tier
    const { data: profile } = await supabase.from('profiles').select('tier, slug').eq('id', user.id).single()
    if (!profile || profile.tier !== 'pro') {
      return { error: 'Premium feature' }
    }

    if (!POSTHOG_API_KEY || !POSTHOG_PROJECT_ID) {
      return { error: 'Analytics not configured' }
    }

    const slug = profile.slug
    const dateFrom = new Date()
    dateFrom.setDate(dateFrom.getDate() - days)

    try {
      // Query PostHog events API
      const response = await fetch(
        `${POSTHOG_HOST}/api/projects/${POSTHOG_PROJECT_ID}/events?event=epk_page_view&properties=[{"key":"slug","value":"${slug}","operator":"exact"}]&after=${dateFrom.toISOString()}&limit=10000`,
        {
          headers: {
            Authorization: `Bearer ${POSTHOG_API_KEY}`,
          },
        }
      )

      if (!response.ok) {
        return { error: 'Failed to fetch analytics' }
      }

      const { results } = await response.json()

      // Process events into summary
      const visitors = new Set<string>()
      const referrerCounts: Record<string, number> = {}
      const deviceCounts: Record<string, number> = {}
      const dailyCounts: Record<string, number> = {}

      for (const event of results) {
        visitors.add(event.distinct_id)

        const referrer = event.properties?.referrer || 'direct'
        referrerCounts[referrer] = (referrerCounts[referrer] || 0) + 1

        const device = event.properties?.device_type || 'unknown'
        deviceCounts[device] = (deviceCounts[device] || 0) + 1

        const date = event.timestamp?.split('T')[0]
        if (date) dailyCounts[date] = (dailyCounts[date] || 0) + 1
      }

      return {
        pageViews: results.length,
        uniqueVisitors: visitors.size,
        topReferrers: Object.entries(referrerCounts)
          .map(([referrer, count]) => ({ referrer, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10),
        deviceBreakdown: Object.entries(deviceCounts)
          .map(([device, count]) => ({ device, count }))
          .sort((a, b) => b.count - a.count),
        dailyViews: Object.entries(dailyCounts)
          .map(([date, count]) => ({ date, count }))
          .sort((a, b) => a.date.localeCompare(b.date)),
      }
    } catch {
      return { error: 'Failed to process analytics' }
    }
  })
```

**Step 2: Create analytics dashboard page**

```tsx
// src/routes/_dashboard/dashboard.analytics.tsx
import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { getProfile } from '~/server/profile'
import { getAnalyticsSummary } from '~/server/analytics'
import { SETTINGS_CARD, BTN_BASE } from '~/components/forms'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

export const Route = createFileRoute('/_dashboard/dashboard/analytics')({
  loader: () => getProfile(),
  component: AnalyticsDashboard,
})

const DATE_RANGES = [
  { label: '7 days', days: 7 },
  { label: '30 days', days: 30 },
  { label: '90 days', days: 90 },
]

const CHART_COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981']

function AnalyticsDashboard() {
  const profile = Route.useLoaderData()
  const [days, setDays] = useState(30)
  const [data, setData] = useState<Awaited<ReturnType<typeof getAnalyticsSummary>> | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    getAnalyticsSummary({ data: { days } }).then((result) => {
      setData(result)
      setLoading(false)
    })
  }, [days])

  // Gate: free users see upgrade prompt
  if (profile?.tier !== 'pro') {
    return (
      <div>
        <h1 className="text-2xl font-black uppercase tracking-wider mb-8">Analytics</h1>
        <div className={`${SETTINGS_CARD} text-center py-12`}>
          <p className="text-text-secondary mb-4">Analytics is a Premium feature. Upgrade to see page views, visitors, referrers, and more.</p>
          <Link to="/dashboard/settings" className={`${BTN_BASE} bg-accent text-black hover:bg-accent/80`}>
            Upgrade to Pro
          </Link>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-black uppercase tracking-wider mb-8">Analytics</h1>
        <p className="text-text-secondary text-sm">Loading analytics...</p>
      </div>
    )
  }

  if (!data || 'error' in data) {
    return (
      <div>
        <h1 className="text-2xl font-black uppercase tracking-wider mb-8">Analytics</h1>
        <p className="text-text-secondary text-sm">{data && 'error' in data ? data.error : 'Failed to load analytics'}</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-black uppercase tracking-wider">Analytics</h1>
        <div className="flex gap-2">
          {DATE_RANGES.map((range) => (
            <button
              key={range.days}
              onClick={() => setDays(range.days)}
              className={`${BTN_BASE} text-xs ${days === range.days ? 'bg-accent text-black' : 'bg-white/10 text-white hover:bg-white/20'}`}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className={SETTINGS_CARD}>
          <p className="text-text-secondary text-xs uppercase tracking-wider mb-1">Page Views</p>
          <p className="text-3xl font-black">{data.pageViews.toLocaleString()}</p>
        </div>
        <div className={SETTINGS_CARD}>
          <p className="text-text-secondary text-xs uppercase tracking-wider mb-1">Unique Visitors</p>
          <p className="text-3xl font-black">{data.uniqueVisitors.toLocaleString()}</p>
        </div>
        <div className={SETTINGS_CARD}>
          <p className="text-text-secondary text-xs uppercase tracking-wider mb-1">Top Referrer</p>
          <p className="text-lg font-bold truncate">{data.topReferrers[0]?.referrer || 'N/A'}</p>
        </div>
        <div className={SETTINGS_CARD}>
          <p className="text-text-secondary text-xs uppercase tracking-wider mb-1">Top Device</p>
          <p className="text-lg font-bold capitalize">{data.deviceBreakdown[0]?.device || 'N/A'}</p>
        </div>
      </div>

      {/* Daily Views Chart */}
      <div className={`${SETTINGS_CARD} mb-8`}>
        <p className="text-sm uppercase tracking-widest font-bold mb-4">Page Views Over Time</p>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.dailyViews}>
              <XAxis dataKey="date" tick={{ fill: '#9ca3af', fontSize: 11 }} />
              <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                labelStyle={{ color: '#fff' }}
              />
              <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Referrers + Devices */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className={SETTINGS_CARD}>
          <p className="text-sm uppercase tracking-widest font-bold mb-4">Top Referrers</p>
          <div className="space-y-2">
            {data.topReferrers.map((ref, i) => (
              <div key={ref.referrer} className="flex items-center justify-between text-sm">
                <span className="truncate text-text-secondary">{ref.referrer}</span>
                <span className="font-bold ml-2">{ref.count}</span>
              </div>
            ))}
          </div>
        </div>
        <div className={SETTINGS_CARD}>
          <p className="text-sm uppercase tracking-widest font-bold mb-4">Devices</p>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.deviceBreakdown}
                  dataKey="count"
                  nameKey="device"
                  innerRadius={40}
                  outerRadius={80}
                  paddingAngle={2}
                >
                  {data.deviceBreakdown.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-3 mt-2">
            {data.deviceBreakdown.map((d, i) => (
              <div key={d.device} className="flex items-center gap-2 text-xs">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                <span className="capitalize text-text-secondary">{d.device}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
```

**Step 3: Add Analytics to sidebar**

In `src/components/DashboardSidebar.tsx`, add to `NAV_ITEMS` before Settings:

```typescript
  { label: 'Analytics', href: '/dashboard/analytics' },
```

**Step 4: Commit**

```bash
git add src/server/analytics.ts src/routes/_dashboard/dashboard.analytics.tsx src/components/DashboardSidebar.tsx
git commit -m "feat: add analytics dashboard with PostHog integration and charts"
```

---

## Task 4: File Repository - Database Tables

**Files:**
- Modify: `supabase/schema.sql`
- Modify: `src/types/database.ts`

**Step 1: Add tables**

Append to `supabase/schema.sql`:

```sql
-- File repository
CREATE TABLE folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  parent_id UUID REFERENCES folders(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  folder_id UUID REFERENCES folders(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size BIGINT NOT NULL DEFAULT 0,
  mime_type TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE file_tags (
  file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  PRIMARY KEY (file_id, tag)
);

ALTER TABLE folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_tags ENABLE ROW LEVEL SECURITY;

-- RLS for folders
CREATE POLICY "Owner CRUD on folders" ON folders FOR ALL USING (is_profile_owner(profile_id));

-- RLS for files
CREATE POLICY "Owner CRUD on files" ON files FOR ALL USING (is_profile_owner(profile_id));

-- RLS for file_tags (via file ownership)
CREATE POLICY "Owner CRUD on file_tags" ON file_tags FOR ALL USING (
  EXISTS (SELECT 1 FROM files WHERE files.id = file_tags.file_id AND is_profile_owner(files.profile_id))
);
```

**Step 2: Add types**

In `src/types/database.ts`:

```typescript
export interface FolderRow {
  id: string
  profile_id: string
  name: string
  parent_id: string | null
  created_at: string
}

export interface FileRow {
  id: string
  profile_id: string
  folder_id: string | null
  name: string
  file_url: string
  file_type: string
  file_size: number
  mime_type: string | null
  created_at: string
  tags?: string[]
}
```

**Step 3: Run migration and commit**

```bash
npm run db:migrate
git add supabase/schema.sql src/types/database.ts
git commit -m "feat: add files, folders, file_tags tables for file repository"
```

---

## Task 5: File Repository - Schemas and Server Functions

**Files:**
- Create: `src/schemas/file.ts`
- Create: `src/schemas/folder.ts`
- Create: `src/server/files.ts`
- Create: `src/server/folders.ts`
- Modify: `src/schemas/index.ts`

**Step 1: Create file schema**

```typescript
// src/schemas/file.ts
import { z } from 'zod'

export const fileUploadSchema = z.object({
  name: z.string().min(1).max(200),
  folder_id: z.string().uuid().nullable().optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
})

export const fileMoveSchema = z.object({
  id: z.string().uuid(),
  folder_id: z.string().uuid().nullable(),
})

export const fileTagsSchema = z.object({
  id: z.string().uuid(),
  tags: z.array(z.string().max(50)).max(20),
})
```

**Step 2: Create folder schema**

```typescript
// src/schemas/folder.ts
import { z } from 'zod'

export const folderCreateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  parent_id: z.string().uuid().nullable().optional(),
})

export const folderRenameSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
})
```

**Step 3: Create files server functions**

```typescript
// src/server/files.ts
import { createServerFn } from '@tanstack/react-start'
import { fileMoveSchema, fileTagsSchema } from '~/schemas/file'
import { withAuth } from './utils'

const STORAGE_LIMIT_FREE = 5 * 1024 * 1024 * 1024   // 5GB
const STORAGE_LIMIT_PRO = 100 * 1024 * 1024 * 1024   // 100GB

export const getFiles = createServerFn({ method: 'GET' })
  .inputValidator((data: { folderId?: string | null }) => data)
  .handler(async ({ data }) => {
    const { supabase, user } = await withAuth()

    let query = supabase.from('files').select('*').eq('profile_id', user.id)

    if (data.folderId) {
      query = query.eq('folder_id', data.folderId)
    } else if (data.folderId === null) {
      query = query.is('folder_id', null)
    }

    const { data: files } = await query.order('created_at', { ascending: false })

    // Fetch tags for each file
    if (files && files.length > 0) {
      const fileIds = files.map((f: { id: string }) => f.id)
      const { data: tags } = await supabase
        .from('file_tags')
        .select('file_id, tag')
        .in('file_id', fileIds)

      const tagsByFile: Record<string, string[]> = {}
      for (const t of tags || []) {
        if (!tagsByFile[t.file_id]) tagsByFile[t.file_id] = []
        tagsByFile[t.file_id].push(t.tag)
      }

      return files.map((f: { id: string }) => ({ ...f, tags: tagsByFile[f.id] || [] }))
    }

    return files || []
  })

export const getStorageUsage = createServerFn({ method: 'GET' }).handler(async () => {
  const { supabase, user } = await withAuth()

  const { data: profile } = await supabase.from('profiles').select('tier').eq('id', user.id).single()
  const { data } = await supabase.rpc('sum_file_size', { p_profile_id: user.id })

  // If RPC doesn't exist, query manually
  const { data: files } = await supabase
    .from('files')
    .select('file_size')
    .eq('profile_id', user.id)

  const used = files?.reduce((sum: number, f: { file_size: number }) => sum + f.file_size, 0) || 0
  const limit = profile?.tier === 'pro' ? STORAGE_LIMIT_PRO : STORAGE_LIMIT_FREE

  return { used, limit, tier: profile?.tier || 'free' }
})

export const uploadFileToRepo = createServerFn({ method: 'POST' })
  .inputValidator((data: {
    base64: string
    fileName: string
    contentType: string
    fileSize: number
    folderId?: string | null
    tags?: string[]
  }) => data)
  .handler(async ({ data }) => {
    const { supabase, user } = await withAuth()

    // Check storage quota
    const { data: profile } = await supabase.from('profiles').select('tier').eq('id', user.id).single()
    const limit = profile?.tier === 'pro' ? STORAGE_LIMIT_PRO : STORAGE_LIMIT_FREE

    const { data: existingFiles } = await supabase
      .from('files')
      .select('file_size')
      .eq('profile_id', user.id)
    const currentUsage = existingFiles?.reduce((sum: number, f: { file_size: number }) => sum + f.file_size, 0) || 0

    if (currentUsage + data.fileSize > limit) {
      return { error: 'Storage limit exceeded. Upgrade to Pro for 100GB storage.' }
    }

    // Upload to Supabase Storage
    const buffer = Buffer.from(data.base64, 'base64')
    const safeName = data.fileName.replace(/[^a-zA-Z0-9._-]/g, '_')
    const path = `${user.id}/files/${Date.now()}-${safeName}`

    const { error: uploadError } = await supabase.storage
      .from('uploads')
      .upload(path, buffer, { contentType: data.contentType, upsert: false })

    if (uploadError) return { error: uploadError.message }

    const { data: urlData } = supabase.storage.from('uploads').getPublicUrl(path)

    // Determine file type category
    const fileType = data.contentType.startsWith('image/') ? 'image'
      : data.contentType.startsWith('audio/') ? 'audio'
      : data.contentType.startsWith('video/') ? 'video'
      : data.contentType === 'application/pdf' ? 'document'
      : 'other'

    // Insert file record
    const { data: file, error: dbError } = await supabase
      .from('files')
      .insert({
        profile_id: user.id,
        folder_id: data.folderId || null,
        name: data.fileName,
        file_url: urlData.publicUrl,
        file_type: fileType,
        file_size: data.fileSize,
        mime_type: data.contentType,
      })
      .select()
      .single()

    if (dbError) return { error: dbError.message }

    // Insert tags if provided
    if (data.tags && data.tags.length > 0) {
      await supabase.from('file_tags').insert(
        data.tags.map((tag) => ({ file_id: file.id, tag }))
      )
    }

    return { file: { ...file, tags: data.tags || [] } }
  })

export const deleteFile = createServerFn({ method: 'POST' })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data: { id } }) => {
    const { supabase, user } = await withAuth()

    // Get file URL to delete from storage
    const { data: file } = await supabase
      .from('files')
      .select('file_url')
      .eq('id', id)
      .eq('profile_id', user.id)
      .single()

    if (!file) return { error: 'File not found' }

    // Delete from DB (cascades to file_tags)
    const { error } = await supabase.from('files').delete().eq('id', id).eq('profile_id', user.id)
    if (error) return { error: error.message }

    // Delete from storage (extract path from URL)
    const url = new URL(file.file_url)
    const storagePath = url.pathname.split('/uploads/')[1]
    if (storagePath) {
      await supabase.storage.from('uploads').remove([decodeURIComponent(storagePath)])
    }

    return { success: true }
  })

export const moveFile = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => fileMoveSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabase, user } = await withAuth()
    const { error } = await supabase
      .from('files')
      .update({ folder_id: data.folder_id })
      .eq('id', data.id)
      .eq('profile_id', user.id)
    if (error) return { error: error.message }
    return { success: true }
  })

export const updateFileTags = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => fileTagsSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabase, user } = await withAuth()

    // Verify ownership
    const { data: file } = await supabase
      .from('files')
      .select('id')
      .eq('id', data.id)
      .eq('profile_id', user.id)
      .single()
    if (!file) return { error: 'File not found' }

    // Delete existing tags and re-insert
    await supabase.from('file_tags').delete().eq('file_id', data.id)
    if (data.tags.length > 0) {
      await supabase.from('file_tags').insert(
        data.tags.map((tag) => ({ file_id: data.id, tag }))
      )
    }

    return { success: true }
  })
```

**Step 4: Create folders server functions**

```typescript
// src/server/folders.ts
import { createServerFn } from '@tanstack/react-start'
import { folderCreateSchema, folderRenameSchema } from '~/schemas/folder'
import { withAuth } from './utils'

export const getFolders = createServerFn({ method: 'GET' }).handler(async () => {
  const { supabase, user } = await withAuth()
  const { data } = await supabase
    .from('folders')
    .select('*')
    .eq('profile_id', user.id)
    .order('name')
  return data || []
})

export const createFolder = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => folderCreateSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabase, user } = await withAuth()

    // Check tier for folder feature
    const { data: profile } = await supabase.from('profiles').select('tier').eq('id', user.id).single()
    if (profile?.tier !== 'pro') return { error: 'Folders are a Premium feature' }

    const { data: folder, error } = await supabase
      .from('folders')
      .insert({ profile_id: user.id, name: data.name, parent_id: data.parent_id || null })
      .select()
      .single()

    if (error) return { error: error.message }
    return { folder }
  })

export const renameFolder = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => folderRenameSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabase, user } = await withAuth()
    const { error } = await supabase
      .from('folders')
      .update({ name: data.name })
      .eq('id', data.id)
      .eq('profile_id', user.id)
    if (error) return { error: error.message }
    return { success: true }
  })

export const deleteFolder = createServerFn({ method: 'POST' })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data: { id } }) => {
    const { supabase, user } = await withAuth()
    // Files in this folder will have folder_id set to NULL (ON DELETE SET NULL)
    const { error } = await supabase.from('folders').delete().eq('id', id).eq('profile_id', user.id)
    if (error) return { error: error.message }
    return { success: true }
  })
```

**Step 5: Add to schemas barrel**

In `src/schemas/index.ts`:

```typescript
export * from './file'
export * from './folder'
```

**Step 6: Commit**

```bash
git add src/schemas/file.ts src/schemas/folder.ts src/server/files.ts src/server/folders.ts src/schemas/index.ts
git commit -m "feat: add file repository schemas and server functions with storage quota"
```

---

## Task 6: File Repository - Dashboard Page

**Files:**
- Create: `src/routes/_dashboard/dashboard.files.tsx`
- Modify: `src/components/DashboardSidebar.tsx`

**Step 1: Create the files dashboard page**

This is a large component. Key features:
- Folder tree sidebar (left panel, Pro only)
- File grid (right panel)
- Drag-and-drop upload zone
- Storage usage bar
- File preview modal for images/PDFs
- Tag editing inline

```tsx
// src/routes/_dashboard/dashboard.files.tsx
import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useCallback } from 'react'
import { getFiles, getStorageUsage, uploadFileToRepo, deleteFile } from '~/server/files'
import { getFolders, createFolder, deleteFolder } from '~/server/folders'
import { FORM_INPUT, BTN_BASE, BTN_PRIMARY, BTN_DELETE, SETTINGS_CARD } from '~/components/forms'
import type { FileRow, FolderRow } from '~/types/database'

export const Route = createFileRoute('/_dashboard/dashboard/files')({
  loader: async () => {
    const [files, folders, storage] = await Promise.all([
      getFiles({ data: { folderId: undefined } }),
      getFolders(),
      getStorageUsage(),
    ])
    return { files, folders, storage }
  },
  component: FileRepository,
})

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

function FileRepository() {
  const { files: initialFiles, folders: initialFolders, storage } = Route.useLoaderData()
  const [files, setFiles] = useState<FileRow[]>(initialFiles || [])
  const [folders, setFolders] = useState<FolderRow[]>(initialFolders || [])
  const [currentFolder, setCurrentFolder] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [previewFile, setPreviewFile] = useState<FileRow | null>(null)

  const isPro = storage.tier === 'pro'
  const usagePercent = Math.min(100, (storage.used / storage.limit) * 100)

  const handleUpload = useCallback(async (fileList: FileList) => {
    setUploading(true)
    for (const file of Array.from(fileList)) {
      const reader = new FileReader()
      const base64 = await new Promise<string>((resolve) => {
        reader.onloadend = () => {
          const result = reader.result as string
          resolve(result.split(',')[1])
        }
        reader.readAsDataURL(file)
      })

      const result = await uploadFileToRepo({
        data: {
          base64,
          fileName: file.name,
          contentType: file.type,
          fileSize: file.size,
          folderId: currentFolder,
        },
      })

      if ('file' in result && result.file) {
        setFiles(prev => [result.file, ...prev])
      }
    }
    setUploading(false)
  }, [currentFolder])

  const handleDelete = async (id: string) => {
    const result = await deleteFile({ data: { id } })
    if ('success' in result) {
      setFiles(prev => prev.filter(f => f.id !== id))
    }
  }

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return
    const result = await createFolder({ data: { name: newFolderName.trim(), parent_id: currentFolder } })
    if ('folder' in result && result.folder) {
      setFolders(prev => [...prev, result.folder])
      setNewFolderName('')
    }
  }

  // Gate: free users see limited view
  if (!isPro) {
    return (
      <div>
        <h1 className="text-2xl font-black uppercase tracking-wider mb-8">Files</h1>
        <div className={`${SETTINGS_CARD} text-center py-12`}>
          <p className="text-text-secondary mb-2">Free tier: {formatBytes(storage.limit)} storage, flat file list.</p>
          <p className="text-text-secondary mb-4">Upgrade to Pro for 100GB storage with folders and tags.</p>
          <Link to="/dashboard/settings" className={`${BTN_BASE} bg-accent text-black hover:bg-accent/80`}>
            Upgrade to Pro
          </Link>
        </div>
        {/* Still show basic file upload for free tier */}
        <div className="mt-8">
          <StorageBar used={storage.used} limit={storage.limit} />
          <DropZone dragOver={dragOver} setDragOver={setDragOver} onUpload={handleUpload} uploading={uploading} />
          <FileGrid files={files} onDelete={handleDelete} onPreview={setPreviewFile} />
        </div>
        {previewFile && <PreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />}
      </div>
    )
  }

  const displayedFiles = currentFolder
    ? files.filter(f => f.folder_id === currentFolder)
    : files.filter(f => !f.folder_id)

  return (
    <div>
      <h1 className="text-2xl font-black uppercase tracking-wider mb-4">Files</h1>
      <StorageBar used={storage.used} limit={storage.limit} />

      <div className="flex gap-6 mt-6">
        {/* Folder Sidebar */}
        <div className="w-48 shrink-0">
          <button
            onClick={() => setCurrentFolder(null)}
            className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${!currentFolder ? 'bg-white/10 text-white' : 'text-text-secondary hover:text-white'}`}
          >
            All Files
          </button>
          {folders.map((folder) => (
            <div key={folder.id} className="flex items-center group">
              <button
                onClick={() => setCurrentFolder(folder.id)}
                className={`flex-1 text-left px-3 py-2 rounded text-sm transition-colors ${currentFolder === folder.id ? 'bg-white/10 text-white' : 'text-text-secondary hover:text-white'}`}
              >
                {folder.name}
              </button>
              <button
                onClick={() => {
                  deleteFolder({ data: { id: folder.id } })
                  setFolders(prev => prev.filter(f => f.id !== folder.id))
                  if (currentFolder === folder.id) setCurrentFolder(null)
                }}
                className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 px-1 text-xs"
              >
                x
              </button>
            </div>
          ))}
          <div className="mt-3 flex gap-1">
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="New folder..."
              className={`${FORM_INPUT} text-xs py-1.5`}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
            />
          </div>
        </div>

        {/* File Area */}
        <div className="flex-1">
          <DropZone dragOver={dragOver} setDragOver={setDragOver} onUpload={handleUpload} uploading={uploading} />
          <FileGrid files={displayedFiles} onDelete={handleDelete} onPreview={setPreviewFile} />
        </div>
      </div>

      {previewFile && <PreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />}
    </div>
  )
}

function StorageBar({ used, limit }: { used: number; limit: number }) {
  const percent = Math.min(100, (used / limit) * 100)
  return (
    <div className="mb-4">
      <div className="flex justify-between text-xs text-text-secondary mb-1">
        <span>{formatBytes(used)} used</span>
        <span>{formatBytes(limit)} total</span>
      </div>
      <div className="h-2 bg-dark-card rounded-full overflow-hidden">
        <div className="h-full bg-accent rounded-full transition-all" style={{ width: `${percent}%` }} />
      </div>
    </div>
  )
}

function DropZone({ dragOver, setDragOver, onUpload, uploading }: {
  dragOver: boolean
  setDragOver: (v: boolean) => void
  onUpload: (files: FileList) => void
  uploading: boolean
}) {
  return (
    <div
      className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors mb-6 ${
        dragOver ? 'border-accent bg-accent/5' : 'border-white/10 hover:border-white/20'
      }`}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragOver(false)
        if (e.dataTransfer.files.length) onUpload(e.dataTransfer.files)
      }}
    >
      <p className="text-text-secondary text-sm mb-2">
        {uploading ? 'Uploading...' : 'Drag & drop files here'}
      </p>
      <label className={`${BTN_PRIMARY} cursor-pointer inline-block`}>
        Browse Files
        <input
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) onUpload(e.target.files)
          }}
        />
      </label>
    </div>
  )
}

function FileGrid({ files, onDelete, onPreview }: {
  files: FileRow[]
  onDelete: (id: string) => void
  onPreview: (file: FileRow) => void
}) {
  if (files.length === 0) {
    return <p className="text-text-secondary text-sm">No files yet.</p>
  }

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {files.map((file) => (
        <div key={file.id} className="bg-dark-card border border-white/10 rounded-lg overflow-hidden group">
          {/* Preview */}
          {file.file_type === 'image' && file.file_url ? (
            <button
              type="button"
              onClick={() => onPreview(file)}
              className="w-full aspect-video bg-dark-surface overflow-hidden"
            >
              <img src={file.file_url} alt={file.name} className="w-full h-full object-cover" loading="lazy" />
            </button>
          ) : (
            <div className="w-full aspect-video bg-dark-surface flex items-center justify-center">
              <span className="text-2xl text-text-secondary uppercase font-bold">{file.file_type}</span>
            </div>
          )}
          {/* Info */}
          <div className="p-3">
            <p className="text-sm font-bold truncate">{file.name}</p>
            <p className="text-xs text-text-secondary">{formatBytes(file.file_size)}</p>
            {file.tags && file.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {file.tags.map((tag) => (
                  <span key={tag} className="text-[10px] bg-white/10 rounded px-1.5 py-0.5">{tag}</span>
                ))}
              </div>
            )}
            <div className="flex gap-2 mt-2">
              <a href={file.file_url} download className="text-xs text-accent hover:underline">Download</a>
              <button onClick={() => onDelete(file.id)} className="text-xs text-red-400 hover:text-red-300">Delete</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function PreviewModal({ file, onClose }: { file: FileRow; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-8" onClick={onClose}>
      <div className="max-w-4xl max-h-full" onClick={(e) => e.stopPropagation()}>
        {file.file_type === 'image' && (
          <img src={file.file_url} alt={file.name} className="max-w-full max-h-[80vh] object-contain rounded-lg" />
        )}
        <div className="text-center mt-4">
          <p className="text-white font-bold">{file.name}</p>
          <button onClick={onClose} className="text-text-secondary text-sm mt-2 hover:text-white">Close</button>
        </div>
      </div>
    </div>
  )
}
```

**Step 2: Add Files to sidebar**

In `src/components/DashboardSidebar.tsx`, add to `NAV_ITEMS` before Analytics:

```typescript
  { label: 'Files', href: '/dashboard/files' },
```

**Step 3: Commit**

```bash
git add src/routes/_dashboard/dashboard.files.tsx src/components/DashboardSidebar.tsx
git commit -m "feat: add file repository dashboard with folders, drag-drop upload, and preview"
```

---

## Task 7: White-Label Branding

**Files:**
- Modify: `supabase/schema.sql`
- Modify: `src/types/database.ts`
- Modify: `src/schemas/profile.ts`
- Modify: `src/server/profile.ts`
- Modify: `src/routes/_dashboard/dashboard.settings.tsx`
- Modify: `src/routes/$slug.tsx`

**Step 1: Database migration**

```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS favicon_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS hide_platform_branding BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS meta_description TEXT;
```

**Step 2: Update types, schema, allowed fields**

Add to `ProfileRow`:
```typescript
  favicon_url: string | null
  hide_platform_branding: boolean
  meta_description: string | null
```

Add to `profileUpdateSchema`:
```typescript
  favicon_url: z.string().url().optional().or(z.literal('')),
  hide_platform_branding: z.boolean().optional(),
  meta_description: z.string().max(300).optional(),
```

Add to `ALLOWED_PROFILE_FIELDS` in `src/server/profile.ts`:
```typescript
  'favicon_url',
  'hide_platform_branding',
  'meta_description',
```

**Step 3: Add branding section to settings page**

In `dashboard.settings.tsx`, add a "Branding" section for Pro users with:
- Favicon upload
- Toggle to hide platform branding
- Custom meta description textarea

**Step 4: Update public EPK page**

In `$slug.tsx`:
- Use `profile.favicon_url` in `head()` for custom favicon
- Conditionally hide the "Built with DJ EPK" footer based on `profile.hide_platform_branding`
- Use `profile.meta_description` in OG tags if set

Replace the footer condition (line 246):
```tsx
      {!profile.hide_platform_branding && profile.tier === 'free' && (
```

With:
```tsx
      {!(profile.hide_platform_branding && profile.tier === 'pro') && (
```

**Step 5: Commit**

```bash
git add supabase/schema.sql src/types/database.ts src/schemas/profile.ts src/server/profile.ts src/routes/_dashboard/dashboard.settings.tsx src/routes/\$slug.tsx
git commit -m "feat: add white-label branding (favicon, hide branding, custom meta)"
```

---

## Task 8: Template System

**Files:**
- Modify: `supabase/schema.sql`
- Create: `src/utils/templates.ts`
- Modify: `src/types/database.ts`
- Modify: `src/schemas/profile.ts`
- Modify: `src/server/profile.ts`
- Modify: `src/routes/_dashboard/dashboard.theme.tsx`
- Modify: `src/routes/$slug.tsx`

**Step 1: Database migration**

```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS template TEXT DEFAULT 'default';
```

**Step 2: Create template config**

```typescript
// src/utils/templates.ts
export interface TemplateConfig {
  id: string
  name: string
  description: string
  defaults: {
    accent_color: string
    bg_color: string
    font_family: string
  }
  sectionOrder: string[]
  heroStyle: 'fullbleed' | 'contained' | 'minimal'
  bioLayout: 'two-column' | 'single-column'
}

export const TEMPLATES: TemplateConfig[] = [
  {
    id: 'default',
    name: 'Default',
    description: 'Dark theme with full-width hero',
    defaults: { accent_color: '#3b82f6', bg_color: '#0a0a0f', font_family: 'Inter' },
    sectionOrder: ['bio', 'music', 'events', 'technical', 'press', 'contact'],
    heroStyle: 'fullbleed',
    bioLayout: 'two-column',
  },
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Clean, centered single-column layout',
    defaults: { accent_color: '#ffffff', bg_color: '#111111', font_family: 'DM Sans' },
    sectionOrder: ['bio', 'music', 'events', 'press', 'technical', 'contact'],
    heroStyle: 'minimal',
    bioLayout: 'single-column',
  },
  {
    id: 'festival',
    name: 'Festival',
    description: 'Bold colors, music section first',
    defaults: { accent_color: '#f59e0b', bg_color: '#0f0f0f', font_family: 'Bebas Neue' },
    sectionOrder: ['music', 'bio', 'events', 'press', 'technical', 'contact'],
    heroStyle: 'fullbleed',
    bioLayout: 'single-column',
  },
  {
    id: 'underground',
    name: 'Underground',
    description: 'Raw, monospace, industrial aesthetic',
    defaults: { accent_color: '#22c55e', bg_color: '#050505', font_family: 'Space Grotesk' },
    sectionOrder: ['music', 'bio', 'technical', 'events', 'press', 'contact'],
    heroStyle: 'contained',
    bioLayout: 'two-column',
  },
]

export function getTemplate(id: string): TemplateConfig {
  return TEMPLATES.find(t => t.id === id) || TEMPLATES[0]
}
```

**Step 3: Update types, schema, allowed fields**

Add `template: string` to `ProfileRow`, add to schema:
```typescript
  template: z.enum(['default', 'minimal', 'festival', 'underground']).optional(),
```

Add `'template'` to `ALLOWED_PROFILE_FIELDS`.

**Step 4: Update theme page**

In `dashboard.theme.tsx`, add template selection cards above the color/font pickers. Each card shows template name, description, and a preview. Selecting a template applies its default colors/font (with confirmation).

**Step 5: Update public EPK page**

In `$slug.tsx`, use `getTemplate(profile.template)` to determine section order, hero style, and bio layout. Render sections dynamically based on `template.sectionOrder` instead of hardcoded order.

**Step 6: Commit**

```bash
git add supabase/schema.sql src/utils/templates.ts src/types/database.ts src/schemas/profile.ts src/server/profile.ts src/routes/_dashboard/dashboard.theme.tsx src/routes/\$slug.tsx
git commit -m "feat: add template system with 4 templates (default, minimal, festival, underground)"
```

---

## Verification Checklist

- [ ] PostHog initializes on public EPK pages (check network tab for posthog requests)
- [ ] Page view events fire with slug, referrer, device_type properties
- [ ] Analytics dashboard shows page views, visitors, referrers, devices
- [ ] Analytics is gated behind Pro tier (free users see upgrade prompt)
- [ ] Date range selector (7d/30d/90d) works
- [ ] Charts render correctly with recharts
- [ ] File upload works via drag-and-drop and browse button
- [ ] Storage usage bar displays correctly
- [ ] Storage quota enforced (free 5GB, pro 100GB)
- [ ] Folders can be created (Pro only), files can be moved between folders
- [ ] File preview modal works for images
- [ ] Files can be deleted (removes from both DB and storage)
- [ ] Favicon upload and display works on public EPK
- [ ] "Hide platform branding" toggle removes footer on public page
- [ ] Custom meta description appears in OG tags
- [ ] Template selector shows 4 template cards
- [ ] Selecting a template applies its default colors/font
- [ ] Public EPK renders sections in template-defined order
- [ ] Bio layout switches between two-column and single-column based on template
- [ ] Hero style changes based on template selection
