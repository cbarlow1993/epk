import { createServerFn } from '@tanstack/react-start'
import { pressAssetUpsertSchema } from '~/schemas/press-asset'
import { getListItems, upsertListItem, deleteListItem, reorderListItems, deleteIdSchema, reorderSchema } from './list-helpers'

export const getPressAssets = createServerFn({ method: 'GET' }).handler(() => getListItems('press_assets'))

export const upsertPressAsset = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => pressAssetUpsertSchema.parse(data))
  .handler(({ data }) => upsertListItem('press_assets', 'asset', data as Record<string, unknown>))

export const deletePressAsset = createServerFn({ method: 'POST' })
  .inputValidator((id: unknown) => deleteIdSchema.parse(id))
  .handler(({ data: id }) => deleteListItem('press_assets', id))

export const reorderPressAssets = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => reorderSchema.parse(data))
  .handler(({ data }) => reorderListItems('press_assets', data.ids))
