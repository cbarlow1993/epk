import { z } from 'zod'

export const MIX_CATEGORIES = [
  'commercial', 'melodic', 'progressive', 'tech-house', 'deep-house', 'other',
] as const

export const mixUpsertSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1, 'Title is required').max(200, 'Max 200 characters'),
  url: z.string().url('Must be a valid URL'),
  category: z.enum(MIX_CATEGORIES, { message: 'Select a valid category' }),
  thumbnail_url: z.string().url().optional(),
  sort_order: z.number().int().min(0).optional(),
})

export type MixUpsert = z.infer<typeof mixUpsertSchema>
