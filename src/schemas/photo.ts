import { z } from 'zod'

export const photoUpsertSchema = z.object({
  id: z.string().uuid().optional(),
  image_url: z.string().url('Image URL is required'),
  caption: z.string().max(200, 'Max 200 characters').optional().or(z.literal('')),
  sort_order: z.number().int().min(0).optional(),
})

export type PhotoUpsert = z.infer<typeof photoUpsertSchema>
