import { createServerFn } from '@tanstack/react-start'
import { getSupabaseServerClient } from '~/utils/supabase'
import { getRequest } from '@tanstack/react-start/server'

export const getPressAssets = createServerFn({ method: 'GET' }).handler(async () => {
  const request = getRequest()
  const { supabase } = getSupabaseServerClient(request)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  const { data } = await supabase.from('press_assets').select('*').eq('profile_id', user.id).order('sort_order')
  return data || []
})

export const upsertPressAsset = createServerFn({ method: 'POST' })
  .inputValidator((data: { id?: string; title: string; file_url: string; type: string; sort_order?: number }) => data)
  .handler(async ({ data }) => {
    const request = getRequest()
    const { supabase } = getSupabaseServerClient(request)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    if (data.id) {
      const { data: asset, error } = await supabase.from('press_assets')
        .update({ title: data.title, file_url: data.file_url, type: data.type, sort_order: data.sort_order })
        .eq('id', data.id).eq('profile_id', user.id).select().single()
      if (error) return { error: error.message }
      return { asset }
    }

    const { data: asset, error } = await supabase.from('press_assets')
      .insert({ profile_id: user.id, title: data.title, file_url: data.file_url, type: data.type, sort_order: data.sort_order ?? 0 })
      .select().single()
    if (error) return { error: error.message }
    return { asset }
  })

export const deletePressAsset = createServerFn({ method: 'POST' })
  .inputValidator((id: string) => id)
  .handler(async ({ data: id }) => {
    const request = getRequest()
    const { supabase } = getSupabaseServerClient(request)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }
    const { error } = await supabase.from('press_assets').delete().eq('id', id).eq('profile_id', user.id)
    if (error) return { error: error.message }
    return { success: true }
  })
