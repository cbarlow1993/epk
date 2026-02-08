# Custom Domain Purchase — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Allow Pro users to search, purchase, and auto-renew domains through Vercel's Registrar API, paid via Stripe.

**Architecture:** New `domain_orders` table tracks purchase lifecycle. Server functions wrap Vercel Registrar API for search/buy/renew. Stripe Checkout handles payment; webhook triggers Vercel purchase. UI is a tab extension of the existing Custom Domain section in Settings.

**Tech Stack:** TanStack Start server functions, Vercel Registrar API v1, Stripe Checkout + Webhooks, Supabase (Postgres + RLS), Zod validation

**Design doc:** `docs/plans/2026-02-04-custom-domain-purchase-design.md`

---

### Task 1: Database Migration — `domain_orders` table

**Files:**
- Create: `supabase/migrations/TIMESTAMP_add_domain_orders.sql`

**Step 1: Create migration file**

```bash
npx supabase migration new add_domain_orders
```

**Step 2: Write migration SQL**

Write the following to the generated migration file:

```sql
create table public.domain_orders (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  domain text not null,
  status text not null default 'pending_payment'
    check (status in ('pending_payment','purchasing','active','renewal_failed','failed','cancelled')),

  vercel_purchase_price numeric(10,2) not null,
  vercel_renewal_price numeric(10,2) not null,
  service_fee numeric(10,2) not null default 5.00,
  years integer not null default 1,

  stripe_checkout_session_id text,
  stripe_subscription_id text,
  vercel_order_id text,
  contact_info jsonb,

  purchased_at timestamptz,
  expires_at timestamptz,
  last_renewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- RLS
alter table public.domain_orders enable row level security;

create policy "Users can view own domain orders"
  on public.domain_orders for select
  using (profile_id = auth.uid());

create policy "Users can insert own domain orders"
  on public.domain_orders for insert
  with check (profile_id = auth.uid());

-- Index for webhook lookups
create index idx_domain_orders_stripe_session
  on public.domain_orders(stripe_checkout_session_id);

create index idx_domain_orders_stripe_subscription
  on public.domain_orders(stripe_subscription_id);

create index idx_domain_orders_profile_status
  on public.domain_orders(profile_id, status);
```

**Step 3: Push migration**

```bash
npx supabase db push
```

**Step 4: Add TypeScript type**

Modify: `src/types/database.ts` — add after `ProfileRow`:

```ts
export interface DomainOrderRow {
  id: string
  profile_id: string
  domain: string
  status: 'pending_payment' | 'purchasing' | 'active' | 'renewal_failed' | 'failed' | 'cancelled'
  vercel_purchase_price: number
  vercel_renewal_price: number
  service_fee: number
  years: number
  stripe_checkout_session_id: string | null
  stripe_subscription_id: string | null
  vercel_order_id: string | null
  contact_info: Record<string, string> | null
  purchased_at: string | null
  expires_at: string | null
  last_renewed_at: string | null
  created_at: string
  updated_at: string
}
```

**Step 5: Commit**

```bash
git add supabase/migrations/ src/types/database.ts
git commit -m "feat: add domain_orders table for domain purchase tracking"
```

---

### Task 2: Zod Schema for Domain Orders

**Files:**
- Create: `src/schemas/domain-order.ts`
- Modify: `src/schemas/index.ts`

**Step 1: Create schema file**

Create `src/schemas/domain-order.ts`:

```ts
import { z } from 'zod'

// Domain format: lowercase letters, numbers, hyphens, dots. e.g. "my-site.com"
const domainRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/

export const domainSearchSchema = z.object({
  domain: z.string().min(1).max(253).regex(domainRegex, 'Invalid domain format'),
})

export const contactInfoSchema = z.object({
  firstName: z.string().min(1, 'Required'),
  lastName: z.string().min(1, 'Required'),
  email: z.string().email(),
  phone: z.string().min(1, 'Required'),
  address1: z.string().min(1, 'Required'),
  address2: z.string().optional(),
  city: z.string().min(1, 'Required'),
  state: z.string().min(1, 'Required'),
  zip: z.string().min(1, 'Required'),
  country: z.string().length(2, 'Use 2-letter country code'),
})

export const domainPurchaseSchema = z.object({
  domain: z.string().min(1).max(253).regex(domainRegex, 'Invalid domain format'),
  contactInfo: contactInfoSchema,
})

export type DomainSearch = z.infer<typeof domainSearchSchema>
export type ContactInfo = z.infer<typeof contactInfoSchema>
export type DomainPurchase = z.infer<typeof domainPurchaseSchema>
```

**Step 2: Add to barrel export**

Modify `src/schemas/index.ts` — add line:

```ts
export { domainSearchSchema, contactInfoSchema, domainPurchaseSchema, type DomainSearch, type ContactInfo, type DomainPurchase } from './domain-order'
```

**Step 3: Commit**

```bash
git add src/schemas/domain-order.ts src/schemas/index.ts
git commit -m "feat: add Zod schemas for domain search and purchase"
```

---

### Task 3: Server Functions — Search & Pricing

**Files:**
- Modify: `src/server/domains.ts:1-78`

**Step 1: Add helper constants and Vercel API wrapper**

At the top of `src/server/domains.ts`, after the existing constants (line 7), add:

```ts
const VERCEL_API = 'https://api.vercel.com'
const SERVICE_FEE = 5 // flat $5 markup

function vercelHeaders() {
  return { Authorization: `Bearer ${VERCEL_TOKEN}` }
}

function teamQuery() {
  return VERCEL_TEAM_ID ? `?teamId=${VERCEL_TEAM_ID}` : ''
}

// Common TLD suffixes to search when user enters a bare name or single domain
const SEARCH_TLDS = ['.com', '.io', '.dj', '.music', '.live', '.events']
```

**Step 2: Add `searchDomain` server function**

Below the helper constants, add:

```ts
export const searchDomain = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => domainSearchSchema.parse(data))
  .handler(async ({ data }) => {
    await withAuth() // Pro check happens in UI; auth is sufficient here

    // If user entered a bare name (no dot), generate candidates
    const candidates = data.domain.includes('.')
      ? [data.domain]
      : SEARCH_TLDS.map((tld) => `${data.domain}${tld}`)

    const results = await Promise.allSettled(
      candidates.map(async (domain) => {
        const [availRes, priceRes] = await Promise.all([
          fetch(`${VERCEL_API}/v1/registrar/domains/${domain}/availability${teamQuery()}`, {
            headers: vercelHeaders(),
          }),
          fetch(`${VERCEL_API}/v1/registrar/domains/${domain}/price${teamQuery()}`, {
            headers: vercelHeaders(),
          }),
        ])

        if (!availRes.ok || !priceRes.ok) return null

        const avail = await availRes.json()
        const price = await priceRes.json()

        return {
          domain,
          available: avail.available as boolean,
          purchasePrice: Number(price.purchasePrice),
          renewalPrice: Number(price.renewalPrice),
          years: Number(price.years),
        }
      })
    )

    return {
      results: results
        .map((r) => (r.status === 'fulfilled' ? r.value : null))
        .filter((r): r is NonNullable<typeof r> => r !== null),
    }
  })
```

**Step 3: Add the `domainSearchSchema` import**

At the top of `src/server/domains.ts`, add:

```ts
import { domainSearchSchema, domainPurchaseSchema } from '~/schemas/domain-order'
```

**Step 4: Commit**

```bash
git add src/server/domains.ts
git commit -m "feat: add searchDomain server function with Vercel registrar API"
```

---

### Task 4: Server Functions — Purchase Checkout & Order Management

**Files:**
- Modify: `src/server/domains.ts`

**Step 1: Add `createDomainCheckout` server function**

Append to `src/server/domains.ts`:

```ts
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
const BASE_URL = process.env.APP_BASE_URL || 'http://localhost:3000'

export const createDomainCheckout = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => domainPurchaseSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabase, user } = await withAuth()

    // Verify Pro tier
    const { data: profile } = await supabase
      .from('profiles')
      .select('tier, stripe_customer_id')
      .eq('id', user.id)
      .single()
    if (profile?.tier !== 'pro') return { error: 'Pro plan required' }

    // Get current Vercel pricing to lock in expectedPrice
    const priceRes = await fetch(
      `${VERCEL_API}/v1/registrar/domains/${data.domain}/price${teamQuery()}`,
      { headers: vercelHeaders() }
    )
    if (!priceRes.ok) return { error: 'Could not fetch domain pricing' }
    const price = await priceRes.json()

    const vercelPurchasePrice = Number(price.purchasePrice)
    const vercelRenewalPrice = Number(price.renewalPrice)
    const years = Number(price.years)

    // Create domain_orders row
    const { data: order, error: orderErr } = await supabase
      .from('domain_orders')
      .insert({
        profile_id: user.id,
        domain: data.domain,
        status: 'pending_payment',
        vercel_purchase_price: vercelPurchasePrice,
        vercel_renewal_price: vercelRenewalPrice,
        service_fee: SERVICE_FEE,
        years,
        contact_info: data.contactInfo,
      })
      .select('id')
      .single()

    if (orderErr || !order) return { error: 'Failed to create order' }

    // Ensure Stripe customer exists
    let customerId = profile.stripe_customer_id
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id },
      })
      customerId = customer.id
      await supabase.from('profiles').update({ stripe_customer_id: customerId }).eq('id', user.id)
    }

    const registrationTotal = Math.round((vercelPurchasePrice + SERVICE_FEE) * 100) // cents
    const renewalTotal = Math.round((vercelRenewalPrice + SERVICE_FEE) * 100) // cents

    // Create Stripe Checkout with one-time registration + recurring renewal
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: { name: `Domain registration: ${data.domain}` },
            unit_amount: registrationTotal,
          },
          quantity: 1,
        },
        {
          price_data: {
            currency: 'usd',
            product_data: { name: `Domain renewal: ${data.domain}` },
            unit_amount: renewalTotal,
            recurring: { interval: 'year' },
          },
          quantity: 1,
        },
      ],
      success_url: `${BASE_URL}/dashboard/settings?domain_purchased=true`,
      cancel_url: `${BASE_URL}/dashboard/settings`,
      metadata: {
        domain_order_id: order.id,
        type: 'domain_purchase',
      },
      subscription_data: {
        metadata: {
          domain_order_id: order.id,
          type: 'domain_renewal',
          domain: data.domain,
        },
      },
    })

    // Store checkout session ID on order
    await supabase
      .from('domain_orders')
      .update({ stripe_checkout_session_id: session.id })
      .eq('id', order.id)

    return { url: session.url }
  })
```

**Step 2: Add `getDomainOrder` server function**

```ts
export const getDomainOrder = createServerFn({ method: 'GET' }).handler(async () => {
  const { supabase, user } = await withAuth()

  const { data: order } = await supabase
    .from('domain_orders')
    .select('*')
    .eq('profile_id', user.id)
    .in('status', ['pending_payment', 'purchasing', 'active', 'renewal_failed'])
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  return { order: order || null }
})
```

**Step 3: Add `cancelDomainOrder` server function**

```ts
export const cancelDomainOrder = createServerFn({ method: 'POST' }).handler(async () => {
  const { supabase, user } = await withAuth()

  const { data: order } = await supabase
    .from('domain_orders')
    .select('*')
    .eq('profile_id', user.id)
    .eq('status', 'active')
    .single()

  if (!order) return { error: 'No active domain order found' }

  // Cancel Stripe renewal subscription
  if (order.stripe_subscription_id) {
    await stripe.subscriptions.cancel(order.stripe_subscription_id)
  }

  // Remove domain from Vercel project
  const teamParam = VERCEL_TEAM_ID ? `?teamId=${VERCEL_TEAM_ID}` : ''
  await fetch(
    `${VERCEL_API}/v10/projects/${VERCEL_PROJECT_ID}/domains/${order.domain}${teamParam}`,
    { method: 'DELETE', headers: vercelHeaders() }
  )

  // Update order status and clear profile custom_domain
  await supabase
    .from('domain_orders')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', order.id)

  await supabase
    .from('profiles')
    .update({ custom_domain: null })
    .eq('id', user.id)

  return { success: true }
})
```

**Step 4: Commit**

```bash
git add src/server/domains.ts
git commit -m "feat: add domain checkout, order query, and cancellation server functions"
```

---

### Task 5: Webhook — Domain Purchase Fulfillment

**Files:**
- Modify: `server/routes/api/stripe-webhook.ts:29-109`

**Step 1: Add domain purchase handler to `checkout.session.completed`**

In the existing `checkout.session.completed` case block (after line 54, before `break`), add a check for domain orders. Restructure the case to handle both subscription upgrades and domain purchases:

Replace the existing `checkout.session.completed` case (lines 30-55) with:

```ts
    case 'checkout.session.completed': {
      console.log(`[stripe-webhook] Processing ${stripeEvent.type}`)
      const session = stripeEvent.data.object as Stripe.Checkout.Session

      // --- Domain purchase flow ---
      if (session.metadata?.type === 'domain_purchase') {
        const orderId = session.metadata.domain_order_id
        if (!orderId) break

        // Update order to purchasing
        const { data: order, error: fetchErr } = await supabase
          .from('domain_orders')
          .update({ status: 'purchasing', stripe_checkout_session_id: session.id })
          .eq('id', orderId)
          .select('*')
          .single()

        if (fetchErr || !order) {
          console.error('[stripe-webhook] Domain order not found:', orderId)
          break
        }

        const subscriptionId = typeof session.subscription === 'string'
          ? session.subscription
          : (session.subscription as Stripe.Subscription | null)?.id

        try {
          // Buy domain via Vercel Registrar API
          const teamParam = process.env.VERCEL_TEAM_ID ? `&teamId=${process.env.VERCEL_TEAM_ID}` : ''
          const buyRes = await fetch(
            `https://api.vercel.com/v1/registrar/domains/${order.domain}/buy?${teamParam}`,
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${process.env.VERCEL_TOKEN}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                expectedPrice: order.vercel_purchase_price,
                years: order.years,
                autoRenew: false, // We handle renewal via Stripe
                contactInformation: order.contact_info,
              }),
            }
          )

          if (!buyRes.ok) {
            const err = await buyRes.json()
            console.error('[stripe-webhook] Vercel buy failed:', err)

            // Refund the payment
            if (session.payment_intent) {
              const pi = typeof session.payment_intent === 'string'
                ? session.payment_intent
                : session.payment_intent.id
              await stripe.refunds.create({ payment_intent: pi })
            }
            if (subscriptionId) {
              await stripe.subscriptions.cancel(subscriptionId)
            }

            await supabase
              .from('domain_orders')
              .update({ status: 'failed', updated_at: new Date().toISOString() })
              .eq('id', orderId)
            break
          }

          const buyData = await buyRes.json()

          // Add domain to Vercel project
          const projectParam = process.env.VERCEL_TEAM_ID
            ? `&teamId=${process.env.VERCEL_TEAM_ID}`
            : ''
          await fetch(
            `https://api.vercel.com/v10/projects/${process.env.VERCEL_PROJECT_ID}/domains?${projectParam}`,
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${process.env.VERCEL_TOKEN}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ name: order.domain }),
            }
          )

          // Update order to active
          await supabase
            .from('domain_orders')
            .update({
              status: 'active',
              vercel_order_id: buyData.orderId || null,
              stripe_subscription_id: subscriptionId || null,
              purchased_at: new Date().toISOString(),
              expires_at: new Date(Date.now() + order.years * 365.25 * 24 * 60 * 60 * 1000).toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', orderId)

          // Set custom_domain on profile
          await supabase
            .from('profiles')
            .update({ custom_domain: order.domain })
            .eq('id', order.profile_id)

          console.log(`[stripe-webhook] Domain ${order.domain} purchased and configured`)
        } catch (err) {
          console.error('[stripe-webhook] Domain purchase error:', err)
          await supabase
            .from('domain_orders')
            .update({ status: 'failed', updated_at: new Date().toISOString() })
            .eq('id', orderId)
        }

        break
      }

      // --- Existing Pro subscription upgrade flow ---
      const userId = session.metadata?.supabase_user_id
      if (!userId) break

      const subscriptionId = typeof session.subscription === 'string'
        ? session.subscription
        : session.subscription?.id
      if (!subscriptionId) break

      const { error } = await supabase
        .from('profiles')
        .update({
          tier: 'pro',
          stripe_customer_id: typeof session.customer === 'string' ? session.customer : session.customer?.id,
          stripe_subscription_id: subscriptionId,
        })
        .eq('id', userId)

      if (error) {
        throw createError({ statusCode: 500, message: `Database update failed: ${error.message}` })
      }

      break
    }
```

**Step 2: Add `invoice.paid` handler for renewals**

Add a new case before the closing of the switch statement (before `invoice.payment_failed`):

```ts
    case 'invoice.paid': {
      const invoice = stripeEvent.data.object as Stripe.Invoice
      const subscriptionId = typeof invoice.subscription === 'string'
        ? invoice.subscription
        : (invoice.subscription as Stripe.Subscription | null)?.id

      if (!subscriptionId) break

      // Check if this is a domain renewal subscription
      const { data: order } = await supabase
        .from('domain_orders')
        .select('*')
        .eq('stripe_subscription_id', subscriptionId)
        .eq('status', 'active')
        .single()

      if (!order) break // Not a domain subscription, ignore

      // Skip the first invoice (that's the purchase, already handled)
      if (invoice.billing_reason === 'subscription_create') break

      console.log(`[stripe-webhook] Renewing domain ${order.domain}`)

      try {
        const teamParam = process.env.VERCEL_TEAM_ID ? `&teamId=${process.env.VERCEL_TEAM_ID}` : ''
        const renewRes = await fetch(
          `https://api.vercel.com/v1/registrar/domains/${order.domain}/renew?${teamParam}`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${process.env.VERCEL_TOKEN}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              years: order.years,
              expectedPrice: order.vercel_renewal_price,
            }),
          }
        )

        if (!renewRes.ok) {
          const err = await renewRes.json()
          console.error('[stripe-webhook] Vercel renew failed:', err)

          // If price mismatch, fetch new price and update order
          if (err.code === 'expected_price_mismatch') {
            const priceRes = await fetch(
              `https://api.vercel.com/v1/registrar/domains/${order.domain}/price?${process.env.VERCEL_TEAM_ID ? `teamId=${process.env.VERCEL_TEAM_ID}` : ''}`,
              { headers: { Authorization: `Bearer ${process.env.VERCEL_TOKEN}` } }
            )
            if (priceRes.ok) {
              const newPrice = await priceRes.json()
              await supabase
                .from('domain_orders')
                .update({
                  vercel_renewal_price: Number(newPrice.renewalPrice),
                  updated_at: new Date().toISOString(),
                })
                .eq('id', order.id)
            }
          }

          await supabase
            .from('domain_orders')
            .update({ status: 'renewal_failed', updated_at: new Date().toISOString() })
            .eq('id', order.id)
          break
        }

        const renewData = await renewRes.json()
        await supabase
          .from('domain_orders')
          .update({
            last_renewed_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + order.years * 365.25 * 24 * 60 * 60 * 1000).toISOString(),
            vercel_order_id: renewData.orderId || order.vercel_order_id,
            updated_at: new Date().toISOString(),
          })
          .eq('id', order.id)

        console.log(`[stripe-webhook] Domain ${order.domain} renewed`)
      } catch (err) {
        console.error('[stripe-webhook] Domain renewal error:', err)
        await supabase
          .from('domain_orders')
          .update({ status: 'renewal_failed', updated_at: new Date().toISOString() })
          .eq('id', order.id)
      }

      break
    }
```

**Step 3: Commit**

```bash
git add server/routes/api/stripe-webhook.ts
git commit -m "feat: handle domain purchase fulfillment and renewal in Stripe webhook"
```

---

### Task 6: UI — Tab Switcher & Search Flow

**Files:**
- Modify: `src/routes/_dashboard/dashboard.settings.tsx:361-436` (the `CustomDomainSection` component)

**Step 1: Replace the `CustomDomainSection` component**

Replace the existing `CustomDomainSection` function (lines 361-436) with:

```tsx
function CustomDomainSection({ profile }: { profile: ProfileRow | null }) {
  const [tab, setTab] = useState<'byod' | 'buy'>('byod')
  const [domainOrder, setDomainOrder] = useState<DomainOrderRow | null>(null)
  const [loadingOrder, setLoadingOrder] = useState(true)

  useEffect(() => {
    getDomainOrder().then((result) => {
      setDomainOrder(result.order)
      setLoadingOrder(false)
    })
  }, [])

  if (profile?.tier !== 'pro') {
    return (
      <div className={SETTINGS_CARD}>
        <h2 className="font-medium text-text-secondary text-sm mb-4">Custom Domain</h2>
        <p className="text-text-secondary text-sm">Upgrade to Pro to use a custom domain.</p>
      </div>
    )
  }

  // Show active/purchasing domain order status
  if (domainOrder && ['active', 'purchasing', 'renewal_failed', 'failed'].includes(domainOrder.status)) {
    return <DomainOrderStatus order={domainOrder} onRemove={() => setDomainOrder(null)} />
  }

  return (
    <div className={SETTINGS_CARD}>
      <h2 className="font-medium text-text-secondary text-sm mb-4">Custom Domain</h2>

      {/* Tab switcher */}
      <div className="flex gap-4 mb-6 border-b border-border">
        <button
          type="button"
          onClick={() => setTab('byod')}
          className={`pb-2 text-sm font-medium transition-colors ${
            tab === 'byod'
              ? 'text-text-primary border-b-2 border-accent'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          Use your own
        </button>
        <button
          type="button"
          onClick={() => setTab('buy')}
          className={`pb-2 text-sm font-medium transition-colors ${
            tab === 'buy'
              ? 'text-text-primary border-b-2 border-accent'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          Buy a domain
        </button>
      </div>

      {tab === 'byod' ? (
        <BYODFlow profile={profile} />
      ) : (
        <DomainSearchFlow onOrderCreated={setDomainOrder} />
      )}
    </div>
  )
}
```

**Step 2: Add imports at top of file**

Add these imports to the top of `dashboard.settings.tsx`:

```ts
import { useEffect } from 'react'
import { searchDomain, getDomainOrder, createDomainCheckout, cancelDomainOrder } from '~/server/domains'
import type { DomainOrderRow } from '~/types/database'
```

Remove the existing individual imports of `addCustomDomain`, `removeCustomDomain`, `checkDomainStatus` and replace with a single import line that includes all needed functions.

**Step 3: Commit**

```bash
git add src/routes/_dashboard/dashboard.settings.tsx
git commit -m "feat: add tab switcher to Custom Domain section"
```

---

### Task 7: UI — BYOD Flow (Extracted Component)

**Files:**
- Modify: `src/routes/_dashboard/dashboard.settings.tsx`

**Step 1: Add `BYODFlow` component**

This extracts the existing BYOD logic into its own component. Add below `CustomDomainSection`:

```tsx
function BYODFlow({ profile }: { profile: ProfileRow | null }) {
  const [domain, setDomain] = useState(profile?.custom_domain || '')
  const [status, setStatus] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleAdd = async () => {
    setLoading(true)
    const result = await addCustomDomain({ data: { domain } })
    setLoading(false)
    if ('error' in result) {
      setStatus(result.error as string)
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

  if (profile?.custom_domain) {
    return (
      <div className="space-y-3">
        <p className="text-sm">Current domain: <span className="font-mono text-accent">{profile.custom_domain}</span></p>
        <div className="flex gap-2">
          <button type="button" onClick={handleCheck} className="text-xs text-text-secondary hover:text-text-primary transition-colors">Check status</button>
          <button type="button" onClick={handleRemove} disabled={loading} className="text-xs text-red-500 hover:text-red-600 transition-colors">Remove</button>
        </div>
        {status && <p className="text-xs text-text-secondary mt-3">{status}</p>}
        <div className="mt-4 text-xs text-text-secondary">
          <p className="font-bold mb-1">DNS Configuration:</p>
          <p>Add a CNAME record pointing your domain to <code className="text-accent">cname.vercel-dns.com</code></p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <input
        type="text"
        value={domain}
        onChange={(e) => setDomain(e.target.value)}
        placeholder="yourdomain.com"
        className={FORM_INPUT}
      />
      <button
        type="button"
        onClick={handleAdd}
        disabled={!domain || loading}
        className={BTN_PRIMARY}
      >
        {loading ? 'Adding...' : 'Add Domain'}
      </button>
      {status && <p className="text-xs text-text-secondary mt-3">{status}</p>}
      <div className="mt-4 text-xs text-text-secondary">
        <p className="font-bold mb-1">DNS Configuration:</p>
        <p>Add a CNAME record pointing your domain to <code className="text-accent">cname.vercel-dns.com</code></p>
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/routes/_dashboard/dashboard.settings.tsx
git commit -m "refactor: extract BYOD flow into separate component"
```

---

### Task 8: UI — Domain Search Flow

**Files:**
- Modify: `src/routes/_dashboard/dashboard.settings.tsx`

**Step 1: Add `DomainSearchFlow` component**

```tsx
type SearchResult = {
  domain: string
  available: boolean
  purchasePrice: number
  renewalPrice: number
  years: number
}

function DomainSearchFlow({ onOrderCreated }: { onOrderCreated: (order: DomainOrderRow) => void }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState('')
  const [selectedDomain, setSelectedDomain] = useState<SearchResult | null>(null)

  const SERVICE_FEE = 5

  const handleSearch = async () => {
    if (!query.trim()) return
    setSearching(true)
    setError('')
    setResults([])
    setSelectedDomain(null)

    const result = await searchDomain({ data: { domain: query.trim().toLowerCase() } })
    setSearching(false)

    if ('error' in result) {
      setError(result.error as string)
    } else {
      setResults(result.results)
      if (result.results.length === 0) {
        setError('No results found. Try a different name.')
      }
    }
  }

  if (selectedDomain) {
    return (
      <ContactInfoForm
        domain={selectedDomain}
        serviceFee={SERVICE_FEE}
        onBack={() => setSelectedDomain(null)}
        onOrderCreated={onOrderCreated}
      />
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="Search for a domain..."
          className={FORM_INPUT + ' flex-1'}
        />
        <button
          type="button"
          onClick={handleSearch}
          disabled={searching || !query.trim()}
          className={BTN_PRIMARY}
        >
          {searching ? 'Searching...' : 'Search'}
        </button>
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      {results.length > 0 && (
        <div className="border border-border divide-y divide-border">
          {results.map((r) => (
            <div key={r.domain} className="flex items-center justify-between px-4 py-3">
              <div>
                <span className="font-mono text-sm">{r.domain}</span>
                {!r.available && (
                  <span className="ml-2 text-xs text-text-secondary">Unavailable</span>
                )}
              </div>
              {r.available && (
                <div className="flex items-center gap-4">
                  <div className="text-right text-xs text-text-secondary">
                    <div>${(r.purchasePrice + SERVICE_FEE).toFixed(2)} first year</div>
                    {r.renewalPrice !== r.purchasePrice && (
                      <div>${(r.renewalPrice + SERVICE_FEE).toFixed(2)}/yr renewal</div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedDomain(r)}
                    className={BTN_PRIMARY + ' text-xs py-1.5 px-4'}
                  >
                    Buy
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-text-secondary">
        Prices include a ${SERVICE_FEE} service fee. Domains auto-renew annually.
      </p>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/routes/_dashboard/dashboard.settings.tsx
git commit -m "feat: add domain search flow with pricing display"
```

---

### Task 9: UI — Contact Info Form & Checkout Redirect

**Files:**
- Modify: `src/routes/_dashboard/dashboard.settings.tsx`

**Step 1: Add `ContactInfoForm` component**

```tsx
import { contactInfoSchema } from '~/schemas/domain-order'

function ContactInfoForm({
  domain,
  serviceFee,
  onBack,
  onOrderCreated,
}: {
  domain: SearchResult
  serviceFee: number
  onBack: () => void
  onOrderCreated: (order: DomainOrderRow) => void
}) {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address1: '',
    address2: '',
    city: '',
    state: '',
    zip: '',
    country: 'US',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => ({ ...prev, [field]: '' }))
  }

  const handleSubmit = async () => {
    // Validate contact info
    const parsed = contactInfoSchema.safeParse(form)
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {}
      parsed.error.issues.forEach((issue) => {
        const field = issue.path[0] as string
        fieldErrors[field] = issue.message
      })
      setErrors(fieldErrors)
      return
    }

    setSubmitting(true)
    setSubmitError('')

    const result = await createDomainCheckout({
      data: {
        domain: domain.domain,
        contactInfo: parsed.data,
      },
    })

    if ('error' in result) {
      setSubmitError(result.error as string)
      setSubmitting(false)
    } else if ('url' in result && typeof result.url === 'string') {
      window.location.href = result.url
    }
  }

  const fields: { key: string; label: string; placeholder: string; half?: boolean }[] = [
    { key: 'firstName', label: 'First Name', placeholder: 'John', half: true },
    { key: 'lastName', label: 'Last Name', placeholder: 'Doe', half: true },
    { key: 'email', label: 'Email', placeholder: 'you@example.com' },
    { key: 'phone', label: 'Phone', placeholder: '+1 555 123 4567' },
    { key: 'address1', label: 'Address', placeholder: '123 Main St' },
    { key: 'address2', label: 'Address 2', placeholder: 'Apt 4B' },
    { key: 'city', label: 'City', placeholder: 'New York', half: true },
    { key: 'state', label: 'State', placeholder: 'NY', half: true },
    { key: 'zip', label: 'ZIP Code', placeholder: '10001', half: true },
    { key: 'country', label: 'Country Code', placeholder: 'US', half: true },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="text-sm font-medium">Register <span className="font-mono text-accent">{domain.domain}</span></p>
          <p className="text-xs text-text-secondary">${(domain.purchasePrice + serviceFee).toFixed(2)} first year, then ${(domain.renewalPrice + serviceFee).toFixed(2)}/yr</p>
        </div>
        <button type="button" onClick={onBack} className="text-xs text-text-secondary hover:text-text-primary">
          Back to search
        </button>
      </div>

      <p className="text-xs text-text-secondary font-bold uppercase tracking-wider">Registrant Information</p>

      <div className="grid grid-cols-2 gap-3">
        {fields.map((f) => (
          <div key={f.key} className={f.half ? '' : 'col-span-2'}>
            <label className="text-xs text-text-secondary block mb-1">{f.label}</label>
            <input
              type="text"
              value={form[f.key as keyof typeof form]}
              onChange={(e) => updateField(f.key, e.target.value)}
              placeholder={f.placeholder}
              className={errors[f.key] ? FORM_INPUT_ERROR : FORM_INPUT}
            />
            {errors[f.key] && <p className="text-xs text-red-500 mt-1">{errors[f.key]}</p>}
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={submitting}
        className={BTN_PRIMARY + ' w-full'}
      >
        {submitting ? 'Redirecting to payment...' : `Pay $${(domain.purchasePrice + serviceFee).toFixed(2)} and register`}
      </button>

      {submitError && <p className="text-xs text-red-500">{submitError}</p>}
    </div>
  )
}
```

**Step 2: Add `FORM_INPUT_ERROR` to the imports from `~/components/forms`**

Update the import at the top of the file to include `FORM_INPUT_ERROR`:

```ts
import { SETTINGS_CARD, FORM_LABEL, FORM_INPUT, FORM_INPUT_ERROR, BTN_PRIMARY } from '~/components/forms'
```

**Step 3: Commit**

```bash
git add src/routes/_dashboard/dashboard.settings.tsx
git commit -m "feat: add contact info form and Stripe checkout redirect for domain purchase"
```

---

### Task 10: UI — Domain Order Status Display

**Files:**
- Modify: `src/routes/_dashboard/dashboard.settings.tsx`

**Step 1: Add `DomainOrderStatus` component**

```tsx
function DomainOrderStatus({ order, onRemove }: { order: DomainOrderRow; onRemove: () => void }) {
  const [removing, setRemoving] = useState(false)
  const [error, setError] = useState('')

  const handleRemove = async () => {
    if (!confirm('Remove this domain? Your renewal subscription will be cancelled.')) return
    setRemoving(true)
    const result = await cancelDomainOrder()
    setRemoving(false)
    if ('error' in result) {
      setError(result.error as string)
    } else {
      onRemove()
    }
  }

  return (
    <div className={SETTINGS_CARD}>
      <h2 className="font-medium text-text-secondary text-sm mb-4">Custom Domain</h2>

      {order.status === 'purchasing' && (
        <div className="flex items-center gap-2 text-sm text-text-secondary">
          <span className="animate-spin inline-block w-4 h-4 border-2 border-accent border-t-transparent rounded-full" />
          Setting up {order.domain}...
        </div>
      )}

      {order.status === 'active' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm text-accent">{order.domain}</span>
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 font-medium uppercase tracking-wider">Active</span>
          </div>
          {order.expires_at && (
            <p className="text-xs text-text-secondary">
              Expires {new Date(order.expires_at).toLocaleDateString()} (auto-renews)
            </p>
          )}
          <button
            type="button"
            onClick={handleRemove}
            disabled={removing}
            className="text-xs text-red-500 hover:text-red-600 transition-colors"
          >
            {removing ? 'Removing...' : 'Remove domain'}
          </button>
        </div>
      )}

      {order.status === 'renewal_failed' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm">{order.domain}</span>
            <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 font-medium uppercase tracking-wider">Renewal Issue</span>
          </div>
          <p className="text-xs text-yellow-600">
            Domain renewal failed. We'll retry automatically. Your domain remains active until {order.expires_at ? new Date(order.expires_at).toLocaleDateString() : 'expiry'}.
          </p>
          <button
            type="button"
            onClick={handleRemove}
            disabled={removing}
            className="text-xs text-red-500 hover:text-red-600 transition-colors"
          >
            {removing ? 'Removing...' : 'Remove domain'}
          </button>
        </div>
      )}

      {order.status === 'failed' && (
        <div className="space-y-3">
          <p className="text-xs text-red-500">
            Domain purchase for <span className="font-mono">{order.domain}</span> failed. Your payment has been refunded.
          </p>
          <button
            type="button"
            onClick={onRemove}
            className="text-xs text-text-secondary hover:text-text-primary transition-colors"
          >
            Dismiss
          </button>
        </div>
      )}

      {error && <p className="text-xs text-red-500 mt-3">{error}</p>}
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/routes/_dashboard/dashboard.settings.tsx
git commit -m "feat: add domain order status display with active, failed, and renewal states"
```

---

### Task 11: Loader Update & Final Integration

**Files:**
- Modify: `src/routes/_dashboard/dashboard.settings.tsx:9-14` (Route loader)

**Step 1: Update the route loader to fetch domain order**

Replace the existing loader (lines 9-14):

```ts
  loader: async () => {
    const [profile, emailResult, domainResult] = await Promise.all([
      getProfile(),
      getUserEmail(),
      getDomainOrder(),
    ])
    return { profile, userEmail: emailResult.email, domainOrder: domainResult.order }
  },
```

**Step 2: Update `SettingsPage` to pass initial domain order**

In the `SettingsPage` component, destructure the new loader data:

```ts
const { profile, userEmail, domainOrder } = Route.useLoaderData()
```

Pass `domainOrder` to the `CustomDomainSection`:

```tsx
<CustomDomainSection profile={profile} initialOrder={domainOrder} />
```

**Step 3: Update `CustomDomainSection` to accept `initialOrder` prop**

Change the function signature:

```ts
function CustomDomainSection({ profile, initialOrder }: { profile: ProfileRow | null; initialOrder: DomainOrderRow | null }) {
  const [tab, setTab] = useState<'byod' | 'buy'>('byod')
  const [domainOrder, setDomainOrder] = useState<DomainOrderRow | null>(initialOrder)
```

Remove the `useEffect` that fetches `getDomainOrder()` and the `loadingOrder` state — data comes from the loader now.

**Step 4: Verify build**

```bash
npm run build
```

Expected: Build succeeds with no type errors.

**Step 5: Commit**

```bash
git add src/routes/_dashboard/dashboard.settings.tsx
git commit -m "feat: load domain order in route loader, remove client-side fetch"
```

---

### Task 12: Manual Testing Checklist

**No code changes — verification only.**

**Step 1: Start dev server**

```bash
npm run dev
```

**Step 2: Test BYOD flow (regression)**

1. Log in as a Pro user
2. Go to Settings → Custom Domain → "Use your own" tab
3. Verify existing BYOD flow works: enter domain, add, check status, remove

**Step 3: Test domain search**

1. Switch to "Buy a domain" tab
2. Search for a bare name (e.g. `testdomain`) — should show multiple TLD results
3. Search for a full domain (e.g. `example.com`) — should show one result
4. Verify prices include the $5 service fee
5. Verify unavailable domains show "Unavailable" without a Buy button

**Step 4: Test purchase flow (Stripe test mode)**

1. Click "Buy" on an available domain
2. Fill in contact info — verify validation (submit with empty fields)
3. Submit → should redirect to Stripe Checkout
4. Complete checkout with Stripe test card (`4242 4242 4242 4242`)
5. Return to Settings → should show domain with "Active" badge

**Step 5: Test cancellation**

1. With an active purchased domain, click "Remove domain"
2. Confirm the dialog
3. Verify domain is removed and section returns to search/BYOD tabs

---

Plan complete and saved to `docs/plans/2026-02-04-custom-domain-purchase-plan.md`. Two execution options:

**1. Subagent-Driven (this session)** — I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** — Open a new session with executing-plans, batch execution with checkpoints

Which approach?