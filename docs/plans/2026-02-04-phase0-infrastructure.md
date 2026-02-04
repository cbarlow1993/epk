# Phase 0: Infrastructure Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Set up foundational infrastructure (Stripe webhooks, transactional email, rate limiting) that all later phases depend on.

**Architecture:** Nitro API route for Stripe webhook (raw body access for signature verification), Resend SDK for transactional email, in-memory rate limiting middleware for public endpoints.

**Tech Stack:** Stripe (existing), Resend (new), Nitro server routes, TanStack Start server functions

---

## Task 1: Add stripe_subscription_id Column

**Files:**
- Modify: `supabase/schema.sql`
- Modify: `src/types/database.ts:7-26`

**Step 1: Update schema.sql**

Add after line 22 (after `updated_at` column in profiles):

```sql
-- Migration: Add stripe_subscription_id to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
```

Append this to the end of `supabase/schema.sql`.

**Step 2: Update ProfileRow type**

In `src/types/database.ts`, add to `ProfileRow` interface after `stripe_customer_id`:

```typescript
stripe_subscription_id: string | null
```

**Step 3: Run migration**

```bash
npm run db:migrate
```

**Step 4: Commit**

```bash
git add supabase/schema.sql src/types/database.ts
git commit -m "feat: add stripe_subscription_id column to profiles"
```

---

## Task 2: Stripe Webhook Handler

**Files:**
- Create: `server/routes/api/stripe-webhook.ts`

This is a **Nitro route** (not a TanStack route) because Stripe webhook signature verification requires the raw request body. Nitro routes live in `server/routes/` at the project root.

**Step 1: Create the Nitro webhook route**

```typescript
// server/routes/api/stripe-webhook.ts
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

// Admin client — bypasses RLS (this is a Nitro route, no user cookies)
const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default defineEventHandler(async (event) => {
  const body = await readRawBody(event)
  const sig = getHeader(event, 'stripe-signature')

  if (!body || !sig) {
    throw createError({ statusCode: 400, message: 'Missing body or signature' })
  }

  let stripeEvent: Stripe.Event
  try {
    stripeEvent = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch (err) {
    throw createError({ statusCode: 400, message: 'Invalid signature' })
  }

  switch (stripeEvent.type) {
    case 'checkout.session.completed': {
      const session = stripeEvent.data.object as Stripe.Checkout.Session
      const userId = session.metadata?.supabase_user_id
      if (!userId) break

      const subscriptionId = typeof session.subscription === 'string'
        ? session.subscription
        : session.subscription?.id

      await supabase
        .from('profiles')
        .update({
          tier: 'pro',
          stripe_customer_id: typeof session.customer === 'string' ? session.customer : session.customer?.id,
          stripe_subscription_id: subscriptionId,
        })
        .eq('id', userId)

      break
    }

    case 'customer.subscription.updated': {
      const subscription = stripeEvent.data.object as Stripe.Subscription
      const customerId = typeof subscription.customer === 'string'
        ? subscription.customer
        : subscription.customer.id

      const status = subscription.status
      const tier = (status === 'active' || status === 'trialing') ? 'pro' : 'free'

      await supabase
        .from('profiles')
        .update({ tier, stripe_subscription_id: subscription.id })
        .eq('stripe_customer_id', customerId)

      break
    }

    case 'customer.subscription.deleted': {
      const subscription = stripeEvent.data.object as Stripe.Subscription
      const customerId = typeof subscription.customer === 'string'
        ? subscription.customer
        : subscription.customer.id

      // Downgrade to free, clear custom domain
      await supabase
        .from('profiles')
        .update({
          tier: 'free',
          stripe_subscription_id: null,
          custom_domain: null,
        })
        .eq('stripe_customer_id', customerId)

      break
    }

    case 'invoice.payment_failed': {
      // Log for now — could send warning email later
      const invoice = stripeEvent.data.object as Stripe.Invoice
      console.warn(`Payment failed for customer ${invoice.customer}`)
      break
    }
  }

  return { received: true }
})
```

**Step 2: Verify the server/routes directory exists**

```bash
mkdir -p server/routes/api
```

**Step 3: Commit**

```bash
git add server/routes/api/stripe-webhook.ts
git commit -m "feat: add Stripe webhook handler for subscription lifecycle"
```

---

## Task 3: Transactional Email with Resend

**Files:**
- Create: `src/server/email.ts`

**Step 1: Install Resend**

```bash
npm install resend
```

**Step 2: Create email server module**

```typescript
// src/server/email.ts
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY!)
const FROM_EMAIL = process.env.EMAIL_FROM || 'DJ EPK <noreply@yourdomain.com>'

interface BookingInquiry {
  name: string
  email: string
  eventName?: string
  eventDate?: string
  venueLocation?: string
  budgetRange?: string
  message: string
  artistName: string
}

export async function sendBookingNotification(to: string, inquiry: BookingInquiry) {
  await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `New Booking Inquiry from ${inquiry.name}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>New Booking Inquiry</h2>
        <p>You've received a new booking request for <strong>${inquiry.artistName}</strong>.</p>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 8px 0; color: #666;">Name</td><td style="padding: 8px 0;">${inquiry.name}</td></tr>
          <tr><td style="padding: 8px 0; color: #666;">Email</td><td style="padding: 8px 0;"><a href="mailto:${inquiry.email}">${inquiry.email}</a></td></tr>
          ${inquiry.eventName ? `<tr><td style="padding: 8px 0; color: #666;">Event</td><td style="padding: 8px 0;">${inquiry.eventName}</td></tr>` : ''}
          ${inquiry.eventDate ? `<tr><td style="padding: 8px 0; color: #666;">Date</td><td style="padding: 8px 0;">${inquiry.eventDate}</td></tr>` : ''}
          ${inquiry.venueLocation ? `<tr><td style="padding: 8px 0; color: #666;">Venue/Location</td><td style="padding: 8px 0;">${inquiry.venueLocation}</td></tr>` : ''}
          ${inquiry.budgetRange ? `<tr><td style="padding: 8px 0; color: #666;">Budget</td><td style="padding: 8px 0;">${inquiry.budgetRange}</td></tr>` : ''}
        </table>
        <div style="margin-top: 16px; padding: 16px; background: #f5f5f5; border-radius: 8px;">
          <p style="margin: 0; color: #666; font-size: 14px;">Message:</p>
          <p style="margin: 8px 0 0;">${inquiry.message.replace(/\n/g, '<br>')}</p>
        </div>
        <p style="margin-top: 24px; font-size: 12px; color: #999;">
          Reply directly to this email or contact ${inquiry.email}
        </p>
      </div>
    `,
    replyTo: inquiry.email,
  })
}

export async function sendBookingConfirmation(to: string, artistName: string) {
  await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `Booking inquiry received - ${artistName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Thanks for your inquiry!</h2>
        <p>Your booking request for <strong>${artistName}</strong> has been received. The artist's management team will review your inquiry and get back to you.</p>
        <p style="margin-top: 24px; font-size: 12px; color: #999;">
          This is an automated message. Please do not reply to this email.
        </p>
      </div>
    `,
  })
}
```

**Step 3: Add environment variables to .env**

Add these to your `.env` file (do NOT commit):
```
RESEND_API_KEY=re_xxxxx
EMAIL_FROM=DJ EPK <noreply@yourdomain.com>
```

**Step 4: Commit**

```bash
git add src/server/email.ts
git commit -m "feat: add Resend transactional email service for booking notifications"
```

---

## Task 4: Rate Limiting Middleware

**Files:**
- Create: `server/middleware/rate-limit.ts`

**Step 1: Create rate limiting middleware**

```typescript
// server/middleware/rate-limit.ts

interface Bucket {
  tokens: number
  lastRefill: number
}

const buckets = new Map<string, Bucket>()

// Clean up stale entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, bucket] of buckets) {
    if (now - bucket.lastRefill > 300_000) buckets.delete(key)
  }
}, 300_000)

function checkRateLimit(key: string, maxTokens: number, refillRatePerSecond: number): boolean {
  const now = Date.now()
  let bucket = buckets.get(key)

  if (!bucket) {
    bucket = { tokens: maxTokens - 1, lastRefill: now }
    buckets.set(key, bucket)
    return true
  }

  // Refill tokens based on elapsed time
  const elapsed = (now - bucket.lastRefill) / 1000
  bucket.tokens = Math.min(maxTokens, bucket.tokens + elapsed * refillRatePerSecond)
  bucket.lastRefill = now

  if (bucket.tokens < 1) return false

  bucket.tokens -= 1
  return true
}

// Rate limit config by path prefix
const RATE_LIMITS: Record<string, { maxTokens: number; refillRate: number }> = {
  '/api/booking-request': { maxTokens: 3, refillRate: 3 / 60 }, // 3 per minute
}

export default defineEventHandler((event) => {
  const path = getRequestURL(event).pathname
  const ip = getHeader(event, 'x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'

  for (const [prefix, config] of Object.entries(RATE_LIMITS)) {
    if (path.startsWith(prefix)) {
      const key = `${prefix}:${ip}`
      if (!checkRateLimit(key, config.maxTokens, config.refillRate)) {
        throw createError({ statusCode: 429, message: 'Too many requests. Please try again later.' })
      }
      break
    }
  }
})
```

**Step 2: Commit**

```bash
git add server/middleware/rate-limit.ts
git commit -m "feat: add in-memory rate limiting middleware for public endpoints"
```

---

## Task 5: Update billing.ts to Store Subscription ID

**Files:**
- Modify: `src/server/billing.ts:24-31`

**Step 1: Add subscription metadata to checkout session**

In `src/server/billing.ts`, update the `stripe.checkout.sessions.create` call to include `subscription_data.metadata`:

Replace lines 24-31:

```typescript
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: process.env.STRIPE_PRO_PRICE_ID!, quantity: 1 }],
      success_url: `${BASE_URL}/dashboard/settings?upgraded=true`,
      cancel_url: `${BASE_URL}/dashboard/settings`,
      metadata: { supabase_user_id: user.id },
    })
```

With:

```typescript
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: process.env.STRIPE_PRO_PRICE_ID!, quantity: 1 }],
      success_url: `${BASE_URL}/dashboard/settings?upgraded=true`,
      cancel_url: `${BASE_URL}/dashboard/settings`,
      metadata: { supabase_user_id: user.id },
      subscription_data: {
        metadata: { supabase_user_id: user.id },
      },
    })
```

**Step 2: Commit**

```bash
git add src/server/billing.ts
git commit -m "feat: pass supabase user ID in Stripe subscription metadata"
```

---

## Verification Checklist

- [ ] `stripe_subscription_id` column exists in profiles table
- [ ] `ProfileRow` type includes `stripe_subscription_id`
- [ ] Stripe webhook at `/api/stripe-webhook` handles all 4 event types
- [ ] Webhook verifies Stripe signature before processing
- [ ] Resend email module exports `sendBookingNotification` and `sendBookingConfirmation`
- [ ] Rate limiting middleware applies to `/api/booking-request` path
- [ ] `createCheckoutSession` passes user ID in subscription metadata
- [ ] Environment variables documented: `STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`, `EMAIL_FROM`
