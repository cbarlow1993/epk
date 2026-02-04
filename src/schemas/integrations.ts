import { z } from 'zod'

export const INTEGRATION_TYPES = [
  'google_analytics', 'plausible',
  'soundcloud', 'spotify', 'mixcloud',
  'mailchimp', 'custom_embed',
] as const

export type IntegrationType = (typeof INTEGRATION_TYPES)[number]

export const googleAnalyticsConfigSchema = z.object({
  measurement_id: z.string().regex(/^G-[A-Z0-9]+$/, 'Must be a valid GA4 Measurement ID (G-XXXXXXX)'),
})

export const plausibleConfigSchema = z.object({
  domain: z.string().min(1, 'Domain is required').max(253),
})

export const embedConfigSchema = z.object({
  embed_url: z.string().url('Must be a valid URL'),
  embed_html: z.string().optional(),
})

export const mailchimpConfigSchema = z.object({
  api_key: z.string().min(1, 'API key is required'),
  audience_id: z.string().min(1, 'Audience ID is required'),
  form_heading: z.string().max(100).default('Join my mailing list'),
  button_text: z.string().max(50).default('Subscribe'),
})

export const customEmbedConfigSchema = z.object({
  embed_html: z.string().min(1, 'Embed HTML is required'),
  label: z.string().max(50).default('Newsletter'),
})

export const CONFIG_SCHEMAS: Record<IntegrationType, z.ZodType> = {
  google_analytics: googleAnalyticsConfigSchema,
  plausible: plausibleConfigSchema,
  soundcloud: embedConfigSchema,
  spotify: embedConfigSchema,
  mixcloud: embedConfigSchema,
  mailchimp: mailchimpConfigSchema,
  custom_embed: customEmbedConfigSchema,
}

export const integrationUpsertSchema = z.object({
  type: z.enum(INTEGRATION_TYPES),
  enabled: z.boolean(),
  config: z.record(z.string(), z.unknown()),
  sort_order: z.number().int().min(0).optional(),
})

export type IntegrationUpsert = z.infer<typeof integrationUpsertSchema>

export const mailchimpSubscribeSchema = z.object({
  profileId: z.string().uuid(),
  email: z.string().email('Invalid email address'),
})

export const embedResolveSchema = z.object({
  url: z.string().url(),
  platform: z.enum(['soundcloud', 'spotify', 'mixcloud']),
})
