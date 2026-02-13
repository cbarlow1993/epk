# Premium Reset on Unsubscribe — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** When a user cancels their Pro subscription, snapshot all premium data, reset to free defaults, and offer a restore option when they re-subscribe.

**Architecture:** The Stripe `customer.subscription.deleted` webhook snapshots premium profile fields + integrations into a `premium_snapshot` JSONB column, then resets everything. The dashboard index page shows a restore banner when a snapshot exists. Two new server functions handle restore/dismiss.

**Tech Stack:** Supabase migration (SQL), Stripe webhook (Nitro route), TanStack Start server functions, React components.

---

### Task 1: Add `premium_snapshot` column to profiles

**Files:**
- Create: `supabase/migrations/YYYYMMDD_add_premium_snapshot.sql`
- Modify: `src/types/database.ts:4-79`

**Step 1: Create the migration file**

Generate a timestamped migration:

```bash
npx supabase migration new add_premium_snapshot
```

Then write the SQL:

```sql
ALTER TABLE profiles ADD COLUMN premium_snapshot JSONB DEFAULT NULL;
```

**Step 2: Add `premium_snapshot` to `ProfileRow` in `src/types/database.ts`**

After `onboarding_completed: boolean` (line 77), add:

```typescript
premium_snapshot: Record<string, unknown> | null
```

**Step 3: Push migration to remote**

```bash
npx supabase db push
```

**Step 4: Commit**

```bash
git add supabase/migrations/*_add_premium_snapshot.sql src/types/database.ts
git commit -m "feat: add premium_snapshot JSONB column to profiles"
```

---

### Task 2: Update webhook to snapshot and reset on cancellation

**Files:**
- Modify: `server/routes/api/stripe-webhook.ts:214-240`

**Step 1: Read the current profile before resetting**

In the `customer.subscription.deleted` case (line 214), after extracting `customerId`, fetch the full profile row and its integrations before the update:

```typescript
case 'customer.subscription.deleted': {
  console.log(`[stripe-webhook] Processing ${stripeEvent.type}`)
  const subscription = stripeEvent.data.object as Stripe.Subscription

  // Skip domain renewal subscriptions — handled by cancelDomainOrder
  if (subscription.metadata?.type === 'domain_renewal') break

  const customerId = typeof subscription.customer === 'string'
    ? subscription.customer
    : subscription.customer.id

  // Fetch current profile to snapshot premium data
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('stripe_customer_id', customerId)
    .single()

  if (!profile) {
    console.error('[stripe-webhook] No profile found for customer:', customerId)
    break
  }

  // Snapshot premium fields + integrations
  const { data: integrations } = await supabase
    .from('integrations')
    .select('type, enabled, config, sort_order')
    .eq('profile_id', profile.id)

  const snapshot = {
    snapshotted_at: new Date().toISOString(),
    profile_fields: {
      favicon_url: profile.favicon_url,
      hide_platform_branding: profile.hide_platform_branding,
      meta_description: profile.meta_description,
      og_title: profile.og_title,
      og_description: profile.og_description,
      og_image_url: profile.og_image_url,
      twitter_card_type: profile.twitter_card_type,
      theme_display_font: profile.theme_display_font,
      theme_display_size: profile.theme_display_size,
      theme_display_weight: profile.theme_display_weight,
      theme_heading_font: profile.theme_heading_font,
      theme_heading_size: profile.theme_heading_size,
      theme_heading_weight: profile.theme_heading_weight,
      theme_subheading_font: profile.theme_subheading_font,
      theme_subheading_size: profile.theme_subheading_size,
      theme_subheading_weight: profile.theme_subheading_weight,
      theme_body_font: profile.theme_body_font,
      theme_body_size: profile.theme_body_size,
      theme_body_weight: profile.theme_body_weight,
      theme_text_color: profile.theme_text_color,
      theme_heading_color: profile.theme_heading_color,
      theme_link_color: profile.theme_link_color,
      theme_card_bg: profile.theme_card_bg,
      theme_border_color: profile.theme_border_color,
      theme_section_padding: profile.theme_section_padding,
      theme_content_width: profile.theme_content_width,
      theme_card_radius: profile.theme_card_radius,
      theme_element_gap: profile.theme_element_gap,
      theme_button_style: profile.theme_button_style,
      theme_link_style: profile.theme_link_style,
      theme_card_border: profile.theme_card_border,
      theme_shadow: profile.theme_shadow,
      theme_divider_style: profile.theme_divider_style,
      theme_custom_fonts: profile.theme_custom_fonts,
    },
    integrations: integrations || [],
  }

  // Save snapshot + reset all premium fields to defaults
  const { error } = await supabase
    .from('profiles')
    .update({
      tier: 'free',
      stripe_subscription_id: null,
      custom_domain: null,
      premium_snapshot: snapshot,
      // Reset branding
      favicon_url: null,
      hide_platform_branding: false,
      meta_description: null,
      // Reset OG/social
      og_title: null,
      og_description: null,
      og_image_url: null,
      twitter_card_type: null,
      // Reset theme — Typography
      theme_display_font: null,
      theme_display_size: null,
      theme_display_weight: null,
      theme_heading_font: null,
      theme_heading_size: null,
      theme_heading_weight: null,
      theme_subheading_font: null,
      theme_subheading_size: null,
      theme_subheading_weight: null,
      theme_body_font: null,
      theme_body_size: null,
      theme_body_weight: null,
      // Reset theme — Colors
      theme_text_color: null,
      theme_heading_color: null,
      theme_link_color: null,
      theme_card_bg: null,
      theme_border_color: null,
      // Reset theme — Spacing & Layout
      theme_section_padding: null,
      theme_content_width: null,
      theme_card_radius: null,
      theme_element_gap: null,
      // Reset theme — Buttons & Links
      theme_button_style: null,
      theme_link_style: null,
      // Reset theme — Effects
      theme_card_border: null,
      theme_shadow: null,
      theme_divider_style: null,
      // Reset theme — Custom Fonts
      theme_custom_fonts: null,
    })
    .eq('id', profile.id)

  if (error) {
    throw createError({ statusCode: 500, message: `Database update failed: ${error.message}` })
  }

  // Disable all integrations (data preserved, just disabled)
  await supabase
    .from('integrations')
    .update({ enabled: false })
    .eq('profile_id', profile.id)

  console.log(`[stripe-webhook] Premium features reset for customer: ${customerId}`)
  break
}
```

**Step 2: Commit**

```bash
git add server/routes/api/stripe-webhook.ts
git commit -m "feat: snapshot premium data and reset on subscription cancellation"
```

---

### Task 3: Add restore/dismiss server functions

**Files:**
- Modify: `src/server/profile.ts`

**Step 1: Add `restorePremiumSnapshot` server function**

After the `updateProfile` function in `src/server/profile.ts`, add:

```typescript
export const restorePremiumSnapshot = createServerFn({ method: 'POST' }).handler(async () => {
  const { supabase, user } = await withAuth()

  // Fetch snapshot
  const { data: profile } = await supabase
    .from('profiles')
    .select('premium_snapshot, tier')
    .eq('id', user.id)
    .single()

  if (!profile) return { error: 'Profile not found' }
  if (profile.tier !== 'pro') return { error: 'Pro plan required' }
  if (!profile.premium_snapshot) return { error: 'No snapshot to restore' }

  const snapshot = profile.premium_snapshot as {
    profile_fields: Record<string, unknown>
    integrations: Array<{ type: string; enabled: boolean; config: Record<string, unknown>; sort_order: number }>
  }

  // Restore profile fields
  const { error: profileErr } = await supabase
    .from('profiles')
    .update({ ...snapshot.profile_fields, premium_snapshot: null })
    .eq('id', user.id)

  if (profileErr) return { error: profileErr.message }

  // Restore integrations (re-enable with original config)
  for (const integration of snapshot.integrations) {
    await supabase
      .from('integrations')
      .upsert(
        {
          profile_id: user.id,
          type: integration.type,
          enabled: integration.enabled,
          config: integration.config,
          sort_order: integration.sort_order,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'profile_id,type' }
      )
  }

  return { data: { restored: true } }
})

export const dismissPremiumSnapshot = createServerFn({ method: 'POST' }).handler(async () => {
  const { supabase, user } = await withAuth()

  const { error } = await supabase
    .from('profiles')
    .update({ premium_snapshot: null })
    .eq('id', user.id)

  if (error) return { error: error.message }
  return { data: { dismissed: true } }
})
```

**Step 2: Commit**

```bash
git add src/server/profile.ts
git commit -m "feat: add restorePremiumSnapshot and dismissPremiumSnapshot server functions"
```

---

### Task 4: Add restore banner to dashboard index

**Files:**
- Modify: `src/routes/_dashboard/dashboard.index.tsx`
- Modify: `src/server/checklist.ts` (return `premium_snapshot` in loader data)

**Step 1: Update `getChecklistState` to include `premium_snapshot`**

In `src/server/checklist.ts`, find the return statement of `getChecklistState` and include `premium_snapshot` in the returned data. Look at what the function currently returns and add the field. The loader in `dashboard.index.tsx` calls `getChecklistState()` and returns `{ checklist, tier }`. Add `hasSnapshot: boolean` to the return value.

Find where `getChecklistState` returns and add:

```typescript
hasSnapshot: !!profile.premium_snapshot,
```

to the returned object alongside `checklist` and `tier`.

**Step 2: Update the dashboard index loader and component**

In `src/routes/_dashboard/dashboard.index.tsx`, update the `Dashboard` component to pass `hasSnapshot` down:

```typescript
return <DashboardContent initialState={loaderData.checklist} tier={loaderData.tier} hasSnapshot={loaderData.hasSnapshot} />
```

Update `DashboardContent` props:

```typescript
function DashboardContent({ initialState, tier, hasSnapshot }: { initialState: ChecklistState; tier: 'free' | 'pro'; hasSnapshot: boolean }) {
```

**Step 3: Add the restore banner component and render it**

Add this component before the `DashboardContent` function:

```typescript
function RestoreBanner({ onRestore, onDismiss }: { onRestore: () => void; onDismiss: () => void }) {
  const [loading, setLoading] = useState(false)

  return (
    <div className="border border-accent/30 bg-accent/5 p-5 mb-6 flex items-center justify-between gap-4">
      <div>
        <h2 className="text-sm font-bold text-text-primary">Welcome back!</h2>
        <p className="text-xs text-text-secondary mt-0.5">We saved your previous Pro settings. Would you like to restore them?</p>
      </div>
      <div className="flex gap-2 flex-shrink-0">
        <button
          type="button"
          onClick={() => { setLoading(true); onRestore() }}
          disabled={loading}
          className="px-4 py-2 text-xs font-bold uppercase tracking-wider bg-accent text-white hover:bg-accent/90 transition-colors disabled:opacity-50"
        >
          {loading ? 'Restoring...' : 'Restore Settings'}
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-text-secondary hover:text-text-primary transition-colors"
        >
          Start Fresh
        </button>
      </div>
    </div>
  )
}
```

Add imports at the top of `dashboard.index.tsx`:

```typescript
import { restorePremiumSnapshot, dismissPremiumSnapshot } from '~/server/profile'
```

In `DashboardContent`, add state and handlers:

```typescript
const [showRestore, setShowRestore] = useState(hasSnapshot && tier === 'pro')

const handleRestore = async () => {
  const result = await restorePremiumSnapshot()
  if (result && 'error' in result) {
    // Silently dismiss on error
    setShowRestore(false)
  } else {
    setShowRestore(false)
    window.location.reload()
  }
}

const handleDismiss = async () => {
  setShowRestore(false)
  await dismissPremiumSnapshot()
}
```

Render the banner right after the header `<div>` and before the phases `<div>`:

```tsx
{showRestore && <RestoreBanner onRestore={handleRestore} onDismiss={handleDismiss} />}
```

**Step 4: Commit**

```bash
git add src/server/checklist.ts src/routes/_dashboard/dashboard.index.tsx
git commit -m "feat: add premium settings restore banner on dashboard"
```

---

### Task 5: Manual testing

**Step 1: Verify the full flow**

1. Start the dev server: `npm run dev`
2. Log in as a Pro user
3. Confirm premium features are active (theme, branding, GA, OG tags)
4. Cancel the subscription via Stripe test portal (or simulate by calling the webhook with Stripe CLI)
5. Verify:
   - Profile reverts to free defaults on the public EPK page
   - Theme resets to defaults
   - Branding (favicon, "Built with myEPK" footer) reverts
   - OG tags reset
   - Integrations disabled
   - Files still accessible but uploads blocked at 5GB
6. Re-subscribe via checkout
7. Verify restore banner appears on dashboard
8. Click "Restore Settings" and verify all premium settings are restored
9. Also test "Start Fresh" dismisses the banner and clears the snapshot

**Step 2: Final commit (if any fixes needed)**

```bash
git add -A
git commit -m "fix: adjustments from manual testing"
```
