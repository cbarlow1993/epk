import { z } from 'zod'

export const SUPPORTED_PLATFORMS = [
  'soundcloud', 'spotify', 'mixcloud', 'youtube', 'bandcamp', 'other',
] as const

export const mixUpsertSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1, 'Title is required').max(200, 'Max 200 characters'),
  url: z.string().url('Must be a valid URL'),
  category: z.string().min(1, 'Category is required').max(50, 'Max 50 characters'),
  thumbnail_url: z.string().url().optional(),
  sort_order: z.number().int().min(0).optional(),
  platform: z.string().nullable().optional(),
  embed_html: z.string().nullable().optional(),
  description: z.string().max(1000).optional().or(z.literal('')),
  image_url: z.string().url().optional().or(z.literal('')),
})

export type MixUpsert = z.infer<typeof mixUpsertSchema>
