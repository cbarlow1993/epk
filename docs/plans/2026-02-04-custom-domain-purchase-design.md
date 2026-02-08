# Custom Domain Purchase Feature Design

## Overview

Expand the existing custom domain system with a "Buy a domain" flow. Users can search for available domains, pay via Stripe, and have the domain automatically registered through Vercel's Registrar API and configured on their EPK.

Two paths in one UI:
1. **BYOD (existing)** — user brings their own domain, configures DNS manually
2. **Buy a domain (new)** — search, pay, auto-provision

Pro plan required for both paths.

## Vercel Registrar API

All endpoints at `https://api.vercel.com/v1/registrar/`. Auth via `VERCEL_TOKEN` bearer token.

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/domains/{domain}/availability` | GET | Check if domain is available |
| `/domains/{domain}/price?years=1` | GET | Get purchase + renewal pricing |
| `/domains/{domain}/buy` | POST | Purchase domain (charges Vercel account) |
| `/domains/{domain}/renew` | POST | Renew domain (charges Vercel account) |

**Key constraint:** Vercel charges the team account directly. We collect payment from the user via Stripe first, then call Vercel's API. Both buy and renew endpoints require `expectedPrice` to prevent race conditions.

## Pricing Model

- **Pass-through + flat fee:** Vercel's price + $5 service fee
- Applies to both registration (year one) and renewal (subsequent years)
- If year-one price differs from renewal price, both are shown

## Purchase Flow

```
User searches domain
        ↓
Check availability + get pricing (parallel Vercel API calls)
        ↓
Show results with prices (Vercel cost + $5)
        ↓
User clicks "Buy" → contact info form (name, email, phone, address)
        ↓
Create domain_orders row (status: pending_payment)
Create Stripe Checkout session:
  - One-time: registration fee
  - Recurring annual: renewal fee
        ↓
Redirect to Stripe Checkout
        ↓
Stripe webhook: checkout.session.completed
  → Call Vercel POST /domains/{domain}/buy
  → Call Vercel POST /v10/projects/{projectId}/domains
  → Update profiles.custom_domain
  → Update domain_orders.status → active
        ↓
User returns to Settings, sees domain active
```

## Renewal Flow

- Stripe recurring subscription charges annually
- On `invoice.paid` webhook → call Vercel `POST /domains/{domain}/renew`
- If Vercel price changed → `expected_price_mismatch` error:
  - Fetch new price, update Stripe subscription amount, retry
  - If increase >20%, email user instead of auto-adjusting

## Cancellation

- User removes purchased domain → cancel Stripe subscription, remove from Vercel project
- Domain stays registered until expiry (no transfer)
- Pro downgrade → domain stays registered but routing disabled; re-upgrade reconnects

## Database Schema

New table `domain_orders`:

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

alter table public.domain_orders enable row level security;
create policy "Users can view own domain orders"
  on public.domain_orders for select using (profile_id = auth.uid());
create policy "Users can insert own domain orders"
  on public.domain_orders for insert with check (profile_id = auth.uid());
```

No changes to `profiles` table — `custom_domain` column remains the routing source of truth.

## Domain Order Statuses

| Status | Meaning |
|--------|---------|
| `pending_payment` | Awaiting Stripe checkout completion |
| `purchasing` | Stripe paid, Vercel buy API in progress |
| `active` | Domain registered, configured, and resolving |
| `renewal_failed` | Stripe charged but Vercel renewal failed |
| `failed` | Purchase failed, Stripe payment refunded |
| `cancelled` | User removed domain, subscription cancelled |

## Server Functions

New in `src/server/domains.ts`:

- `searchDomain({ domain })` — check availability + pricing for domain and common TLD alternatives (.com, .io, .dj, .music)
- `createDomainCheckout({ domainOrderId })` — create Stripe Checkout session with one-time + recurring line items
- `cancelDomainOrder()` — cancel Stripe subscription, remove domain from Vercel project, update statuses
- `getDomainOrder()` — fetch current user's active domain order

Webhook additions in `server/routes/api/stripe-webhook.ts`:
- `checkout.session.completed` with domain order metadata → call Vercel buy + project domain APIs
- `invoice.paid` for domain renewal subscriptions → call Vercel renew API

## UI Changes

All within `CustomDomainSection` in `dashboard.settings.tsx`. No new routes.

**Tab switcher:**
- "Use your own" — existing BYOD flow
- "Buy a domain" — new search/purchase flow

**Buy flow states:**
1. Search input + results with prices
2. Contact info form (on "Buy" click)
3. Stripe redirect
4. Status display on return (purchasing → active)

**Active domain display:**
- Domain name + "Active" badge
- Expiry/renewal dates
- "Remove domain" button

**Error banners:**
- `renewal_failed` → yellow: "Renewal failed — we'll retry automatically"
- `failed` → red: "Purchase failed — payment refunded"
- `purchasing` → spinner: "Setting up your domain..."

## Environment Variables

Existing (already configured):
- `VERCEL_TOKEN`, `VERCEL_PROJECT_ID`, `VERCEL_TEAM_ID`
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`

No new env vars required.
