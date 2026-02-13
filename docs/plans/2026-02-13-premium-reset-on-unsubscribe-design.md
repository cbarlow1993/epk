# Premium Feature Reset on Unsubscribe

## Problem

When a user cancels their Pro subscription, the webhook currently only sets `tier: 'free'`, clears `stripe_subscription_id`, and clears `custom_domain`. All other premium data (branding, theme, OG tags, integrations) persists in the database and continues rendering on the public EPK page.

## Solution

Snapshot all premium data before resetting, so users can restore their settings if they re-subscribe.

## On Unsubscribe (`customer.subscription.deleted` webhook)

### 1. Snapshot premium data

Save a JSON blob to a new `premium_snapshot` JSONB column on `profiles`:

```json
{
  "snapshotted_at": "2026-02-13T...",
  "profile_fields": {
    "favicon_url": "...",
    "hide_platform_branding": true,
    "meta_description": "...",
    "og_title": "...",
    "og_description": "...",
    "og_image_url": "...",
    "twitter_card_type": "summary_large_image",
    "theme_display_font": "...",
    "theme_display_size": "...",
    "theme_display_weight": "...",
    "theme_heading_font": "...",
    "theme_heading_size": "...",
    "theme_heading_weight": "...",
    "theme_subheading_font": "...",
    "theme_subheading_size": "...",
    "theme_subheading_weight": "...",
    "theme_body_font": "...",
    "theme_body_size": "...",
    "theme_body_weight": "...",
    "theme_text_color": "...",
    "theme_heading_color": "...",
    "theme_link_color": "...",
    "theme_card_bg": "...",
    "theme_border_color": "...",
    "theme_section_padding": "...",
    "theme_content_width": "...",
    "theme_card_radius": "...",
    "theme_element_gap": "...",
    "theme_button_style": "...",
    "theme_link_style": "...",
    "theme_card_border": "...",
    "theme_shadow": "...",
    "theme_divider_style": "...",
    "theme_custom_fonts": [...]
  },
  "integrations": [
    { "type": "google_analytics", "enabled": true, "config": { "measurement_id": "G-XXX" }, "sort_order": 0 }
  ]
}
```

### 2. Reset premium profile fields to defaults

```sql
favicon_url = NULL,
hide_platform_branding = false,
meta_description = NULL,
og_title = NULL,
og_description = NULL,
og_image_url = NULL,
twitter_card_type = NULL,
-- All theme_* fields = NULL
theme_display_font = NULL, theme_display_size = NULL, theme_display_weight = NULL,
theme_heading_font = NULL, theme_heading_size = NULL, theme_heading_weight = NULL,
theme_subheading_font = NULL, theme_subheading_size = NULL, theme_subheading_weight = NULL,
theme_body_font = NULL, theme_body_size = NULL, theme_body_weight = NULL,
theme_text_color = NULL, theme_heading_color = NULL, theme_link_color = NULL,
theme_card_bg = NULL, theme_border_color = NULL,
theme_section_padding = NULL, theme_content_width = NULL,
theme_card_radius = NULL, theme_element_gap = NULL,
theme_button_style = NULL, theme_link_style = NULL,
theme_card_border = NULL, theme_shadow = NULL, theme_divider_style = NULL,
theme_custom_fonts = NULL,
custom_domain = NULL  -- already done
```

### 3. Disable premium integrations

Set `enabled = false` on all integrations for the profile (GA, Plausible, etc.). Data is preserved in the `integrations` table but won't render.

### 4. Files/storage

No changes to files. Existing files remain. The storage quota check already blocks uploads when over the 5GB free limit.

## On Re-subscribe (`checkout.session.completed` webhook)

No automatic restore. The snapshot is just stored.

## Restore Flow (Dashboard UI)

After upgrading back to Pro, if `premium_snapshot` is not null:

1. Show a banner/card on the dashboard: "Welcome back! We saved your previous Pro settings. Would you like to restore them?"
2. "Restore previous settings" button applies the snapshot and clears `premium_snapshot`
3. "Start fresh" button just clears `premium_snapshot`

## Database Changes

### New migration

```sql
ALTER TABLE profiles ADD COLUMN premium_snapshot JSONB DEFAULT NULL;
```

## Files to modify

1. `supabase/migrations/YYYYMMDD_add_premium_snapshot.sql` — add column
2. `src/types/database.ts` — add `premium_snapshot` to `ProfileRow`
3. `server/routes/api/stripe-webhook.ts` — snapshot + reset in `customer.subscription.deleted`
4. `src/server/profile.ts` — add `restorePremiumSnapshot` and `dismissPremiumSnapshot` server functions
5. `src/routes/_dashboard/dashboard.index.tsx` — show restore banner when snapshot exists
