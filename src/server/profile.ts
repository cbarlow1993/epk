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
  'hero_style',
  'bio_layout',
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
    for (const key of ['og_title', 'og_description', 'og_image_url']) {
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
