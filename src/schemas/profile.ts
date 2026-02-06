import { z } from 'zod'
import { RESERVED_SLUGS } from '~/utils/constants'
import { editorDataSchema } from './editorData'

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
  bpm_min: z.preprocess(
    (v) => (v === '' || v === null || v === undefined || v === 0 || (typeof v === 'number' && isNaN(v)) ? null : v),
    z.number().int().min(60).max(200).nullable().optional(),
  ),
  bpm_max: z.preprocess(
    (v) => (v === '' || v === null || v === undefined || v === 0 || (typeof v === 'number' && isNaN(v)) ? null : v),
    z.number().int().min(60).max(200).nullable().optional(),
  ),
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
  short_bio: z.string().max(200, 'Max 200 characters').optional(),
  bio: editorDataSchema.optional(),
  favicon_url: z.string().url().optional().or(z.literal('')),
  hide_platform_branding: z.boolean().optional(),
  meta_description: z.string().max(300).optional(),
  template: z.enum(['default', 'minimal', 'festival', 'underground']).optional(),
  og_title: z.string().max(100, 'Max 100 characters').optional().or(z.literal('')),
  og_description: z.string().max(300, 'Max 300 characters').optional().or(z.literal('')),
  og_image_url: z.string().url('Invalid URL').optional().or(z.literal('')),
  twitter_card_type: z.enum(['summary', 'summary_large_image']).optional(),
  section_order: z.array(z.string()).max(10).optional(),
  section_visibility: z.record(z.string(), z.boolean()).optional(),
  mix_category_order: z.array(z.string()).max(50).optional(),
  event_category_order: z.array(z.string()).max(50).optional(),
  hero_style: z.enum(['fullbleed', 'contained', 'minimal']).optional(),
  bio_layout: z.enum(['two-column', 'single-column']).optional(),
  press_kit_url: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  checklist_progress: z.record(z.string(), z.boolean()).optional(),
})

export type ProfileUpdate = z.infer<typeof profileUpdateSchema>
