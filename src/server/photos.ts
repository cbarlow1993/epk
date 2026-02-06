import { createServerFn } from '@tanstack/react-start'
import { photoUpsertSchema } from '~/schemas/photo'
import { getListItems, upsertListItem, deleteListItem, reorderListItems, deleteIdSchema, reorderSchema } from './list-helpers'

export const getPhotos = createServerFn({ method: 'GET' }).handler(() => getListItems('photos'))

export const upsertPhoto = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => photoUpsertSchema.parse(data))
  .handler(({ data }) => upsertListItem('photos', 'photo', data as Record<string, unknown>))

export const deletePhoto = createServerFn({ method: 'POST' })
  .inputValidator((id: unknown) => deleteIdSchema.parse(id))
  .handler(({ data: id }) => deleteListItem('photos', id))

export const reorderPhotos = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => reorderSchema.parse(data))
  .handler(({ data }) => reorderListItems('photos', data.ids))
