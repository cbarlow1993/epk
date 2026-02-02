# Phase 3: Theme Customisation & Live Preview — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a theme editor to the dashboard where users can customise their EPK's accent colour, background colour, and font — with a live preview panel. Apply these theme settings dynamically on the public EPK page.

**Architecture:** Theme settings are stored on the `profiles` table (accent_color, bg_color, font_family, custom_css). The dashboard Theme page has colour pickers, a font selector, and an iframe-based live preview. The public EPK page reads theme values and applies them as CSS custom properties on the root element.

**Tech Stack:** Supabase, TanStack Start, Tailwind CSS v4, Google Fonts

---

### Task 1: Theme Editor Dashboard Page

**Files:**
- Create: `src/routes/_dashboard/dashboard.theme.tsx`

**Step 1: Create `src/routes/_dashboard/dashboard.theme.tsx`**

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { useState, useCallback } from 'react'
import { getProfile, updateProfile } from '~/server/profile'

export const Route = createFileRoute('/_dashboard/dashboard/theme')({
  loader: () => getProfile(),
  component: ThemeEditor,
})

const FONT_OPTIONS = [
  'Inter',
  'Poppins',
  'Montserrat',
  'Space Grotesk',
  'DM Sans',
  'Outfit',
  'Playfair Display',
  'Bebas Neue',
]

function ThemeEditor() {
  const initial = Route.useLoaderData()
  const [accentColor, setAccentColor] = useState(initial?.accent_color || '#3b82f6')
  const [bgColor, setBgColor] = useState(initial?.bg_color || '#0a0a0f')
  const [fontFamily, setFontFamily] = useState(initial?.font_family || 'Inter')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const [timer, setTimer] = useState<ReturnType<typeof setTimeout> | null>(null)
  const autoSave = useCallback((field: string, value: string) => {
    if (timer) clearTimeout(timer)
    const t = setTimeout(async () => {
      setSaving(true)
      setSaved(false)
      await updateProfile({ data: { [field]: value } as any })
      setSaving(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }, 500)
    setTimer(t)
  }, [timer])

  const previewUrl = initial?.slug ? `/${initial.slug}` : null

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-black uppercase tracking-wider">Theme</h1>
        <span className="text-xs text-text-secondary">
          {saving ? 'Saving...' : saved ? 'Saved' : ''}
        </span>
      </div>

      <div className="grid lg:grid-cols-[320px_1fr] gap-8">
        {/* Controls */}
        <div className="space-y-6">
          <div>
            <label className="block text-sm uppercase tracking-widest font-bold mb-2">Accent Colour</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={accentColor}
                onChange={(e) => { setAccentColor(e.target.value); autoSave('accent_color', e.target.value) }}
                className="w-12 h-10 rounded border border-white/10 bg-transparent cursor-pointer"
              />
              <input
                type="text"
                value={accentColor}
                onChange={(e) => { setAccentColor(e.target.value); autoSave('accent_color', e.target.value) }}
                className="flex-1 bg-dark-card border border-white/10 rounded-lg px-3 py-2 text-white text-sm font-mono focus:border-accent focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm uppercase tracking-widest font-bold mb-2">Background Colour</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={bgColor}
                onChange={(e) => { setBgColor(e.target.value); autoSave('bg_color', e.target.value) }}
                className="w-12 h-10 rounded border border-white/10 bg-transparent cursor-pointer"
              />
              <input
                type="text"
                value={bgColor}
                onChange={(e) => { setBgColor(e.target.value); autoSave('bg_color', e.target.value) }}
                className="flex-1 bg-dark-card border border-white/10 rounded-lg px-3 py-2 text-white text-sm font-mono focus:border-accent focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm uppercase tracking-widest font-bold mb-2">Font</label>
            <select
              value={fontFamily}
              onChange={(e) => { setFontFamily(e.target.value); autoSave('font_family', e.target.value) }}
              className="w-full bg-dark-card border border-white/10 rounded-lg px-4 py-3 text-white focus:border-accent focus:outline-none"
            >
              {FONT_OPTIONS.map((font) => (
                <option key={font} value={font} style={{ fontFamily: font }}>{font}</option>
              ))}
            </select>
          </div>

          {/* Preview swatch */}
          <div className="rounded-lg border border-white/10 overflow-hidden">
            <div className="p-4" style={{ backgroundColor: bgColor }}>
              <p className="font-bold text-sm" style={{ fontFamily, color: '#fff' }}>Preview Swatch</p>
              <p className="text-xs mt-1" style={{ color: accentColor }}>Accent colour</p>
              <div className="mt-3 h-1 rounded" style={{ backgroundColor: accentColor }} />
            </div>
          </div>
        </div>

        {/* Live preview iframe */}
        <div className="hidden lg:block">
          <label className="block text-sm uppercase tracking-widest font-bold mb-2">Live Preview</label>
          {previewUrl ? (
            <div className="border border-white/10 rounded-lg overflow-hidden bg-dark-surface" style={{ height: '70vh' }}>
              <iframe
                src={`${previewUrl}?preview=true&accent=${encodeURIComponent(accentColor)}&bg=${encodeURIComponent(bgColor)}&font=${encodeURIComponent(fontFamily)}`}
                className="w-full h-full"
                title="EPK Preview"
              />
            </div>
          ) : (
            <div className="border border-white/10 rounded-lg p-8 text-center text-text-secondary text-sm">
              Set a URL slug on the Profile page to enable live preview.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
```

**Step 2: Verify theme editor loads**

**Step 3: Commit**

```bash
git add -A && git commit -m "feat: add theme editor with colour pickers, font selector, and live preview"
```

---

### Task 2: Apply Theme to Public EPK Page

**Files:**
- Modify: `src/routes/$slug.tsx`

**Step 1: Apply theme CSS custom properties on the public EPK**

At the top of the `PublicEPK` component, read theme values from the profile and override query params (for preview mode). Apply them as inline CSS variables on the wrapper element.

Add this logic at the start of the `PublicEPK` function:

```tsx
import { useSearch } from '@tanstack/react-router'

// Inside PublicEPK component:
const search = useSearch({ from: '/$slug' })
const accent = (search as any)?.accent || profile.accent_color || '#3b82f6'
const bg = (search as any)?.bg || profile.bg_color || '#0a0a0f'
const font = (search as any)?.font || profile.font_family || 'Inter'

// Wrap the entire return in a div with CSS custom properties:
return (
  <div
    style={{
      '--color-accent': accent,
      '--color-accent-glow': accent,
      '--color-dark-bg': bg,
      '--font-display': `'${font}', sans-serif`,
      backgroundColor: bg,
      fontFamily: `'${font}', sans-serif`,
    } as React.CSSProperties}
  >
    {/* ... existing content ... */}
  </div>
)
```

**Step 2: Add search params validation to the route**

```tsx
export const Route = createFileRoute('/$slug')({
  validateSearch: (search: Record<string, unknown>) => ({
    preview: search.preview === 'true',
    accent: (search.accent as string) || undefined,
    bg: (search.bg as string) || undefined,
    font: (search.font as string) || undefined,
  }),
  // ... rest of route config
})
```

**Step 3: Add Google Fonts preload for the selected font**

In the `head` function of the route, dynamically load the profile's font:

```tsx
head: ({ loaderData }) => {
  const name = loaderData?.profile?.display_name || 'DJ'
  const font = loaderData?.profile?.font_family || 'Inter'
  const fontParam = font.replace(/ /g, '+')
  return {
    meta: [
      { title: `${name} | DJ - Official Press Kit` },
      { name: 'description', content: `Official Electronic Press Kit for ${name}.` },
      { name: 'og:title', content: `${name} | DJ - Official Press Kit` },
      { name: 'og:type', content: 'website' },
    ],
    links: [
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      { rel: 'stylesheet', href: `https://fonts.googleapis.com/css2?family=${fontParam}:wght@400;700;900&display=swap` },
    ],
  }
},
```

**Step 4: Verify theme applies to public EPK and preview works from dashboard**

**Step 5: Commit**

```bash
git add -A && git commit -m "feat: apply theme colours and fonts to public EPK page with preview support"
```

---

### Task 3: "Built with [Brand]" Footer Logic

**Files:**
- Modify: `src/routes/$slug.tsx`

**Step 1: Add conditional branded footer**

At the bottom of the public EPK page (before the closing `</div>`), add:

```tsx
{/* Branded footer - shown on free tier, hidden on paid */}
{profile.tier === 'free' && (
  <footer className="py-6 text-center border-t border-white/5">
    <p className="text-xs text-text-secondary">
      Built with <a href="/" className="text-accent hover:underline">DJ EPK</a>
    </p>
  </footer>
)}
```

**Step 2: Verify footer appears for free tier, hidden for pro**

**Step 3: Commit**

```bash
git add -A && git commit -m "feat: add conditional branded footer for free tier on public EPK"
```

---

### Task 4: Settings Page (Account Management)

**Files:**
- Create: `src/routes/_dashboard/dashboard.settings.tsx`

**Step 1: Create `src/routes/_dashboard/dashboard.settings.tsx`**

Basic settings page with account info and a placeholder for billing (Phase 4).

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { getProfile } from '~/server/profile'

export const Route = createFileRoute('/_dashboard/dashboard/settings')({
  loader: () => getProfile(),
  component: SettingsPage,
})

function SettingsPage() {
  const profile = Route.useLoaderData()

  return (
    <div>
      <h1 className="text-2xl font-black uppercase tracking-wider mb-8">Settings</h1>

      <div className="space-y-8 max-w-2xl">
        {/* Account Info */}
        <div className="bg-dark-card border border-white/10 rounded-lg p-6">
          <h2 className="text-sm uppercase tracking-widest font-bold mb-4">Account</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-text-secondary">Plan</span>
              <span className="capitalize font-bold">{profile?.tier || 'free'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">EPK URL</span>
              <span className="font-mono text-accent">/{profile?.slug}</span>
            </div>
            {profile?.custom_domain && (
              <div className="flex justify-between">
                <span className="text-text-secondary">Custom Domain</span>
                <span className="font-mono">{profile.custom_domain}</span>
              </div>
            )}
          </div>
        </div>

        {/* Billing - placeholder for Phase 4 */}
        <div className="bg-dark-card border border-white/10 rounded-lg p-6">
          <h2 className="text-sm uppercase tracking-widest font-bold mb-4">Billing</h2>
          <p className="text-text-secondary text-sm">Billing and subscription management coming soon.</p>
        </div>

        {/* Custom Domain - placeholder for Phase 4 */}
        <div className="bg-dark-card border border-white/10 rounded-lg p-6">
          <h2 className="text-sm uppercase tracking-widest font-bold mb-4">Custom Domain</h2>
          <p className="text-text-secondary text-sm">Custom domain configuration available on the Pro plan.</p>
        </div>
      </div>
    </div>
  )
}
```

**Step 2: Verify settings page loads**

**Step 3: Commit**

```bash
git add -A && git commit -m "feat: add settings page with account info and billing placeholder"
```

---

**Phase 3 is complete after these 4 tasks.** At this point you have:
- Theme editor with accent colour, background colour, and font picker
- Live preview iframe in dashboard
- Dynamic theme application on public EPK pages (CSS custom properties)
- Google Fonts loading per profile
- Conditional "Built with DJ EPK" footer on free tier
- Settings page with account overview
