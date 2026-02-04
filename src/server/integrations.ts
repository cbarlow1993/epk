import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { integrationUpsertSchema, mailchimpSubscribeSchema, embedResolveSchema, CONFIG_SCHEMAS } from '~/schemas/integrations'
import type { IntegrationType } from '~/schemas/integrations'
import { withAuth, withAuthOrNull } from './utils'

const SENSITIVE_KEYS = new Set(['api_key'])

function stripSensitive(config: Record<string, unknown>): Record<string, unknown> {
  const clean: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(config)) {
    if (!SENSITIVE_KEYS.has(k)) clean[k] = v
  }
  return clean
}

export const getIntegrations = createServerFn({ method: 'GET' }).handler(async () => {
  const { supabase, user } = await withAuthOrNull()
  if (!user) return []

  const { data } = await supabase
    .from('integrations')
    .select('*')
    .eq('profile_id', user.id)
    .order('sort_order')

  return data || []
})

export const getPublicIntegrations = createServerFn({ method: 'GET' })
  .inputValidator((data: unknown) => z.string().uuid().parse(data))
  .handler(async ({ data: profileId }) => {
    const supabase = (await withAuthOrNull()).supabase

    const { data } = await supabase
      .from('integrations')
      .select('*')
      .eq('profile_id', profileId)
      .eq('enabled', true)
      .order('sort_order')

    if (!data) return []

    return data.map((row) => ({
      ...row,
      config: stripSensitive(row.config as Record<string, unknown>),
    }))
  })

export const upsertIntegration = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => integrationUpsertSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabase, user } = await withAuth()

    const configSchema = CONFIG_SCHEMAS[data.type as IntegrationType]
    const configResult = configSchema.safeParse(data.config)
    if (!configResult.success) {
      return { error: configResult.error.issues[0]?.message || 'Invalid config' }
    }

    const { data: row, error } = await supabase
      .from('integrations')
      .upsert(
        {
          profile_id: user.id,
          type: data.type,
          enabled: data.enabled,
          config: configResult.data,
          sort_order: data.sort_order ?? 0,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'profile_id,type' }
      )
      .select()
      .single()

    if (error) return { error: error.message }
    return { data: row }
  })

export const deleteIntegration = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => z.object({ type: z.string() }).parse(data))
  .handler(async ({ data }) => {
    const { supabase, user } = await withAuth()

    const { error } = await supabase
      .from('integrations')
      .delete()
      .eq('profile_id', user.id)
      .eq('type', data.type)

    if (error) return { error: error.message }
    return { success: true }
  })

export const resolveEmbed = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => embedResolveSchema.parse(data))
  .handler(async ({ data }) => {
    await withAuth()

    const { url, platform } = data

    try {
      if (platform === 'spotify') {
        const parsed = new URL(url)
        if (!parsed.hostname.includes('spotify.com')) {
          return { error: 'Not a valid Spotify URL' }
        }
        const embedUrl = `https://open.spotify.com/embed${parsed.pathname}`
        const embedHtml = `<iframe src="${embedUrl}" width="100%" height="352" frameborder="0" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>`
        return { data: { embed_url: url, embed_html: embedHtml } }
      }

      const oembedUrls: Record<string, string> = {
        soundcloud: `https://soundcloud.com/oembed?format=json&url=${encodeURIComponent(url)}`,
        mixcloud: `https://www.mixcloud.com/oembed/?format=json&url=${encodeURIComponent(url)}`,
      }

      const oembedUrl = oembedUrls[platform]
      if (!oembedUrl) return { error: 'Unsupported platform' }

      const res = await fetch(oembedUrl)
      if (!res.ok) return { error: `Failed to resolve embed (${res.status})` }

      const json = await res.json() as { html?: string }
      if (!json.html) return { error: 'No embed HTML returned' }

      return { data: { embed_url: url, embed_html: json.html } }
    } catch {
      return { error: 'Failed to resolve embed URL' }
    }
  })

export const subscribeMailchimp = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => mailchimpSubscribeSchema.parse(data))
  .handler(async ({ data }) => {
    const supabase = (await withAuthOrNull()).supabase

    const { data: integration } = await supabase
      .from('integrations')
      .select('config')
      .eq('profile_id', data.profileId)
      .eq('type', 'mailchimp')
      .eq('enabled', true)
      .single()

    if (!integration) return { error: 'Newsletter signup not available' }

    const config = integration.config as { api_key: string; audience_id: string }
    if (!config.api_key || !config.audience_id) return { error: 'Newsletter not configured' }

    const dc = config.api_key.split('-').pop()
    const mcUrl = `https://${dc}.api.mailchimp.com/3.0/lists/${config.audience_id}/members`

    try {
      const res = await fetch(mcUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.api_key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email_address: data.email,
          status: 'subscribed',
        }),
      })

      if (!res.ok) {
        const body = await res.json() as { title?: string }
        if (body.title === 'Member Exists') {
          return { data: { already_subscribed: true } }
        }
        return { error: 'Failed to subscribe. Please try again.' }
      }

      return { data: { subscribed: true } }
    } catch {
      return { error: 'Failed to subscribe. Please try again.' }
    }
  })
