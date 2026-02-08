import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { withAuth, withAuthOrNull } from './utils'

export interface ChecklistState {
  // Phase 1: Complete your EPK
  has_display_name: boolean
  has_profile_image: boolean
  has_bio: boolean
  has_hero_image: boolean
  has_mixes: boolean
  has_contact: boolean
  has_socials: boolean
  // Phase 2: Go live & share
  is_published: boolean
  has_social_preview: boolean
  shared_social: boolean      // manual
  added_to_bio: boolean       // manual
  sent_to_promoter: boolean   // manual
  // Phase 3: Level up
  has_custom_domain: boolean
  added_to_email_sig: boolean // manual
  included_in_demo: boolean   // manual
  has_custom_theme: boolean
}

function hasBioContent(bio: unknown, shortBio: string | null): boolean {
  if (shortBio?.trim()) return true
  if (!bio || typeof bio !== 'object') return false
  const blocks = (bio as Record<string, unknown>).blocks
  return Array.isArray(blocks) && blocks.length > 0
}

export interface ChecklistLoaderData {
  checklist: ChecklistState
  tier: 'free' | 'pro'
}

export const getChecklistState = createServerFn({ method: 'GET' }).handler(async (): Promise<ChecklistLoaderData | null> => {
  const { supabase, user } = await withAuthOrNull()
  if (!user) return null

  const [profileResult, mixesResult, socialsResult, contactResult] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('mixes').select('id', { count: 'exact', head: true }).eq('profile_id', user.id),
    supabase.from('social_links').select('id', { count: 'exact', head: true }).eq('profile_id', user.id),
    supabase.from('booking_contact').select('email, phone').eq('profile_id', user.id).single(),
  ])

  const profile = profileResult.data
  if (!profile) return null

  const manualProgress: Record<string, boolean> = (profile.checklist_progress as Record<string, boolean>) || {}

  return {
    tier: profile.tier === 'pro' ? 'pro' : 'free',
    checklist: {
      has_display_name: !!profile.display_name?.trim(),
      has_profile_image: !!profile.profile_image_url,
      has_bio: hasBioContent(profile.bio, profile.short_bio),
      has_hero_image: !!profile.hero_image_url,
      has_mixes: (mixesResult.count ?? 0) > 0,
      has_contact: !!(contactResult.data?.email || contactResult.data?.phone),
      has_socials: (socialsResult.count ?? 0) > 0,
      is_published: profile.published,
      has_social_preview: !!(profile.og_title || profile.og_image_url),
      shared_social: !!manualProgress.shared_social,
      added_to_bio: !!manualProgress.added_to_bio,
      sent_to_promoter: !!manualProgress.sent_to_promoter,
      has_custom_domain: !!profile.custom_domain,
      added_to_email_sig: !!manualProgress.added_to_email_sig,
      included_in_demo: !!manualProgress.included_in_demo,
      has_custom_theme: profile.template !== 'default' || profile.accent_color !== null,
    },
  }
})

const MANUAL_KEYS = ['shared_social', 'added_to_bio', 'sent_to_promoter', 'added_to_email_sig', 'included_in_demo'] as const

const toggleChecklistItemSchema = z.object({
  key: z.enum(MANUAL_KEYS),
  checked: z.boolean(),
})

export const toggleChecklistItem = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => toggleChecklistItemSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabase, user } = await withAuth()

    const { data: profile } = await supabase
      .from('profiles')
      .select('checklist_progress')
      .eq('id', user.id)
      .single()

    const current: Record<string, boolean> = (profile?.checklist_progress as Record<string, boolean>) || {}
    const updated = { ...current, [data.key]: data.checked }

    const { error } = await supabase
      .from('profiles')
      .update({ checklist_progress: updated })
      .eq('id', user.id)

    if (error) return { error: error.message }
    return { data: updated }
  })
