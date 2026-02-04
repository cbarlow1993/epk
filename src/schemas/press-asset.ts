import { z } from 'zod'

export const ASSET_TYPES = ['photo', 'video', 'logo'] as const

export const pressAssetUpsertSchema = z.object({
  id: z.string().uuid(),
  press_title: z.string().min(1, 'Title is required').max(200, 'Max 200 characters'),
  press_type: z.enum(ASSET_TYPES, { message: 'Select a valid asset type' }),
  sort_order: z.number().int().min(0).optional(),
})

export type PressAssetUpsert = z.infer<typeof pressAssetUpsertSchema>
