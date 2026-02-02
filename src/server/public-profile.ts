import { createServerFn } from '@tanstack/react-start'
import { getSupabaseAdmin } from '~/utils/supabase'

export const getPublicProfile = createServerFn({ method: 'GET' })
  .inputValidator((slug: string) => slug)
  .handler(async ({ data: slug }) => {
    const supabase = getSupabaseAdmin()

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('slug', slug)
      .eq('published', true)
      .single()

    if (!profile) return null

    const [
      { data: socialLinks },
      { data: mixes },
      { data: events },
      { data: technicalRider },
      { data: bookingContact },
      { data: pressAssets },
    ] = await Promise.all([
      supabase.from('social_links').select('*').eq('profile_id', profile.id).order('sort_order'),
      supabase.from('mixes').select('*').eq('profile_id', profile.id).order('sort_order'),
      supabase.from('events').select('*').eq('profile_id', profile.id).order('sort_order'),
      supabase.from('technical_rider').select('*').eq('profile_id', profile.id).single(),
      supabase.from('booking_contact').select('*').eq('profile_id', profile.id).single(),
      supabase.from('press_assets').select('*').eq('profile_id', profile.id).order('sort_order'),
    ])

    return {
      profile,
      socialLinks: socialLinks || [],
      mixes: mixes || [],
      events: events || [],
      technicalRider: technicalRider || null,
      bookingContact: bookingContact || null,
      pressAssets: pressAssets || [],
    }
  })
