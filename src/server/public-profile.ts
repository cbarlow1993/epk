import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { getSupabaseServerClient } from '~/utils/supabase.server'

export const getPublicProfile = createServerFn({ method: 'GET' })
  .inputValidator((data: unknown) => z.string().min(1).max(100).parse(data))
  .handler(async ({ data: slug }) => {
    const supabase = getSupabaseServerClient()

    const { data: fullProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('slug', slug)
      .eq('published', true)
      .single()

    if (!fullProfile) return null

    // Strip sensitive fields before returning to client
    const { id, stripe_customer_id, stripe_subscription_id, custom_css, ...profile } = fullProfile
    const profileId = id

    // Fetch organization if profile belongs to one
    let organization: { name: string; logo_url: string | null; website_url: string | null; slug: string } | null = null
    if (fullProfile.organization_id) {
      const { data: org } = await supabase
        .from('organizations')
        .select('name, logo_url, website_url, slug')
        .eq('id', fullProfile.organization_id)
        .single()
      organization = org
    }

    const [
      { data: socialLinks },
      { data: mixes },
      { data: events },
      { data: technicalRider },
      { data: bookingContact },
      { data: pressAssets },
      { data: integrations },
    ] = await Promise.all([
      supabase.from('social_links').select('*').eq('profile_id', profileId).order('sort_order'),
      supabase.from('mixes').select('*').eq('profile_id', profileId).order('sort_order'),
      supabase.from('events').select('*').eq('profile_id', profileId).order('sort_order'),
      supabase.from('technical_rider').select('*').eq('profile_id', profileId).single(),
      supabase.from('booking_contact').select('*').eq('profile_id', profileId).single(),
      supabase.from('files').select('*').eq('profile_id', profileId).eq('is_press_asset', true).order('sort_order'),
      supabase.from('integrations').select('*').eq('profile_id', profileId).eq('enabled', true).order('sort_order'),
    ])

    return {
      profile,
      profileId,
      socialLinks: socialLinks || [],
      mixes: mixes || [],
      events: events || [],
      technicalRider: technicalRider || null,
      bookingContact: bookingContact || null,
      pressAssets: pressAssets || [],
      organization,
      integrations: (integrations || []).map((row) => {
        const config = { ...(row.config as Record<string, unknown>) }
        delete config.api_key
        return { ...row, config }
      }),
    }
  })
