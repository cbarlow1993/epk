import { createServerFn } from '@tanstack/react-start'
import { getSupabaseServerClient } from '~/utils/supabase'
import { profileUpdateSchema } from '~/schemas/profile'

const RESERVED_SLUGS = new Set([
  'dashboard', 'login', 'signup', 'admin', 'api', 'settings',
  'profile', 'billing', 'help', 'support', 'about', 'pricing',
])

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
  'bio_left',
  'bio_right',
])

export const getProfile = createServerFn({ method: 'GET' }).handler(async () => {
  const supabase = getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
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
    const supabase = getSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

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
