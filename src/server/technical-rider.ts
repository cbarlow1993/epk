import { createServerFn } from '@tanstack/react-start'
import { getSupabaseServerClient } from '~/utils/supabase'
import { getRequest } from '@tanstack/react-start/server'

export const getTechnicalRider = createServerFn({ method: 'GET' }).handler(async () => {
  const request = getRequest()
  const { supabase } = getSupabaseServerClient(request)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('technical_rider').select('*').eq('profile_id', user.id).single()
  return data
})

export const updateTechnicalRider = createServerFn({ method: 'POST' })
  .inputValidator((data: { preferred_setup?: string; alternative_setup?: string }) => data)
  .handler(async ({ data }) => {
    const request = getRequest()
    const { supabase } = getSupabaseServerClient(request)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }
    const { data: rider, error } = await supabase.from('technical_rider').update(data).eq('profile_id', user.id).select().single()
    if (error) return { error: error.message }
    return { rider }
  })
