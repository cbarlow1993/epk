# Phase 4: Stripe Billing, Custom Domains & Landing Page — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add Stripe subscription billing (free → pro upgrade), custom domain support via Vercel API, and a polished marketing landing page.

**Architecture:** Stripe Checkout for upgrades, Stripe webhooks to update the `tier` field in Supabase. Custom domains are added via Vercel's domain API, with middleware to resolve custom domains to profiles. The landing page is a static marketing page with pricing table, feature list, and example EPKs.

**Tech Stack:** Stripe (Checkout + Webhooks), Vercel Domains API, Supabase, TanStack Start

---

### Task 1: Install Stripe & Environment Setup

**Files:**
- Modify: `package.json`
- Modify: `.env` / `.env.example`

**Step 1: Install Stripe**

```bash
cd /Users/chrisbarlow/Documents/issy/epk
npm install stripe
```

**Step 2: Add Stripe env vars to `.env.example`**

```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRO_PRICE_ID=price_...
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

**Step 3: Add real values to `.env`**

The user needs to:
1. Create a Stripe account
2. Create a product "Pro Plan" with a recurring monthly price
3. Copy the price ID, secret key, publishable key
4. Set up a webhook endpoint (will configure in Task 3)

**Step 4: Commit**

```bash
git add -A && git commit -m "feat: add Stripe dependency and environment variables"
```

---

### Task 2: Stripe Checkout Server Functions

**Files:**
- Create: `src/server/billing.ts`

**Step 1: Create `src/server/billing.ts`**

```ts
import { createServerFn } from '@tanstack/react-start'
import { getSupabaseServerClient } from '~/utils/supabase'
import { getWebRequest } from '@tanstack/react-start/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-12-18.acacia' })

export const createCheckoutSession = createServerFn({ method: 'POST' }).handler(async () => {
  const request = getWebRequest()
  const { supabase } = getSupabaseServerClient(request)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase.from('profiles').select('stripe_customer_id, slug').eq('id', user.id).single()

  let customerId = profile?.stripe_customer_id

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { supabase_user_id: user.id },
    })
    customerId = customer.id
    await supabase.from('profiles').update({ stripe_customer_id: customerId }).eq('id', user.id)
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: process.env.STRIPE_PRO_PRICE_ID!, quantity: 1 }],
    success_url: `${request.headers.get('origin')}/dashboard/settings?upgraded=true`,
    cancel_url: `${request.headers.get('origin')}/dashboard/settings`,
    metadata: { supabase_user_id: user.id },
  })

  return { url: session.url }
})

export const createPortalSession = createServerFn({ method: 'POST' }).handler(async () => {
  const request = getWebRequest()
  const { supabase } = getSupabaseServerClient(request)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase.from('profiles').select('stripe_customer_id').eq('id', user.id).single()
  if (!profile?.stripe_customer_id) return { error: 'No billing account' }

  const session = await stripe.billingPortal.sessions.create({
    customer: profile.stripe_customer_id,
    return_url: `${request.headers.get('origin')}/dashboard/settings`,
  })

  return { url: session.url }
})
```

**Step 2: Commit**

```bash
git add -A && git commit -m "feat: add Stripe checkout and customer portal server functions"
```

---

### Task 3: Stripe Webhook Handler

**Files:**
- Create: `src/routes/api/stripe-webhook.ts`

**Step 1: Create webhook route**

This API route handles Stripe webhook events to update the user's tier.

```ts
import { createAPIFileRoute } from '@tanstack/react-start/api'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-12-18.acacia' })

// Use admin client (no cookies needed for webhooks)
const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!,
)

export const APIRoute = createAPIFileRoute('/api/stripe-webhook')({
  POST: async ({ request }) => {
    const body = await request.text()
    const sig = request.headers.get('stripe-signature')!

    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
    } catch (err) {
      return new Response('Webhook signature verification failed', { status: 400 })
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.metadata?.supabase_user_id
        if (userId) {
          await supabase.from('profiles').update({ tier: 'pro', stripe_customer_id: session.customer as string }).eq('id', userId)
        }
        break
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string
        await supabase.from('profiles').update({ tier: 'free' }).eq('stripe_customer_id', customerId)
        break
      }
    }

    return new Response('ok', { status: 200 })
  },
})
```

**Step 2: Configure Stripe webhook in dashboard**

The user needs to:
1. Go to Stripe Dashboard > Developers > Webhooks
2. Add endpoint: `https://yourdomain.com/api/stripe-webhook`
3. Listen for events: `checkout.session.completed`, `customer.subscription.deleted`
4. Copy the webhook signing secret to `.env`

**Step 3: Commit**

```bash
git add -A && git commit -m "feat: add Stripe webhook handler for subscription lifecycle"
```

---

### Task 4: Update Settings Page with Billing

**Files:**
- Modify: `src/routes/_dashboard/dashboard.settings.tsx`

**Step 1: Add billing actions to settings page**

Replace the billing placeholder with actual upgrade/manage buttons:

```tsx
import { createCheckoutSession, createPortalSession } from '~/server/billing'

// Inside the Billing section:
<div className="bg-dark-card border border-white/10 rounded-lg p-6">
  <h2 className="text-sm uppercase tracking-widest font-bold mb-4">Billing</h2>
  {profile?.tier === 'pro' ? (
    <div>
      <p className="text-sm text-text-secondary mb-4">You're on the <span className="text-accent font-bold">Pro</span> plan.</p>
      <button
        onClick={async () => {
          const result = await createPortalSession()
          if ('url' in result && result.url) window.location.href = result.url
        }}
        className="bg-white/10 hover:bg-white/20 text-white text-sm font-bold uppercase tracking-widest px-6 py-2 rounded-lg transition-colors"
      >
        Manage Subscription
      </button>
    </div>
  ) : (
    <div>
      <p className="text-sm text-text-secondary mb-4">You're on the <span className="font-bold">Free</span> plan. Upgrade for custom domains, remove branding, and more.</p>
      <button
        onClick={async () => {
          const result = await createCheckoutSession()
          if ('url' in result && result.url) window.location.href = result.url
        }}
        className="bg-accent hover:bg-accent/80 text-white text-sm font-bold uppercase tracking-widest px-6 py-2 rounded-lg transition-colors"
      >
        Upgrade to Pro
      </button>
    </div>
  )}
</div>
```

**Step 2: Verify upgrade flow works (use Stripe test mode)**

**Step 3: Commit**

```bash
git add -A && git commit -m "feat: add upgrade and subscription management to settings page"
```

---

### Task 5: Custom Domain Server Functions

**Files:**
- Create: `src/server/domains.ts`

**Step 1: Create `src/server/domains.ts`**

Server functions to add/remove custom domains via the Vercel API.

```ts
import { createServerFn } from '@tanstack/react-start'
import { getSupabaseServerClient } from '~/utils/supabase'
import { getWebRequest } from '@tanstack/react-start/server'

const VERCEL_TOKEN = process.env.VERCEL_TOKEN
const VERCEL_PROJECT_ID = process.env.VERCEL_PROJECT_ID
const VERCEL_TEAM_ID = process.env.VERCEL_TEAM_ID

export const addCustomDomain = createServerFn({ method: 'POST' })
  .validator((data: { domain: string }) => data)
  .handler(async ({ data }) => {
    const request = getWebRequest()
    const { supabase } = getSupabaseServerClient(request)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    const { data: profile } = await supabase.from('profiles').select('tier').eq('id', user.id).single()
    if (profile?.tier !== 'pro') return { error: 'Pro plan required for custom domains' }

    // Add domain to Vercel
    const teamParam = VERCEL_TEAM_ID ? `&teamId=${VERCEL_TEAM_ID}` : ''
    const res = await fetch(`https://api.vercel.com/v10/projects/${VERCEL_PROJECT_ID}/domains?${teamParam}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${VERCEL_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: data.domain }),
    })

    if (!res.ok) {
      const err = await res.json()
      return { error: err.error?.message || 'Failed to add domain' }
    }

    // Save to profile
    await supabase.from('profiles').update({ custom_domain: data.domain }).eq('id', user.id)

    return { success: true, domain: data.domain }
  })

export const removeCustomDomain = createServerFn({ method: 'POST' }).handler(async () => {
  const request = getWebRequest()
  const { supabase } = getSupabaseServerClient(request)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase.from('profiles').select('custom_domain').eq('id', user.id).single()
  if (!profile?.custom_domain) return { error: 'No custom domain configured' }

  // Remove from Vercel
  const teamParam = VERCEL_TEAM_ID ? `?teamId=${VERCEL_TEAM_ID}` : ''
  await fetch(`https://api.vercel.com/v10/projects/${VERCEL_PROJECT_ID}/domains/${profile.custom_domain}${teamParam}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${VERCEL_TOKEN}` },
  })

  await supabase.from('profiles').update({ custom_domain: null }).eq('id', user.id)
  return { success: true }
})

export const checkDomainStatus = createServerFn({ method: 'POST' })
  .validator((data: { domain: string }) => data)
  .handler(async ({ data }) => {
    const teamParam = VERCEL_TEAM_ID ? `?teamId=${VERCEL_TEAM_ID}` : ''
    const res = await fetch(`https://api.vercel.com/v10/projects/${VERCEL_PROJECT_ID}/domains/${data.domain}${teamParam}`, {
      headers: { Authorization: `Bearer ${VERCEL_TOKEN}` },
    })

    if (!res.ok) return { configured: false }
    const domainData = await res.json()
    return { configured: domainData.verified || false }
  })
```

**Step 2: Add Vercel env vars to `.env.example`**

```
VERCEL_TOKEN=...
VERCEL_PROJECT_ID=...
VERCEL_TEAM_ID=... (optional)
```

**Step 3: Commit**

```bash
git add -A && git commit -m "feat: add custom domain management via Vercel API"
```

---

### Task 6: Custom Domain UI in Settings

**Files:**
- Modify: `src/routes/_dashboard/dashboard.settings.tsx`

**Step 1: Replace domain placeholder with working UI**

```tsx
import { addCustomDomain, removeCustomDomain, checkDomainStatus } from '~/server/domains'
import { useState } from 'react'

// Inside SettingsPage, replace the Custom Domain section:
function CustomDomainSection({ profile }: { profile: any }) {
  const [domain, setDomain] = useState(profile?.custom_domain || '')
  const [status, setStatus] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleAdd = async () => {
    setLoading(true)
    const result = await addCustomDomain({ data: { domain } })
    setLoading(false)
    if ('error' in result) {
      setStatus(result.error)
    } else {
      setStatus('Domain added. Configure your DNS: CNAME → cname.vercel-dns.com')
    }
  }

  const handleRemove = async () => {
    setLoading(true)
    await removeCustomDomain()
    setLoading(false)
    setDomain('')
    setStatus('Domain removed.')
  }

  const handleCheck = async () => {
    const result = await checkDomainStatus({ data: { domain } })
    setStatus(result.configured ? 'Domain is verified and active.' : 'Domain not yet verified. Check your DNS settings.')
  }

  if (profile?.tier !== 'pro') {
    return (
      <div className="bg-dark-card border border-white/10 rounded-lg p-6">
        <h2 className="text-sm uppercase tracking-widest font-bold mb-4">Custom Domain</h2>
        <p className="text-text-secondary text-sm">Upgrade to Pro to use a custom domain.</p>
      </div>
    )
  }

  return (
    <div className="bg-dark-card border border-white/10 rounded-lg p-6">
      <h2 className="text-sm uppercase tracking-widest font-bold mb-4">Custom Domain</h2>
      {profile?.custom_domain ? (
        <div className="space-y-3">
          <p className="text-sm">Current domain: <span className="font-mono text-accent">{profile.custom_domain}</span></p>
          <div className="flex gap-2">
            <button onClick={handleCheck} className="text-xs text-text-secondary hover:text-white transition-colors">Check status</button>
            <button onClick={handleRemove} disabled={loading} className="text-xs text-red-400 hover:text-red-300 transition-colors">Remove</button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <input
            type="text"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="yourdomain.com"
            className="w-full bg-dark-bg border border-white/10 rounded-lg px-4 py-2 text-white text-sm focus:border-accent focus:outline-none"
          />
          <button
            onClick={handleAdd}
            disabled={!domain || loading}
            className="bg-accent hover:bg-accent/80 disabled:opacity-30 text-white text-sm font-bold uppercase tracking-widest px-6 py-2 rounded-lg transition-colors"
          >
            {loading ? 'Adding...' : 'Add Domain'}
          </button>
        </div>
      )}
      {status && <p className="text-xs text-text-secondary mt-3">{status}</p>}
      <div className="mt-4 text-xs text-text-secondary">
        <p className="font-bold mb-1">DNS Configuration:</p>
        <p>Add a CNAME record pointing your domain to <code className="text-accent">cname.vercel-dns.com</code></p>
      </div>
    </div>
  )
}
```

**Step 2: Use `<CustomDomainSection profile={profile} />` in the settings page JSX**

**Step 3: Verify domain add/check/remove works**

**Step 4: Commit**

```bash
git add -A && git commit -m "feat: add custom domain UI to settings page"
```

---

### Task 7: Custom Domain Middleware

**Files:**
- Create: `src/middleware.ts` (or modify existing Nitro/Vercel middleware)

**Step 1: Add hostname-based routing**

For custom domains, we need middleware that checks the incoming hostname against the `custom_domain` column in profiles, then internally rewrites to the `/$slug` route.

Create `src/middleware.ts`:

```ts
import { createMiddleware } from '@tanstack/react-start'
import { createClient } from '@supabase/supabase-js'

const MAIN_DOMAINS = [
  'localhost',
  'localhost:3000',
  // Add your production domain here
]

export default createMiddleware({
  middleware: async ({ request, next }) => {
    const url = new URL(request.url)
    const hostname = url.hostname

    // Skip middleware for main domain and known paths
    if (MAIN_DOMAINS.some((d) => hostname.includes(d))) {
      return next()
    }

    // Check if this is a custom domain
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL!,
      process.env.VITE_SUPABASE_ANON_KEY!,
    )

    const { data: profile } = await supabase
      .from('profiles')
      .select('slug')
      .eq('custom_domain', hostname)
      .eq('published', true)
      .single()

    if (profile) {
      // Rewrite to the slug route
      url.pathname = `/${profile.slug}${url.pathname === '/' ? '' : url.pathname}`
      return next({ request: new Request(url, request) })
    }

    return next()
  },
})
```

**Note:** The exact middleware setup depends on the TanStack Start + Nitro configuration. This may need adjustment based on the Nitro preset being used. The implementer should verify the middleware approach works with the current server setup and adjust accordingly.

**Step 2: Verify custom domain routing works locally** (modify /etc/hosts for testing)

**Step 3: Commit**

```bash
git add -A && git commit -m "feat: add custom domain middleware for hostname-based routing"
```

---

### Task 8: Marketing Landing Page

**Files:**
- Modify: `src/routes/index.tsx`

**Step 1: Replace the minimal landing page with a polished marketing page**

```tsx
import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: LandingPage,
  head: () => ({
    meta: [
      { title: 'DJ EPK - Professional Electronic Press Kits for DJs & Artists' },
      { name: 'description', content: 'Create a professional DJ press kit in minutes. Bio, mixes, events, technical rider, booking info — all in one beautiful page.' },
      { name: 'og:title', content: 'DJ EPK - Professional Electronic Press Kits' },
      { name: 'og:type', content: 'website' },
    ],
  }),
})

const FEATURES = [
  { title: 'Bio & Profile', desc: 'Two-column bio, profile photo, hero image, tagline, genres.' },
  { title: 'Music & Mixes', desc: 'Showcase your sets with SoundCloud/Mixcloud links, categorised by genre.' },
  { title: 'Events & Brands', desc: 'Display event flyers and brand logos in a visual grid.' },
  { title: 'Technical Rider', desc: 'Share your preferred and alternative DJ setup requirements.' },
  { title: 'Press Assets', desc: 'Upload photos, videos, and logos for promoters to download.' },
  { title: 'Booking Contact', desc: 'Manager name, email, phone — easy for promoters to reach you.' },
  { title: 'Social Links', desc: 'Connect all your social profiles in one place.' },
  { title: 'Custom Themes', desc: 'Pick your colours, font, and make it match your brand.' },
]

const PRICING = [
  {
    name: 'Free',
    price: '£0',
    period: 'forever',
    features: ['Full EPK page', 'All content sections', 'yourname.djepk.com URL', 'Social links', 'Platform branding in footer'],
    cta: 'Get Started Free',
    highlight: false,
  },
  {
    name: 'Pro',
    price: '£9',
    period: '/month',
    features: ['Everything in Free', 'Custom domain', 'Remove platform branding', 'Priority support', 'Full theme customisation'],
    cta: 'Upgrade to Pro',
    highlight: true,
  },
]

function LandingPage() {
  return (
    <div className="min-h-screen bg-dark-bg">
      {/* Nav */}
      <nav className="max-w-6xl mx-auto px-4 py-6 flex items-center justify-between">
        <span className="text-lg font-bold tracking-wider">DJ EPK</span>
        <div className="flex gap-4 items-center">
          <Link to="/login" className="text-sm text-text-secondary hover:text-white transition-colors">Log in</Link>
          <Link to="/signup" className="text-sm bg-accent hover:bg-accent/80 text-white px-4 py-2 rounded-lg transition-colors font-bold">Sign up free</Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-4 py-24 md:py-32 text-center">
        <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-6">
          Your DJ Press Kit,<br />Online.
        </h1>
        <p className="text-xl text-text-secondary mb-12 max-w-2xl mx-auto leading-relaxed">
          Create a professional Electronic Press Kit in minutes. Share your bio, mixes, events, technical rider and booking info — all in one link.
        </p>
        <Link
          to="/signup"
          className="inline-block bg-accent hover:bg-accent/80 text-white font-bold uppercase tracking-widest px-8 py-4 rounded-lg transition-colors text-lg"
        >
          Get Started Free
        </Link>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <div className="w-20 h-1 bg-accent mx-auto mb-8 shadow-[0_0_10px_var(--color-accent-glow)]" />
          <h2 className="text-3xl md:text-4xl font-black uppercase tracking-wider">Everything You Need</h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {FEATURES.map((f) => (
            <div key={f.title} className="bg-dark-card border border-white/5 rounded-lg p-6 hover:border-accent/20 transition-colors">
              <h3 className="font-bold text-sm uppercase tracking-wider mb-2">{f.title}</h3>
              <p className="text-text-secondary text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="max-w-4xl mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <div className="w-20 h-1 bg-accent mx-auto mb-8 shadow-[0_0_10px_var(--color-accent-glow)]" />
          <h2 className="text-3xl md:text-4xl font-black uppercase tracking-wider">Simple Pricing</h2>
        </div>
        <div className="grid md:grid-cols-2 gap-8">
          {PRICING.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-xl p-8 border ${plan.highlight ? 'border-accent bg-accent/5' : 'border-white/10 bg-dark-card'}`}
            >
              <h3 className="text-lg font-bold uppercase tracking-wider mb-2">{plan.name}</h3>
              <div className="mb-6">
                <span className="text-4xl font-black">{plan.price}</span>
                <span className="text-text-secondary text-sm ml-1">{plan.period}</span>
              </div>
              <ul className="space-y-3 mb-8">
                {plan.features.map((f) => (
                  <li key={f} className="text-sm text-text-secondary flex items-start gap-2">
                    <span className="text-accent mt-0.5">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                to="/signup"
                className={`block text-center py-3 rounded-lg font-bold uppercase tracking-widest text-sm transition-colors ${
                  plan.highlight
                    ? 'bg-accent hover:bg-accent/80 text-white'
                    : 'bg-white/10 hover:bg-white/20 text-white'
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-4xl mx-auto px-4 py-20 text-center">
        <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-6">
          Ready to stand out?
        </h2>
        <p className="text-text-secondary text-lg mb-8">Join DJs and artists who are taking their press kit online.</p>
        <Link
          to="/signup"
          className="inline-block bg-accent hover:bg-accent/80 text-white font-bold uppercase tracking-widest px-8 py-4 rounded-lg transition-colors text-lg"
        >
          Create Your EPK
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8">
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-between text-xs text-text-secondary">
          <span>DJ EPK</span>
          <span>© {new Date().getFullYear()}</span>
        </div>
      </footer>
    </div>
  )
}
```

**Step 2: Verify landing page renders correctly**

**Step 3: Commit**

```bash
git add -A && git commit -m "feat: add polished marketing landing page with features and pricing"
```

---

### Task 9: Final Deployment Configuration

**Files:**
- Modify: `vercel.json` (if needed)
- Verify: `.env` variables are set in Vercel dashboard

**Step 1: Set all environment variables in Vercel**

The user needs to add these to the Vercel project settings:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRO_PRICE_ID`
- `VITE_STRIPE_PUBLISHABLE_KEY`
- `VERCEL_TOKEN` (for domain API)
- `VERCEL_PROJECT_ID`
- `VERCEL_TEAM_ID` (optional)

**Step 2: Configure Stripe webhook for production URL**

Update the Stripe webhook endpoint to point to the production URL: `https://yourdomain.com/api/stripe-webhook`

**Step 3: Configure Supabase Auth redirect URLs**

In Supabase Dashboard > Authentication > URL Configuration:
- Site URL: `https://yourdomain.com`
- Redirect URLs: `https://yourdomain.com/**`

**Step 4: Deploy and verify**

```bash
npx vercel --prod
```

**Step 5: Commit any config changes**

```bash
git add -A && git commit -m "chore: finalise deployment configuration"
```

---

**Phase 4 is complete after these 9 tasks.** At this point you have the full platform:
- Stripe subscription billing (free → pro upgrade)
- Stripe customer portal for subscription management
- Stripe webhook for subscription lifecycle events
- Custom domain management via Vercel API
- Custom domain middleware for hostname-based routing
- Polished marketing landing page with features and pricing
- Full deployment configuration for Vercel
