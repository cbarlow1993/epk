import { createServerFn } from '@tanstack/react-start'
import { eventUpsertSchema } from '~/schemas/event'
import { getListItems, upsertListItem, deleteListItem, reorderListItems, deleteIdSchema, reorderSchema } from './list-helpers'

export const getEvents = createServerFn({ method: 'GET' }).handler(() => getListItems('events'))

export const upsertEvent = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => eventUpsertSchema.parse(data))
  .handler(({ data }) => upsertListItem('events', 'event', data as Record<string, unknown>))

export const deleteEvent = createServerFn({ method: 'POST' })
  .inputValidator((id: unknown) => deleteIdSchema.parse(id))
  .handler(({ data: id }) => deleteListItem('events', id))

export const reorderEvents = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => reorderSchema.parse(data))
  .handler(({ data }) => reorderListItems('events', data.ids))
