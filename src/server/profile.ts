import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { profileUpdateSchema } from '~/schemas/profile'
import { RESERVED_SLUGS } from '~/utils/constants'
import { withAuth, withAuthOrNull } from './utils'

const ALLOWED_PROFILE_FIELDS = new Set([
  'display_name',
  'tagline',
  'slug',
  'genres',
  'profile_image_url',
  'hero_image_url',
  'published',
  'accent_color',
  'bg_color',
  'font_family',
  'short_bio',
  'bio',
  'bpm_min',
  'bpm_max',
  'favicon_url',
  'hide_platform_branding',
  'meta_description',
  'template',
  'og_title',
  'og_description',
  'og_image_url',
  'twitter_card_type',
  'section_order',
  'section_visibility',
  'mix_category_order',
  'event_category_order',
  'hero_style',
  'hero_video_url',
  'animate_sections',
  'bio_layout',
  'press_kit_url',
  // Theme — Typography
  'theme_display_font',
  'theme_display_size',
  'theme_display_weight',
  'theme_heading_font',
  'theme_heading_size',
  'theme_heading_weight',
  'theme_subheading_font',
  'theme_subheading_size',
  'theme_subheading_weight',
  'theme_body_font',
  'theme_body_size',
  'theme_body_weight',
  // Theme — Colors
  'theme_text_color',
  'theme_heading_color',
  'theme_link_color',
  'theme_card_bg',
  'theme_border_color',
  // Theme — Spacing & Layout
  'theme_section_padding',
  'theme_content_width',
  'theme_card_radius',
  'theme_element_gap',
  // Theme — Buttons & Links
  'theme_button_style',
  'theme_link_style',
  // Theme — Effects
  'theme_card_border',
  'theme_shadow',
  'theme_divider_style',
  // Theme — Custom Fonts
  'theme_custom_fonts',
])

export const getProfile = createServerFn({ method: 'GET' }).handler(async () => {
  const { supabase, user } = await withAuthOrNull()
  if (!user) return null

  const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (data) return data

  // Auto-create profile row for new users if trigger didn't fire
  const { data: newProfile } = await supabase
    .from('profiles')
    .insert({ id: user.id, display_name: '', slug: user.id.slice(0, 8) })
    .select()
    .single()
  return newProfile
})

export const updateProfile = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => profileUpdateSchema.partial().parse(data))
  .handler(async ({ data }) => {
    const { supabase, user } = await withAuth()

    // Whitelist fields to prevent privilege escalation
    const sanitized: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(data)) {
      if (ALLOWED_PROFILE_FIELDS.has(key)) {
        sanitized[key] = value
      }
    }

    if (Object.keys(sanitized).length === 0) {
      return { error: 'No valid fields provided' }
    }

    // Coerce empty strings to null for nullable text fields
    for (const key of [
      'og_title', 'og_description', 'og_image_url', 'hero_image_url', 'hero_video_url', 'press_kit_url',
      'theme_display_font', 'theme_display_size', 'theme_display_weight',
      'theme_heading_font', 'theme_heading_size', 'theme_heading_weight',
      'theme_subheading_font', 'theme_subheading_size', 'theme_subheading_weight',
      'theme_body_font', 'theme_body_size', 'theme_body_weight',
      'theme_text_color', 'theme_heading_color', 'theme_link_color', 'theme_card_bg', 'theme_border_color',
      'theme_section_padding', 'theme_content_width', 'theme_card_radius', 'theme_element_gap',
      'theme_button_style', 'theme_link_style',
      'theme_card_border', 'theme_shadow', 'theme_divider_style',
    ]) {
      if (key in sanitized && sanitized[key] === '') {
        sanitized[key] = null
      }
    }

    // Validate slug if being updated
    if (typeof sanitized.slug === 'string') {
      const slug = sanitized.slug
      if (RESERVED_SLUGS.has(slug)) {
        return { error: 'This URL is reserved. Please choose a different slug.' }
      }
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .update(sanitized)
      .eq('id', user.id)
      .select()
      .single()

    if (error) return { error: error.message }
    return { profile }
  })

export const checkSlugAvailability = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => z.object({ slug: z.string().min(2).max(50) }).parse(data))
  .handler(async ({ data }) => {
    const { supabase, user } = await withAuth()

    const slug = data.slug.toLowerCase()

    // Check reserved slugs
    if (RESERVED_SLUGS.has(slug)) {
      return { available: false, reason: 'This URL is reserved' }
    }

    // Check if slug is taken by another user
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('slug', slug)
      .maybeSingle()

    if (existing && existing.id !== user.id) {
      return { available: false, reason: 'This URL is already taken' }
    }

    return { available: true }
  })

export const completeOnboarding = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) =>
    z.object({
      display_name: z.string().min(1, 'Display name is required').max(100),
      slug: z.string().min(2).max(50).regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/, 'Lowercase alphanumeric and hyphens only'),
      genres: z.array(z.string().max(50)).max(20).optional(),
    }).parse(data)
  )
  .handler(async ({ data }) => {
    const { supabase, user } = await withAuth()

    // Check reserved slugs
    if (RESERVED_SLUGS.has(data.slug)) {
      return { error: 'This URL is reserved. Please choose a different slug.' }
    }

    // Check slug uniqueness
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('slug', data.slug)
      .maybeSingle()

    if (existing && existing.id !== user.id) {
      return { error: 'This URL is already taken. Please choose a different one.' }
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .update({
        display_name: data.display_name,
        slug: data.slug,
        genres: data.genres || [],
        onboarding_completed: true,
      })
      .eq('id', user.id)
      .select()
      .single()

    if (error) return { error: error.message }
    return { profile }
  })

export const getUserEmail = createServerFn({ method: 'GET' }).handler(async () => {
  const { user } = await withAuth()
  return { email: user.email ?? '' }
})

const emailUpdateSchema = z.object({ email: z.string().email('Please enter a valid email address') })

export const updateUserEmail = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => emailUpdateSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabase } = await withAuth()
    const { error } = await supabase.auth.updateUser({ email: data.email })
    if (error) return { error: error.message }
    return { data: { message: 'Confirmation email sent to your new address.' } }
  })

const passwordUpdateSchema = z.object({ password: z.string().min(8, 'Password must be at least 8 characters') })

export const updateUserPassword = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => passwordUpdateSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabase } = await withAuth()
    const { error } = await supabase.auth.updateUser({ password: data.password })
    if (error) return { error: error.message }
    return { data: { message: 'Password updated successfully.' } }
  })

export const restorePremiumSnapshot = createServerFn({ method: 'POST' }).handler(async () => {
  const { supabase, user } = await withAuth()

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

  // Restore profile fields (keep snapshot intact until everything succeeds)
  const { error: profileErr } = await supabase
    .from('profiles')
    .update(snapshot.profile_fields)
    .eq('id', user.id)

  if (profileErr) return { error: profileErr.message }

  // Restore integrations with error handling
  for (const integration of snapshot.integrations) {
    const { error: intErr } = await supabase
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

    if (intErr) {
      console.error(`[restorePremiumSnapshot] Failed to restore integration ${integration.type}:`, intErr.message)
    }
  }

  // Clear snapshot only after successful restoration
  await supabase
    .from('profiles')
    .update({ premium_snapshot: null })
    .eq('id', user.id)

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
