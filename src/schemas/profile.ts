import { z } from 'zod'
import { RESERVED_SLUGS } from '~/utils/constants'

export const profileUpdateSchema = z.object({
  display_name: z.string().max(100, 'Max 100 characters').optional(),
  tagline: z.string().max(200, 'Max 200 characters').optional(),
  slug: z
    .string()
    .min(2, 'Slug must be at least 2 characters')
    .max(50, 'Max 50 characters')
    .regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/, 'Lowercase alphanumeric and hyphens only, cannot start/end with hyphen')
    .refine((s) => !RESERVED_SLUGS.has(s), 'This URL is reserved')
    .optional(),
  genres: z.array(z.string().max(50)).max(20, 'Max 20 genres').optional(),
  profile_image_url: z.string().url('Invalid URL').optional().or(z.literal('')),
  hero_image_url: z.string().url('Invalid URL').optional().or(z.literal('')),
  published: z.boolean().optional(),
  accent_color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Must be a valid hex colour (e.g. #3b82f6)')
    .optional(),
  bg_color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Must be a valid hex colour (e.g. #0a0a0f)')
    .optional(),
  font_family: z.string().max(50).optional(),
  bio_left: z.string().max(10000, 'Max 10000 characters').optional(),
  bio_right: z.string().max(10000, 'Max 10000 characters').optional(),
})

export type ProfileUpdate = z.infer<typeof profileUpdateSchema>
