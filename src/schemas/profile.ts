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
  hero_video_url: z.string().url('Invalid URL').optional().or(z.literal('')),
  animate_sections: z.boolean().optional(),
  bio_layout: z.enum(['two-column', 'single-column']).optional(),
  press_kit_url: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  // Theme — Typography (4 tiers)
  theme_display_font: z.string().max(100).optional().nullable(),
  theme_display_size: z.string().max(10).optional().nullable(),
  theme_display_weight: z.string().max(3).optional().nullable(),
  theme_heading_font: z.string().max(100).optional().nullable(),
  theme_heading_size: z.string().max(10).optional().nullable(),
  theme_heading_weight: z.string().max(3).optional().nullable(),
  theme_subheading_font: z.string().max(100).optional().nullable(),
  theme_subheading_size: z.string().max(10).optional().nullable(),
  theme_subheading_weight: z.string().max(3).optional().nullable(),
  theme_body_font: z.string().max(100).optional().nullable(),
  theme_body_size: z.string().max(10).optional().nullable(),
  theme_body_weight: z.string().max(3).optional().nullable(),
  // Theme — Colors
  theme_text_color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional().nullable(),
  theme_heading_color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional().nullable(),
  theme_link_color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional().nullable(),
  theme_card_bg: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional().nullable(),
  theme_border_color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional().nullable(),
  // Theme — Spacing & Layout
  theme_section_padding: z.enum(['compact', 'default', 'spacious']).optional().nullable(),
  theme_content_width: z.enum(['narrow', 'default', 'wide']).optional().nullable(),
  theme_card_radius: z.enum(['none', 'sm', 'md', 'lg', 'full']).optional().nullable(),
  theme_element_gap: z.enum(['tight', 'default', 'relaxed']).optional().nullable(),
  // Theme — Buttons & Links
  theme_button_style: z.enum(['rounded', 'square', 'pill']).optional().nullable(),
  theme_link_style: z.enum(['underline', 'none', 'hover-underline']).optional().nullable(),
  // Theme — Effects
  theme_card_border: z.enum(['none', 'subtle', 'solid']).optional().nullable(),
  theme_shadow: z.enum(['none', 'sm', 'md', 'lg']).optional().nullable(),
  theme_divider_style: z.enum(['none', 'line', 'accent', 'gradient']).optional().nullable(),
  // Theme — Custom Fonts
  theme_custom_fonts: z.array(z.object({
    name: z.string().max(100),
    url: z.string().url(),
    weight: z.string().max(3),
  })).max(4).optional().nullable(),
})

export type ProfileUpdate = z.infer<typeof profileUpdateSchema>
