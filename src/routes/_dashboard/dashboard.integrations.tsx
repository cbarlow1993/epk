import { createFileRoute } from '@tanstack/react-router'
import { getIntegrations, upsertIntegration, resolveEmbed } from '~/server/integrations'
import { IntegrationCard } from '~/components/IntegrationCard'
import type { IntegrationType } from '~/schemas/integrations'

export const Route = createFileRoute('/_dashboard/dashboard/integrations')({
  loader: () => getIntegrations(),
  component: IntegrationsPage,
})

interface IntegrationRow {
  id: string
  type: string
  enabled: boolean
  config: Record<string, string>
  sort_order: number
}

const ANALYTICS_INTEGRATIONS: { type: IntegrationType; title: string; fields: { name: string; label: string; type: 'text' | 'password' | 'url' | 'textarea'; placeholder?: string }[] }[] = [
  {
    type: 'google_analytics',
    title: 'Google Analytics',
    fields: [
      { name: 'measurement_id', label: 'Measurement ID', type: 'text', placeholder: 'G-XXXXXXXXXX' },
    ],
  },
  {
    type: 'plausible',
    title: 'Plausible Analytics',
    fields: [
      { name: 'domain', label: 'Domain', type: 'text', placeholder: 'myepk.bio' },
    ],
  },
]

const EMBED_INTEGRATIONS: { type: IntegrationType; title: string }[] = [
  { type: 'soundcloud', title: 'SoundCloud' },
  { type: 'spotify', title: 'Spotify' },
  { type: 'mixcloud', title: 'Mixcloud' },
]

const MARKETING_INTEGRATIONS: { type: IntegrationType; title: string; fields: { name: string; label: string; type: 'text' | 'password' | 'url' | 'textarea'; placeholder?: string }[] }[] = [
  {
    type: 'mailchimp',
    title: 'Mailchimp',
    fields: [
      { name: 'api_key', label: 'API Key', type: 'password', placeholder: 'xxxxxxxx-usXX' },
      { name: 'audience_id', label: 'Audience ID', type: 'text', placeholder: 'e.g. abc1234def' },
      { name: 'form_heading', label: 'Form Heading', type: 'text', placeholder: 'Join my mailing list' },
      { name: 'button_text', label: 'Button Text', type: 'text', placeholder: 'Subscribe' },
    ],
  },
  {
    type: 'custom_embed',
    title: 'Custom Embed',
    fields: [
      { name: 'label', label: 'Section Label', type: 'text', placeholder: 'Newsletter' },
      { name: 'embed_html', label: 'Embed HTML', type: 'textarea', placeholder: '<form ...>' },
    ],
  },
]

function IntegrationsPage() {
  const integrations = Route.useLoaderData() as IntegrationRow[]

  const getExisting = (type: string) =>
    integrations.find((i) => i.type === type)

  const handleSave = async (type: IntegrationType, config: Record<string, string>, enabled: boolean) => {
    const result = await upsertIntegration({
      data: { type, config, enabled, sort_order: getExisting(type)?.sort_order ?? 0 },
    })
    if ('error' in result && result.error) return { error: result.error as string }
    return {}
  }

  const handleResolveEmbed = (platform: IntegrationType) => async (url: string) => {
    const result = await resolveEmbed({
      data: { url, platform: platform as 'soundcloud' | 'spotify' | 'mixcloud' },
    })
    if ('error' in result && result.error) return { error: result.error as string }
    if ('data' in result && result.data) return { data: result.data as { embed_html: string } }
    return { error: 'Unknown error' }
  }

  return (
    <div>
      <h1 className="font-display font-extrabold text-2xl tracking-tight uppercase mb-8">
        Integrations
      </h1>

      {/* Analytics */}
      <h2 className="text-xs font-semibold uppercase tracking-wider text-text-secondary mb-4">Analytics</h2>
      <div className="space-y-4 mb-10">
        {ANALYTICS_INTEGRATIONS.map((integration) => {
          const existing = getExisting(integration.type)
          return (
            <IntegrationCard
              key={integration.type}
              title={integration.title}
              type={integration.type}
              fields={integration.fields}
              initialConfig={(existing?.config as Record<string, string>) || {}}
              initialEnabled={existing?.enabled || false}
              onSave={(config, enabled) => handleSave(integration.type, config, enabled)}
            />
          )
        })}
      </div>

      {/* Music Embeds */}
      <h2 className="text-xs font-semibold uppercase tracking-wider text-text-secondary mb-4">Music Embeds</h2>
      <div className="space-y-4 mb-10">
        {EMBED_INTEGRATIONS.map((integration) => {
          const existing = getExisting(integration.type)
          const existingConfig = (existing?.config || {}) as Record<string, string>
          return (
            <IntegrationCard
              key={integration.type}
              title={integration.title}
              type={integration.type}
              fields={[
                { name: 'embed_url', label: 'Track / Playlist URL', type: 'url', placeholder: `https://${integration.type}.com/...` },
              ]}
              initialConfig={existingConfig}
              initialEnabled={existing?.enabled || false}
              onSave={(config, enabled) => handleSave(integration.type, config, enabled)}
              onResolveEmbed={handleResolveEmbed(integration.type)}
              previewHtml={existingConfig.embed_html}
            />
          )
        })}
      </div>

      {/* Marketing */}
      <h2 className="text-xs font-semibold uppercase tracking-wider text-text-secondary mb-4">Marketing</h2>
      <div className="space-y-4 mb-10">
        {MARKETING_INTEGRATIONS.map((integration) => {
          const existing = getExisting(integration.type)
          return (
            <IntegrationCard
              key={integration.type}
              title={integration.title}
              type={integration.type}
              fields={integration.fields}
              initialConfig={(existing?.config as Record<string, string>) || {}}
              initialEnabled={existing?.enabled || false}
              onSave={(config, enabled) => handleSave(integration.type, config, enabled)}
            />
          )
        })}
      </div>
    </div>
  )
}
