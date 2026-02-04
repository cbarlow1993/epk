import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { pressAssetUpsertSchema } from '~/schemas/press-asset'
import { reorderSchema } from './list-helpers'
import { withAuth, withAuthOrNull } from './utils'
import { deleteFile } from './files'

export const getPressAssets = createServerFn({ method: 'GET' }).handler(async () => {
  const { supabase, user } = await withAuthOrNull()
  if (!user) return []
  const { data } = await supabase
    .from('files')
    .select('*')
    .eq('profile_id', user.id)
    .eq('is_press_asset', true)
    .order('sort_order')
  return data || []
})

export const upsertPressAsset = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => pressAssetUpsertSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabase, user } = await withAuth()

    const { data: asset, error } = await supabase
      .from('files')
      .update({
        is_press_asset: true,
        press_title: data.press_title,
        press_type: data.press_type,
        sort_order: data.sort_order ?? 0,
      })
      .eq('id', data.id)
      .eq('profile_id', user.id)
      .select()
      .single()

    if (error) return { error: error.message }
    return { asset }
  })

export const deletePressAsset = createServerFn({ method: 'POST' })
  .inputValidator((id: unknown) => z.string().uuid().parse(id))
  .handler(async ({ data: id }) => {
    return deleteFile({ data: { id } })
  })

export const reorderPressAssets = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => reorderSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabase, user } = await withAuth()
    await Promise.all(
      data.ids.map((id, i) =>
        supabase.from('files').update({ sort_order: i }).eq('id', id).eq('profile_id', user.id)
      )
    )
    return { success: true }
  })
