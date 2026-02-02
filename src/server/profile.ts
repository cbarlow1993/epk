import { createServerFn } from '@tanstack/react-start'
import { getSupabaseServerClient } from '~/utils/supabase'
import { getRequest } from '@tanstack/react-start/server'

export const getProfile = createServerFn({ method: 'GET' }).handler(async () => {
  const request = getRequest()
  const { supabase } = getSupabaseServerClient(request)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  return data
})

export const updateProfile = createServerFn({ method: 'POST' })
  .inputValidator((data: {
    display_name?: string
    tagline?: string
    slug?: string
    genres?: string[]
    profile_image_url?: string
    hero_image_url?: string
    published?: boolean
  }) => data)
  .handler(async ({ data }) => {
    const request = getRequest()
    const { supabase } = getSupabaseServerClient(request)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    const { data: profile, error } = await supabase
      .from('profiles')
      .update(data)
      .eq('id', user.id)
      .select()
      .single()

    if (error) return { error: error.message }
    return { profile }
  })
