# Integrations Feature Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a dashboard "Integrations" page where artists connect Google Analytics, Plausible, SoundCloud/Spotify/Mixcloud embeds, and Mailchimp — with public EPK rendering of enabled integrations.

**Architecture:** Single `integrations` table with JSONB `config` per type. Dashboard page with collapsible cards for each integration. Public EPK injects analytics scripts into head, renders music embeds in a "Listen" section, and renders a newsletter signup form in a "Newsletter" section. Mailchimp API calls proxied server-side to protect API keys.

**Tech Stack:** Supabase (Postgres + RLS), Zod, TanStack Start server functions, react-hook-form, sanitize-html, oEmbed APIs.

**Design doc:** `docs/plans/2026-02-04-integrations-design.md`

**Security note:** All embed HTML rendered via `dangerouslySetInnerHTML` MUST be sanitized through the existing `sanitizeEmbed()` utility in `src/utils/sanitize.ts`, which uses `sanitize-html` with an allowlist of approved iframe hostnames (soundcloud.com, spotify.com, mixcloud.com, etc.). Custom embed HTML from the marketing section should be sanitized with the existing `sanitize()` function. This is the same pattern already used for mix embeds throughout the codebase.

---

### Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/20260204300000_integrations.sql`

**Step 1: Write the migration file**

```sql
-- Integrations table for third-party service connections
CREATE TABLE integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN (
    'google_analytics', 'plausible',
    'soundcloud', 'spotify', 'mixcloud',
    'mailchimp', 'custom_embed'
  )),
  enabled BOOLEAN NOT NULL DEFAULT false,
  config JSONB NOT NULL DEFAULT '{}',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(profile_id, type)
);

ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;

-- Owner CRUD
CREATE POLICY "Owner select on integrations"
  ON integrations FOR SELECT
  USING (is_profile_owner(profile_id));

CREATE POLICY "Owner insert on integrations"
  ON integrations FOR INSERT
  WITH CHECK (is_profile_owner(profile_id));

CREATE POLICY "Owner update on integrations"
  ON integrations FOR UPDATE
  USING (is_profile_owner(profile_id));

CREATE POLICY "Owner delete on integrations"
  ON integrations FOR DELETE
  USING (is_profile_owner(profile_id));

-- Public read (enabled integrations only, for published profiles)
CREATE POLICY "Public read enabled integrations"
  ON integrations FOR SELECT
  USING (
    enabled = true
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = integrations.profile_id AND published = true
    )
  );
```

**Step 2: Push migration**

Run: `npx supabase db push`
Expected: Migration applied successfully.

**Step 3: Commit**

```bash
git add supabase/migrations/20260204300000_integrations.sql
git commit -m "feat: add integrations table with RLS policies"
```

---

### Task 2: Zod Schemas

**Files:**
- Create: `src/schemas/integrations.ts`
- Modify: `src/schemas/index.ts`

**Step 1: Create the schema file**

```typescript
import { z } from 'zod'

// -- Integration types --
export const INTEGRATION_TYPES = [
  'google_analytics', 'plausible',
  'soundcloud', 'spotify', 'mixcloud',
  'mailchimp', 'custom_embed',
] as const

export type IntegrationType = (typeof INTEGRATION_TYPES)[number]

// -- Per-type config schemas --
export const googleAnalyticsConfigSchema = z.object({
  measurement_id: z.string().regex(/^G-[A-Z0-9]+$/, 'Must be a valid GA4 Measurement ID (G-XXXXXXX)'),
})

export const plausibleConfigSchema = z.object({
  domain: z.string().min(1, 'Domain is required').max(253),
})

export const embedConfigSchema = z.object({
  embed_url: z.string().url('Must be a valid URL'),
  embed_html: z.string().optional(),
})

export const mailchimpConfigSchema = z.object({
  api_key: z.string().min(1, 'API key is required'),
  audience_id: z.string().min(1, 'Audience ID is required'),
  form_heading: z.string().max(100).default('Join my mailing list'),
  button_text: z.string().max(50).default('Subscribe'),
})

export const customEmbedConfigSchema = z.object({
  embed_html: z.string().min(1, 'Embed HTML is required'),
  label: z.string().max(50).default('Newsletter'),
})

// -- Map type to config schema --
export const CONFIG_SCHEMAS: Record<IntegrationType, z.ZodType> = {
  google_analytics: googleAnalyticsConfigSchema,
  plausible: plausibleConfigSchema,
  soundcloud: embedConfigSchema,
  spotify: embedConfigSchema,
  mixcloud: embedConfigSchema,
  mailchimp: mailchimpConfigSchema,
  custom_embed: customEmbedConfigSchema,
}

// -- Upsert schema (used by server function inputValidator) --
export const integrationUpsertSchema = z.object({
  type: z.enum(INTEGRATION_TYPES),
  enabled: z.boolean(),
  config: z.record(z.unknown()),
  sort_order: z.number().int().min(0).optional(),
})

export type IntegrationUpsert = z.infer<typeof integrationUpsertSchema>

// -- Mailchimp subscribe schema --
export const mailchimpSubscribeSchema = z.object({
  profileId: z.string().uuid(),
  email: z.string().email('Invalid email address'),
})

// -- Embed resolve schema --
export const embedResolveSchema = z.object({
  url: z.string().url(),
  platform: z.enum(['soundcloud', 'spotify', 'mixcloud']),
})
```

**Step 2: Add barrel export to `src/schemas/index.ts`**

Add this line at the end of the file:

```typescript
export { INTEGRATION_TYPES, integrationUpsertSchema, mailchimpSubscribeSchema, embedResolveSchema, CONFIG_SCHEMAS, type IntegrationType, type IntegrationUpsert } from './integrations'
```

**Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

**Step 4: Commit**

```bash
git add src/schemas/integrations.ts src/schemas/index.ts
git commit -m "feat: add Zod schemas for integrations"
```

---

### Task 3: Server Functions

**Files:**
- Create: `src/server/integrations.ts`

**Step 1: Write the server functions file**

```typescript
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { integrationUpsertSchema, mailchimpSubscribeSchema, embedResolveSchema, CONFIG_SCHEMAS } from '~/schemas/integrations'
import type { IntegrationType } from '~/schemas/integrations'
import { withAuth, withAuthOrNull } from './utils'

// Sensitive fields to strip from public responses
const SENSITIVE_KEYS = new Set(['api_key'])

function stripSensitive(config: Record<string, unknown>): Record<string, unknown> {
  const clean: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(config)) {
    if (!SENSITIVE_KEYS.has(k)) clean[k] = v
  }
  return clean
}

// GET: all integrations for the authenticated user's profile (dashboard)
export const getIntegrations = createServerFn({ method: 'GET' }).handler(async () => {
  const { supabase, user } = await withAuthOrNull()
  if (!user) return []

  const { data } = await supabase
    .from('integrations')
    .select('*')
    .eq('profile_id', user.id)
    .order('sort_order')

  return data || []
})

// GET: enabled integrations for a public profile (strips sensitive fields)
export const getPublicIntegrations = createServerFn({ method: 'GET' })
  .inputValidator((data: unknown) => z.string().uuid().parse(data))
  .handler(async ({ data: profileId }) => {
    const supabase = (await withAuthOrNull()).supabase

    const { data } = await supabase
      .from('integrations')
      .select('*')
      .eq('profile_id', profileId)
      .eq('enabled', true)
      .order('sort_order')

    if (!data) return []

    return data.map((row) => ({
      ...row,
      config: stripSensitive(row.config as Record<string, unknown>),
    }))
  })

// POST: create or update a single integration
export const upsertIntegration = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => integrationUpsertSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabase, user } = await withAuth()

    // Validate config against the type-specific schema
    const configSchema = CONFIG_SCHEMAS[data.type as IntegrationType]
    const configResult = configSchema.safeParse(data.config)
    if (!configResult.success) {
      return { error: configResult.error.errors[0]?.message || 'Invalid config' }
    }

    const { data: row, error } = await supabase
      .from('integrations')
      .upsert(
        {
          profile_id: user.id,
          type: data.type,
          enabled: data.enabled,
          config: configResult.data,
          sort_order: data.sort_order ?? 0,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'profile_id,type' }
      )
      .select()
      .single()

    if (error) return { error: error.message }
    return { data: row }
  })

// POST: delete an integration
export const deleteIntegration = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => z.object({ type: z.string() }).parse(data))
  .handler(async ({ data }) => {
    const { supabase, user } = await withAuth()

    const { error } = await supabase
      .from('integrations')
      .delete()
      .eq('profile_id', user.id)
      .eq('type', data.type)

    if (error) return { error: error.message }
    return { success: true }
  })

// POST: resolve a music URL to embed HTML via oEmbed
export const resolveEmbed = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => embedResolveSchema.parse(data))
  .handler(async ({ data }) => {
    await withAuth() // ensure authenticated

    const { url, platform } = data

    try {
      if (platform === 'spotify') {
        // Spotify: transform URL path to embed URL
        // https://open.spotify.com/track/xxx -> https://open.spotify.com/embed/track/xxx
        const parsed = new URL(url)
        if (!parsed.hostname.includes('spotify.com')) {
          return { error: 'Not a valid Spotify URL' }
        }
        const embedUrl = `https://open.spotify.com/embed${parsed.pathname}`
        const embedHtml = `<iframe src="${embedUrl}" width="100%" height="352" frameborder="0" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>`
        return { data: { embed_url: url, embed_html: embedHtml } }
      }

      // SoundCloud and Mixcloud: use oEmbed
      const oembedUrls: Record<string, string> = {
        soundcloud: `https://soundcloud.com/oembed?format=json&url=${encodeURIComponent(url)}`,
        mixcloud: `https://www.mixcloud.com/oembed/?format=json&url=${encodeURIComponent(url)}`,
      }

      const oembedUrl = oembedUrls[platform]
      if (!oembedUrl) return { error: 'Unsupported platform' }

      const res = await fetch(oembedUrl)
      if (!res.ok) return { error: `Failed to resolve embed (${res.status})` }

      const json = await res.json() as { html?: string }
      if (!json.html) return { error: 'No embed HTML returned' }

      return { data: { embed_url: url, embed_html: json.html } }
    } catch {
      return { error: 'Failed to resolve embed URL' }
    }
  })

// POST: subscribe an email to a Mailchimp audience (public endpoint)
export const subscribeMailchimp = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => mailchimpSubscribeSchema.parse(data))
  .handler(async ({ data }) => {
    const supabase = (await withAuthOrNull()).supabase

    // Fetch the Mailchimp integration for this profile
    const { data: integration } = await supabase
      .from('integrations')
      .select('config')
      .eq('profile_id', data.profileId)
      .eq('type', 'mailchimp')
      .eq('enabled', true)
      .single()

    if (!integration) return { error: 'Newsletter signup not available' }

    const config = integration.config as { api_key: string; audience_id: string }
    if (!config.api_key || !config.audience_id) return { error: 'Newsletter not configured' }

    // Mailchimp API: extract datacenter from API key (key ends with -usX)
    const dc = config.api_key.split('-').pop()
    const mcUrl = `https://${dc}.api.mailchimp.com/3.0/lists/${config.audience_id}/members`

    try {
      const res = await fetch(mcUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.api_key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email_address: data.email,
          status: 'subscribed',
        }),
      })

      if (!res.ok) {
        const body = await res.json() as { title?: string }
        if (body.title === 'Member Exists') {
          return { data: { already_subscribed: true } }
        }
        return { error: 'Failed to subscribe. Please try again.' }
      }

      return { data: { subscribed: true } }
    } catch {
      return { error: 'Failed to subscribe. Please try again.' }
    }
  })
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

**Step 3: Commit**

```bash
git add src/server/integrations.ts
git commit -m "feat: add server functions for integrations CRUD and embed resolution"
```

---

### Task 4: IntegrationCard Component

**Files:**
- Create: `src/components/IntegrationCard.tsx`

**Step 1: Write the component**

This component uses `sanitizeEmbed()` from `~/utils/sanitize` for embed preview HTML (same allowlisted iframe hostnames used by the existing mix embeds).

```typescript
import { useState } from 'react'
import { FORM_INPUT, FORM_INPUT_ERROR, FORM_ERROR_MSG, FORM_LABEL, BTN_PRIMARY, CARD_SECTION } from '~/components/forms/styles'
import { sanitizeEmbed } from '~/utils/sanitize'

interface FieldConfig {
  name: string
  label: string
  type: 'text' | 'password' | 'url' | 'textarea'
  placeholder?: string
}

interface IntegrationCardProps {
  title: string
  type: string
  fields: FieldConfig[]
  initialConfig: Record<string, string>
  initialEnabled: boolean
  onSave: (config: Record<string, string>, enabled: boolean) => Promise<{ error?: string }>
  onResolveEmbed?: (url: string) => Promise<{ data?: { embed_html: string }; error?: string }>
  previewHtml?: string
}

export function IntegrationCard({
  title,
  fields,
  initialConfig,
  initialEnabled,
  onSave,
  onResolveEmbed,
  previewHtml: initialPreview,
}: IntegrationCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [enabled, setEnabled] = useState(initialEnabled)
  const [config, setConfig] = useState<Record<string, string>>(initialConfig)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [previewHtml, setPreviewHtml] = useState(initialPreview || '')
  const [resolving, setResolving] = useState(false)

  const handleFieldChange = (name: string, value: string) => {
    setConfig((prev) => ({ ...prev, [name]: value }))
    setSaved(false)
    setError('')
    setFieldErrors((prev) => ({ ...prev, [name]: '' }))
  }

  const handleResolve = async () => {
    if (!onResolveEmbed || !config.embed_url) return
    setResolving(true)
    setError('')
    const result = await onResolveEmbed(config.embed_url)
    if (result.error) {
      setError(result.error)
    } else if (result.data?.embed_html) {
      setConfig((prev) => ({ ...prev, embed_html: result.data!.embed_html }))
      setPreviewHtml(result.data.embed_html)
    }
    setResolving(false)
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')
    setSaved(false)
    const result = await onSave(config, enabled)
    if (result.error) {
      setError(result.error)
    } else {
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }
    setSaving(false)
  }

  return (
    <div className={CARD_SECTION}>
      {/* Header - always visible */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <span className="font-semibold text-text-primary">{title}</span>
          <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 ${
            enabled ? 'bg-green-100 text-green-700' : 'bg-surface text-text-secondary'
          }`}>
            {enabled ? 'Active' : 'Inactive'}
          </span>
        </div>
        <span className="text-text-secondary text-sm">{expanded ? '\u25B2' : '\u25BC'}</span>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="mt-6 space-y-4">
          {/* Enable toggle */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => { setEnabled(e.target.checked); setSaved(false) }}
              className="w-4 h-4 accent-accent"
            />
            <span className="text-sm text-text-secondary">Enable on public EPK</span>
          </label>

          {/* Config fields */}
          {fields.map((field) => (
            <div key={field.name}>
              <label className={FORM_LABEL}>{field.label}</label>
              {field.type === 'textarea' ? (
                <textarea
                  value={config[field.name] || ''}
                  onChange={(e) => handleFieldChange(field.name, e.target.value)}
                  placeholder={field.placeholder}
                  rows={4}
                  className={fieldErrors[field.name] ? FORM_INPUT_ERROR : FORM_INPUT}
                />
              ) : (
                <input
                  type={field.type}
                  value={config[field.name] || ''}
                  onChange={(e) => handleFieldChange(field.name, e.target.value)}
                  placeholder={field.placeholder}
                  className={fieldErrors[field.name] ? FORM_INPUT_ERROR : FORM_INPUT}
                />
              )}
              {fieldErrors[field.name] && <p className={FORM_ERROR_MSG}>{fieldErrors[field.name]}</p>}
            </div>
          ))}

          {/* Resolve embed button (for music embeds) */}
          {onResolveEmbed && (
            <button
              type="button"
              onClick={handleResolve}
              disabled={resolving || !config.embed_url}
              className={`${BTN_PRIMARY} text-xs`}
            >
              {resolving ? 'Resolving...' : 'Preview Embed'}
            </button>
          )}

          {/* Embed preview - sanitized through sanitizeEmbed allowlist */}
          {previewHtml && (
            <div className="border border-border p-2">
              <p className={`${FORM_LABEL} mb-2`}>Preview</p>
              <div
                className="[&_iframe]:w-full [&_iframe]:rounded-none"
                dangerouslySetInnerHTML={{ __html: sanitizeEmbed(previewHtml) }}
              />
            </div>
          )}

          {/* Save / status */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className={BTN_PRIMARY}
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
            {saved && <span className="text-xs font-semibold uppercase tracking-wider text-green-600">Saved</span>}
            {error && <span className="text-xs text-red-500">{error}</span>}
          </div>
        </div>
      )}
    </div>
  )
}
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

**Step 3: Commit**

```bash
git add src/components/IntegrationCard.tsx
git commit -m "feat: add IntegrationCard collapsible component"
```

---

### Task 5: Dashboard Integrations Page

**Files:**
- Create: `src/routes/_dashboard/dashboard.integrations.tsx`
- Modify: `src/components/DashboardSidebar.tsx` — add nav item

**Step 1: Write the dashboard page**

```typescript
import { createFileRoute } from '@tanstack/react-router'
import { getIntegrations, upsertIntegration, resolveEmbed } from '~/server/integrations'
import { IntegrationCard } from '~/components/IntegrationCard'
import type { IntegrationType } from '~/schemas/integrations'

export const Route = createFileRoute('/_dashboard/dashboard/integrations')({
  loader: () => getIntegrations(),
  component: IntegrationsPage,
})

interface IntegrationRow {
  id: string
  type: string
  enabled: boolean
  config: Record<string, string>
  sort_order: number
}

const ANALYTICS_INTEGRATIONS: { type: IntegrationType; title: string; fields: { name: string; label: string; type: 'text' | 'password' | 'url' | 'textarea'; placeholder?: string }[] }[] = [
  {
    type: 'google_analytics',
    title: 'Google Analytics',
    fields: [
      { name: 'measurement_id', label: 'Measurement ID', type: 'text', placeholder: 'G-XXXXXXXXXX' },
    ],
  },
  {
    type: 'plausible',
    title: 'Plausible Analytics',
    fields: [
      { name: 'domain', label: 'Domain', type: 'text', placeholder: 'yourdomain.com' },
    ],
  },
]

const EMBED_INTEGRATIONS: { type: IntegrationType; title: string }[] = [
  { type: 'soundcloud', title: 'SoundCloud' },
  { type: 'spotify', title: 'Spotify' },
  { type: 'mixcloud', title: 'Mixcloud' },
]

const MARKETING_INTEGRATIONS: { type: IntegrationType; title: string; fields: { name: string; label: string; type: 'text' | 'password' | 'url' | 'textarea'; placeholder?: string }[] }[] = [
  {
    type: 'mailchimp',
    title: 'Mailchimp',
    fields: [
      { name: 'api_key', label: 'API Key', type: 'password', placeholder: 'xxxxxxxx-usXX' },
      { name: 'audience_id', label: 'Audience ID', type: 'text', placeholder: 'e.g. abc1234def' },
      { name: 'form_heading', label: 'Form Heading', type: 'text', placeholder: 'Join my mailing list' },
      { name: 'button_text', label: 'Button Text', type: 'text', placeholder: 'Subscribe' },
    ],
  },
  {
    type: 'custom_embed',
    title: 'Custom Embed',
    fields: [
      { name: 'label', label: 'Section Label', type: 'text', placeholder: 'Newsletter' },
      { name: 'embed_html', label: 'Embed HTML', type: 'textarea', placeholder: '<form ...>' },
    ],
  },
]

function IntegrationsPage() {
  const integrations = Route.useLoaderData() as IntegrationRow[]

  const getExisting = (type: string) =>
    integrations.find((i) => i.type === type)

  const handleSave = async (type: IntegrationType, config: Record<string, string>, enabled: boolean) => {
    const result = await upsertIntegration({
      data: { type, config, enabled, sort_order: getExisting(type)?.sort_order ?? 0 },
    })
    if ('error' in result && result.error) return { error: result.error as string }
    return {}
  }

  const handleResolveEmbed = (platform: IntegrationType) => async (url: string) => {
    const result = await resolveEmbed({
      data: { url, platform: platform as 'soundcloud' | 'spotify' | 'mixcloud' },
    })
    if ('error' in result && result.error) return { error: result.error as string }
    if ('data' in result && result.data) return { data: result.data as { embed_html: string } }
    return { error: 'Unknown error' }
  }

  return (
    <div>
      <h1 className="font-display font-extrabold text-2xl tracking-tight uppercase mb-8">
        Integrations
      </h1>

      {/* Analytics */}
      <h2 className="text-xs font-semibold uppercase tracking-wider text-text-secondary mb-4">Analytics</h2>
      <div className="space-y-4 mb-10">
        {ANALYTICS_INTEGRATIONS.map((integration) => {
          const existing = getExisting(integration.type)
          return (
            <IntegrationCard
              key={integration.type}
              title={integration.title}
              type={integration.type}
              fields={integration.fields}
              initialConfig={(existing?.config as Record<string, string>) || {}}
              initialEnabled={existing?.enabled || false}
              onSave={(config, enabled) => handleSave(integration.type, config, enabled)}
            />
          )
        })}
      </div>

      {/* Music Embeds */}
      <h2 className="text-xs font-semibold uppercase tracking-wider text-text-secondary mb-4">Music Embeds</h2>
      <div className="space-y-4 mb-10">
        {EMBED_INTEGRATIONS.map((integration) => {
          const existing = getExisting(integration.type)
          const existingConfig = (existing?.config || {}) as Record<string, string>
          return (
            <IntegrationCard
              key={integration.type}
              title={integration.title}
              type={integration.type}
              fields={[
                { name: 'embed_url', label: 'Track / Playlist URL', type: 'url', placeholder: `https://${integration.type}.com/...` },
              ]}
              initialConfig={existingConfig}
              initialEnabled={existing?.enabled || false}
              onSave={(config, enabled) => handleSave(integration.type, config, enabled)}
              onResolveEmbed={handleResolveEmbed(integration.type)}
              previewHtml={existingConfig.embed_html}
            />
          )
        })}
      </div>

      {/* Marketing */}
      <h2 className="text-xs font-semibold uppercase tracking-wider text-text-secondary mb-4">Marketing</h2>
      <div className="space-y-4 mb-10">
        {MARKETING_INTEGRATIONS.map((integration) => {
          const existing = getExisting(integration.type)
          return (
            <IntegrationCard
              key={integration.type}
              title={integration.title}
              type={integration.type}
              fields={integration.fields}
              initialConfig={(existing?.config as Record<string, string>) || {}}
              initialEnabled={existing?.enabled || false}
              onSave={(config, enabled) => handleSave(integration.type, config, enabled)}
            />
          )
        })}
      </div>
    </div>
  )
}
```

**Step 2: Add nav item to sidebar**

In `src/components/DashboardSidebar.tsx`, find the `NAV_ITEMS` array. Insert after the Analytics entry:

```typescript
  { label: 'Integrations', href: '/dashboard/integrations' },
```

So the end of the array reads:
```typescript
  { label: 'Analytics', href: '/dashboard/analytics' },
  { label: 'Integrations', href: '/dashboard/integrations' },
  { label: 'Settings', href: '/dashboard/settings' },
```

**Step 3: Verify TypeScript compiles and dev server starts**

Run: `npx tsc --noEmit`
Run: `npm run dev` (verify the page loads at `/dashboard/integrations`)

**Step 4: Commit**

```bash
git add src/routes/_dashboard/dashboard.integrations.tsx src/components/DashboardSidebar.tsx
git commit -m "feat: add integrations dashboard page with sidebar nav"
```

---

### Task 6: Public EPK — Analytics Script Injection

**Files:**
- Modify: `src/server/public-profile.ts` — fetch integrations in the loader
- Modify: `src/routes/$slug.tsx` — inject analytics scripts

**Step 1: Add integrations to the public profile loader**

In `src/server/public-profile.ts`, add to the `Promise.all` destructuring:

```typescript
{ data: integrations },
```

And add this query to the `Promise.all` array:

```typescript
supabase.from('integrations').select('*').eq('profile_id', profileId).eq('enabled', true).order('sort_order'),
```

Add to the return object:

```typescript
integrations: (integrations || []).map((row) => {
  // Strip api_key from public response
  const config = { ...(row.config as Record<string, unknown>) }
  delete config.api_key
  return { ...row, config }
}),
```

Note: Keep the raw `profileId` available for the Mailchimp subscribe function — add `profileId` to the return object as well:

```typescript
profileId,
```

**Step 2: Inject analytics scripts in `$slug.tsx`**

In the `PublicEPK` component, add a `useEffect` after the existing IntersectionObserver `useEffect`:

```typescript
// Inject third-party analytics scripts
useEffect(() => {
  if (typeof window === 'undefined') return
  const integrations = data?.integrations || []

  const ga = integrations.find((i: { type: string }) => i.type === 'google_analytics')
  if (ga) {
    const mid = (ga.config as { measurement_id: string }).measurement_id
    if (mid) {
      const script1 = document.createElement('script')
      script1.src = `https://www.googletagmanager.com/gtag/js?id=${mid}`
      script1.async = true
      document.head.appendChild(script1)

      const script2 = document.createElement('script')
      script2.textContent = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${mid}');`
      document.head.appendChild(script2)
    }
  }

  const pl = integrations.find((i: { type: string }) => i.type === 'plausible')
  if (pl) {
    const domain = (pl.config as { domain: string }).domain
    if (domain) {
      const script = document.createElement('script')
      script.src = 'https://plausible.io/js/script.js'
      script.defer = true
      script.setAttribute('data-domain', domain)
      document.head.appendChild(script)
    }
  }
}, [data?.integrations])
```

**Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`

**Step 4: Commit**

```bash
git add src/server/public-profile.ts src/routes/\$slug.tsx
git commit -m "feat: inject analytics scripts on public EPK from integrations"
```

---

### Task 7: Public EPK — Music Embeds and Newsletter Sections

**Files:**
- Modify: `src/routes/$slug.tsx`

**Step 1: Add MailchimpForm component**

Add this component inside `$slug.tsx`, above `PublicEPK`:

```typescript
function MailchimpForm({ profileId, heading, buttonText, textSecClass }: {
  profileId: string
  heading: string
  buttonText: string
  textSecClass: string
}) {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('loading')

    const { subscribeMailchimp } = await import('~/server/integrations')
    const result = await subscribeMailchimp({ data: { profileId, email } })

    if ('error' in result && result.error) {
      setStatus('error')
      setMessage(result.error as string)
    } else {
      setStatus('success')
      setMessage('Thanks for subscribing!')
      setEmail('')
    }
  }

  return (
    <div className="max-w-md mx-auto text-center">
      <p className={`${textSecClass} mb-4`}>{heading}</p>
      {status === 'success' ? (
        <p className="text-green-600 font-semibold text-sm">{message}</p>
      ) : (
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Your email"
            className="flex-1 bg-transparent border border-current/20 px-4 py-2 text-sm placeholder-current/40 focus:border-accent focus:outline-none"
          />
          <button
            type="submit"
            disabled={status === 'loading'}
            className="px-6 py-2 text-xs font-semibold uppercase tracking-wider bg-accent text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {status === 'loading' ? '...' : buttonText}
          </button>
        </form>
      )}
      {status === 'error' && <p className="text-red-500 text-xs mt-2">{message}</p>}
    </div>
  )
}
```

**Step 2: Add integration sections after template sections**

In the `PublicEPK` component, after the closing of `{template.sectionOrder.map(...)}`, add before `</main>`:

```typescript
{/* Integration sections */}
{(() => {
  const intList = data.integrations || []
  const embedIntegrations = intList.filter(
    (i: { type: string }) => ['soundcloud', 'spotify', 'mixcloud'].includes(i.type)
  )
  const marketingIntegrations = intList.filter(
    (i: { type: string }) => ['mailchimp', 'custom_embed'].includes(i.type)
  )

  return (
    <>
      {embedIntegrations.length > 0 && (
        <EPKSection id="listen-embeds" heading="Listen">
          <div className="space-y-6">
            {embedIntegrations.map((integration: { id: string; config: Record<string, string> }) => (
              integration.config.embed_html ? (
                <div
                  key={integration.id}
                  className="[&_iframe]:w-full [&_iframe]:rounded-none"
                  dangerouslySetInnerHTML={{ __html: sanitizeEmbed(integration.config.embed_html) }}
                />
              ) : null
            ))}
          </div>
        </EPKSection>
      )}

      {marketingIntegrations.length > 0 && marketingIntegrations.map((integration: { id: string; type: string; config: Record<string, string> }) => (
        integration.type === 'mailchimp' ? (
          <EPKSection key={integration.id} id="newsletter" heading={integration.config.form_heading || 'Newsletter'}>
            <MailchimpForm
              profileId={data.profileId}
              heading={integration.config.form_heading || 'Join my mailing list'}
              buttonText={integration.config.button_text || 'Subscribe'}
              textSecClass={textSecClass}
            />
          </EPKSection>
        ) : integration.type === 'custom_embed' && integration.config.embed_html ? (
          <EPKSection key={integration.id} id="newsletter" heading={integration.config.label || 'Newsletter'}>
            <div dangerouslySetInnerHTML={{ __html: sanitize(integration.config.embed_html) }} />
          </EPKSection>
        ) : null
      ))}
    </>
  )
})()}
```

Note: The custom embed HTML uses `sanitize()` (not `sanitizeEmbed()`) since it may contain form elements, not just iframes. Import `sanitize` at the top of the file if not already imported.

**Step 3: Update nav sections**

Add to the `navSections` array:

```typescript
(data.integrations || []).some((i: { type: string }) => ['soundcloud', 'spotify', 'mixcloud'].includes(i.type)) && { label: 'Listen', href: '#listen-embeds' },
(data.integrations || []).some((i: { type: string }) => ['mailchimp', 'custom_embed'].includes(i.type)) && { label: 'Newsletter', href: '#newsletter' },
```

**Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit`

**Step 5: Commit**

```bash
git add src/routes/\$slug.tsx
git commit -m "feat: render music embeds and newsletter on public EPK"
```

---

### Task 8: Add IntegrationRow Type

**Files:**
- Modify: `src/types/database.ts`

**Step 1: Add the type**

Add to `src/types/database.ts`:

```typescript
export interface IntegrationRow {
  id: string
  profile_id: string
  type: string
  enabled: boolean
  config: Record<string, unknown>
  sort_order: number
  created_at: string
  updated_at: string
}
```

**Step 2: Commit**

```bash
git add src/types/database.ts
git commit -m "feat: add IntegrationRow type"
```

---

### Task 9: Final Verification

**Step 1: TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors.

**Step 2: Dev server smoke test**

Run: `npm run dev`

Verify:
- `/dashboard/integrations` page loads with all 7 integration cards
- Sidebar shows "Integrations" between "Analytics" and "Settings"
- Cards expand/collapse, save works
- Music embed URL resolves to preview iframe
- Public EPK page renders embed sections and newsletter form when enabled
- Analytics scripts appear in document.head when enabled

**Step 3: Production build**

Run: `npm run build`
Expected: Build succeeds with no errors.

**Step 4: Final commit if any fixes needed**

```bash
git add -A
git commit -m "feat: integrations feature complete"
```
