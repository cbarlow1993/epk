import { createServerFn } from '@tanstack/react-start'
import { mixUpsertSchema } from '~/schemas/mix'
import { getListItems, upsertListItem, deleteListItem, reorderListItems, deleteIdSchema, reorderSchema } from './list-helpers'
import { withAuthOrNull } from './utils'

export const getMixes = createServerFn({ method: 'GET' }).handler(() => getListItems('mixes'))

export const getMixCategories = createServerFn({ method: 'GET' }).handler(async () => {
  const { supabase, user } = await withAuthOrNull()
  if (!user) return []
  const { data } = await supabase
    .from('mixes')
    .select('category')
    .eq('profile_id', user.id)
    .not('category', 'is', null)
    .order('category')
  if (!data) return []
  return [...new Set(data.map((r: { category: string }) => r.category).filter(Boolean))]
})

export const upsertMix = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => mixUpsertSchema.parse(data))
  .handler(({ data }) => upsertListItem('mixes', 'mix', data as Record<string, unknown>))

export const deleteMix = createServerFn({ method: 'POST' })
  .inputValidator((id: unknown) => deleteIdSchema.parse(id))
  .handler(({ data: id }) => deleteListItem('mixes', id))

export const reorderMixes = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => reorderSchema.parse(data))
  .handler(({ data }) => reorderListItems('mixes', data.ids))
