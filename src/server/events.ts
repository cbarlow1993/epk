import { createServerFn } from '@tanstack/react-start'
import { getSupabaseServerClient } from '~/utils/supabase'
import { getRequest } from '@tanstack/react-start/server'

export const getEvents = createServerFn({ method: 'GET' }).handler(async () => {
  const request = getRequest()
  const { supabase } = getSupabaseServerClient(request)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  const { data } = await supabase.from('events').select('*').eq('profile_id', user.id).order('sort_order')
  return data || []
})

export const upsertEvent = createServerFn({ method: 'POST' })
  .inputValidator((data: { id?: string; name: string; image_url?: string; link_url?: string; sort_order?: number }) => data)
  .handler(async ({ data }) => {
    const request = getRequest()
    const { supabase } = getSupabaseServerClient(request)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }
    if (data.id) {
      const { data: event, error } = await supabase.from('events')
        .update({ name: data.name, image_url: data.image_url, link_url: data.link_url, sort_order: data.sort_order })
        .eq('id', data.id).eq('profile_id', user.id).select().single()
      if (error) return { error: error.message }
      return { event }
    }
    const { data: event, error } = await supabase.from('events')
      .insert({ profile_id: user.id, name: data.name, image_url: data.image_url, link_url: data.link_url, sort_order: data.sort_order ?? 0 })
      .select().single()
    if (error) return { error: error.message }
    return { event }
  })

export const deleteEvent = createServerFn({ method: 'POST' })
  .inputValidator((id: string) => id)
  .handler(async ({ data: id }) => {
    const request = getRequest()
    const { supabase } = getSupabaseServerClient(request)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }
    const { error } = await supabase.from('events').delete().eq('id', id).eq('profile_id', user.id)
    if (error) return { error: error.message }
    return { success: true }
  })

export const reorderEvents = createServerFn({ method: 'POST' })
  .inputValidator((data: { ids: string[] }) => data)
  .handler(async ({ data }) => {
    const request = getRequest()
    const { supabase } = getSupabaseServerClient(request)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }
    for (let i = 0; i < data.ids.length; i++) {
      await supabase.from('events').update({ sort_order: i }).eq('id', data.ids[i]).eq('profile_id', user.id)
    }
    return { success: true }
  })
