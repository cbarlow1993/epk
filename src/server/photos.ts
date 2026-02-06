import { createServerFn } from '@tanstack/react-start'
import { photoUpsertSchema } from '~/schemas/photo'
import { getListItems, upsertListItem, deleteListItem, reorderListItems, deleteIdSchema, reorderSchema } from './list-helpers'
import { withAuth } from './utils'

const MAX_PHOTOS = 20

export const getPhotos = createServerFn({ method: 'GET' }).handler(() => getListItems('photos'))

export const upsertPhoto = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => photoUpsertSchema.parse(data))
  .handler(async ({ data }) => {
    // Enforce photo limit on inserts (not updates)
    if (!data.id) {
      const { supabase, user } = await withAuth()
      const { count } = await supabase
        .from('photos')
        .select('*', { count: 'exact', head: true })
        .eq('profile_id', user.id)
      if (count !== null && count >= MAX_PHOTOS) {
        return { error: `Maximum of ${MAX_PHOTOS} photos reached` }
      }
    }
    return upsertListItem('photos', 'photo', data as Record<string, unknown>)
  })

export const deletePhoto = createServerFn({ method: 'POST' })
  .inputValidator((id: unknown) => deleteIdSchema.parse(id))
  .handler(({ data: id }) => deleteListItem('photos', id))

export const reorderPhotos = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => reorderSchema.parse(data))
  .handler(({ data }) => reorderListItems('photos', data.ids))
