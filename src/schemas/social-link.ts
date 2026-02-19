import { z } from 'zod'

export const SOCIAL_PLATFORMS = [
  'instagram', 'soundcloud', 'tiktok', 'twitter', 'youtube',
  'spotify', 'facebook', 'mixcloud', 'other',
] as const

/** Platforms shown as fixed fields on the profile page (excludes "other") */
export const FIXED_SOCIAL_PLATFORMS = SOCIAL_PLATFORMS.filter((p) => p !== 'other')

export const SOCIAL_PLATFORM_LABELS: Record<string, string> = {
  instagram: 'Instagram',
  soundcloud: 'SoundCloud',
  tiktok: 'TikTok',
  twitter: 'X (Twitter)',
  youtube: 'YouTube',
  spotify: 'Spotify',
  facebook: 'Facebook',
  mixcloud: 'Mixcloud',
}

export const socialLinkUpsertSchema = z.object({
  id: z.string().uuid().optional(),
  platform: z.enum(SOCIAL_PLATFORMS, { message: 'Select a valid platform' }),
  url: z.string().url('Must be a valid URL'),
  handle: z.string().max(100, 'Max 100 characters'),
  sort_order: z.number().int().min(0).optional(),
})

/** Schema for bulk-saving all social links from the profile page.
 *  Uses z.string() for keys because z.record(z.enum(...)) requires ALL enum
 *  values, but the UI only sends FIXED_SOCIAL_PLATFORMS (excludes 'other'). */
export const socialLinksBulkSchema = z.record(
  z.string(),
  z.string().url('Must be a valid URL').or(z.literal('')),
)

export type SocialLinkUpsert = z.infer<typeof socialLinkUpsertSchema>
export type SocialLinksBulk = z.infer<typeof socialLinksBulkSchema>
