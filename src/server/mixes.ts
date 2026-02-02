import { createServerFn } from '@tanstack/react-start'
import { getSupabaseServerClient } from '~/utils/supabase'
import { getRequest } from '@tanstack/react-start/server'

export const getMixes = createServerFn({ method: 'GET' }).handler(async () => {
  const request = getRequest()
  const { supabase } = getSupabaseServerClient(request)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  const { data } = await supabase.from('mixes').select('*').eq('profile_id', user.id).order('sort_order')
  return data || []
})

export const upsertMix = createServerFn({ method: 'POST' })
  .inputValidator((data: { id?: string; title: string; url: string; category: string; thumbnail_url?: string; sort_order?: number }) => data)
  .handler(async ({ data }) => {
    const request = getRequest()
    const { supabase } = getSupabaseServerClient(request)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    if (data.id) {
      const { data: mix, error } = await supabase.from('mixes')
        .update({ title: data.title, url: data.url, category: data.category, thumbnail_url: data.thumbnail_url, sort_order: data.sort_order })
        .eq('id', data.id).eq('profile_id', user.id).select().single()
      if (error) return { error: error.message }
      return { mix }
    }

    const { data: mix, error } = await supabase.from('mixes')
      .insert({ profile_id: user.id, title: data.title, url: data.url, category: data.category, thumbnail_url: data.thumbnail_url, sort_order: data.sort_order ?? 0 })
      .select().single()
    if (error) return { error: error.message }
    return { mix }
  })

export const deleteMix = createServerFn({ method: 'POST' })
  .inputValidator((id: string) => id)
  .handler(async ({ data: id }) => {
    const request = getRequest()
    const { supabase } = getSupabaseServerClient(request)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }
    const { error } = await supabase.from('mixes').delete().eq('id', id).eq('profile_id', user.id)
    if (error) return { error: error.message }
    return { success: true }
  })

export const reorderMixes = createServerFn({ method: 'POST' })
  .inputValidator((data: { ids: string[] }) => data)
  .handler(async ({ data }) => {
    const request = getRequest()
    const { supabase } = getSupabaseServerClient(request)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }
    for (let i = 0; i < data.ids.length; i++) {
      await supabase.from('mixes').update({ sort_order: i }).eq('id', data.ids[i]).eq('profile_id', user.id)
    }
    return { success: true }
  })
