import { z } from 'zod'

export const SOCIAL_PLATFORMS = [
  'instagram', 'soundcloud', 'tiktok', 'twitter', 'youtube',
  'spotify', 'facebook', 'mixcloud', 'other',
] as const

export const socialLinkUpsertSchema = z.object({
  id: z.string().uuid().optional(),
  platform: z.enum(SOCIAL_PLATFORMS, { message: 'Select a valid platform' }),
  url: z.string().url('Must be a valid URL'),
  handle: z.string().max(100, 'Max 100 characters'),
  sort_order: z.number().int().min(0).optional(),
})

export const socialLinkReorderSchema = z.object({
  ids: z.array(z.string().uuid()).min(1),
})

export type SocialLinkUpsert = z.infer<typeof socialLinkUpsertSchema>
