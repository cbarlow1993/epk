import { createServerFn } from '@tanstack/react-start'
import { getSupabaseServerClient } from '~/utils/supabase'
import { pressAssetUpsertSchema } from '~/schemas/press-asset'

export const getPressAssets = createServerFn({ method: 'GET' }).handler(async () => {
  const supabase = getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  const { data } = await supabase.from('press_assets').select('*').eq('profile_id', user.id).order('sort_order')
  return data || []
})

export const upsertPressAsset = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => pressAssetUpsertSchema.parse(data))
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
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
    const supabase = getSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }
    const { error } = await supabase.from('press_assets').delete().eq('id', id).eq('profile_id', user.id)
    if (error) return { error: error.message }
    return { success: true }
  })
