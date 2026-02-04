# Integrations Feature Design

## Overview

A dedicated "Integrations" page on the dashboard where artists connect third-party services to their EPK. Three categories: Analytics, Music Embeds, and Marketing.

## Categories & Supported Services

### Analytics (invisible on public EPK)
- **Google Analytics** — artist provides Measurement ID, we inject `gtag.js` into their public page
- **Plausible** — artist provides domain, we inject the Plausible script tag

### Music Embeds (visible "Listen" section on public EPK)
- **SoundCloud** — artist pastes track/playlist URL, we resolve via oEmbed API at save time
- **Spotify** — artist pastes track/album/playlist URL, we transform to embed URL
- **Mixcloud** — artist pastes mix URL, we resolve via oEmbed API at save time

### Marketing (visible "Newsletter" section on public EPK)
- **Mailchimp** — artist provides API key + audience ID, we render a themed signup form and proxy submissions server-side
- **Custom embed** — artist pastes raw form HTML (sanitized with DOMPurify), fallback for any provider

## Data Model

Single `integrations` table:

```sql
create table integrations (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references profiles(id) on delete cascade,
  type        text not null check (type in (
    'google_analytics', 'plausible',
    'soundcloud', 'spotify', 'mixcloud',
    'mailchimp', 'custom_embed'
  )),
  enabled     boolean not null default false,
  config      jsonb not null default '{}',
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique(profile_id, type)
);
```

### Config shapes by type

- **google_analytics:** `{ measurement_id: "G-XXXXXXX" }`
- **plausible:** `{ domain: "artist.com" }`
- **soundcloud / spotify / mixcloud:** `{ embed_url: "https://...", embed_html: "<iframe...>" }`
- **mailchimp:** `{ api_key: "...", audience_id: "...", form_heading: "Join my mailing list", button_text: "Subscribe" }`
- **custom_embed:** `{ embed_html: "<form...>", label: "Newsletter" }`

### RLS

Uses existing `is_profile_owner(profile_id)` function — only profile owner, org owner/admin, or assigned manager can read/write.

## Dashboard UI

### Page: `dashboard.integrations.tsx`

Single page with three category headings: Analytics, Music Embeds, Marketing.

Each integration is an **IntegrationCard** component:
- Collapsed by default: integration name, icon, enabled/disabled badge
- Expands on click to show config fields
- Individual save button per card
- Inline validation feedback

No global "Save All" — `DashboardHeader` shows page title only.

### Sidebar placement

"Integrations" nav item sits between "Analytics" and "Settings" in the sidebar.

## Public EPK Rendering

### Analytics scripts

Injected into the page head when enabled:
- Google Analytics: `gtag.js` script + `gtag('config', measurement_id)`
- Plausible: `<script defer data-domain="..." src="https://plausible.io/js/script.js">`

Both can be active simultaneously.

### Music Embeds section

If any music embed integration is enabled, render a "Listen" section. Each enabled platform renders its stored `embed_html` iframe, ordered by `sort_order`.

URL-to-embed conversion happens at save time (not render time):
- SoundCloud: oEmbed API → iframe HTML
- Spotify: URL path transform → embed URL → iframe
- Mixcloud: oEmbed API → iframe HTML

### Marketing section

If Mailchimp or custom embed is enabled, render a section with the configured label.

- **Mailchimp:** styled form (email input + button) matching EPK theme. Form POSTs to a server function that proxies to Mailchimp API — API key never sent to client.
- **Custom embed:** raw HTML rendered in a sanitized container (DOMPurify).

### Section ordering

Music and marketing sections respect `sort_order` and can be toggled on/off. Reorder controls available on the Integrations dashboard page.

## Server Functions

In `src/server/integrations.ts`:

| Function | Purpose |
|---|---|
| `getIntegrations({ profileId })` | Fetch all integrations for dashboard |
| `getPublicIntegrations({ profileId })` | Fetch enabled integrations, strip sensitive fields (API keys) |
| `upsertIntegration({ profileId, type, config, enabled, sort_order })` | Create or update single integration with Zod validation |
| `deleteIntegration({ profileId, type })` | Remove an integration |
| `subscribeMailchimp({ profileId, email })` | Server-side proxy for newsletter signup |
| `resolveEmbed({ url, platform })` | Hit oEmbed APIs at save time, return iframe HTML |

## Security

- Mailchimp API keys stored in DB `config` JSONB, never returned to client on public routes
- Custom embed HTML sanitized with DOMPurify before rendering
- Mailchimp subscribe endpoint validates email format and is rate-limited
- RLS enforces ownership via `is_profile_owner()`

## Zod Schemas

In `src/schemas/integrations.ts`:
- One config schema per integration type
- Discriminated union by `type` field
- Base schema for the `integrations` row (id, profile_id, type, enabled, config, sort_order)

## Files to Create

| File | Purpose |
|---|---|
| `supabase/migrations/<timestamp>_integrations.sql` | Table + RLS policies |
| `src/schemas/integrations.ts` | Zod schemas |
| `src/server/integrations.ts` | Server functions |
| `src/routes/_dashboard/dashboard.integrations.tsx` | Dashboard page |
| `src/components/IntegrationCard.tsx` | Collapsible card component |

## Files to Modify

| File | Change |
|---|---|
| `src/schemas/index.ts` | Barrel export new schemas |
| `src/components/DashboardSidebar.tsx` | Add "Integrations" nav item |
| `src/routes/$slug.tsx` | Inject analytics scripts + render embed/newsletter sections |
| `src/styles.css` | Embed container sizing, card styles if needed |
