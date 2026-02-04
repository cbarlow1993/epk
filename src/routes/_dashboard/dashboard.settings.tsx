import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { getProfile } from '~/server/profile'
import type { ProfileRow } from '~/types/database'
import { createCheckoutSession, createPortalSession } from '~/server/billing'
import { addCustomDomain, removeCustomDomain, checkDomainStatus } from '~/server/domains'
import { SETTINGS_CARD } from '~/components/forms'
import { updateProfile } from '~/server/profile'

export const Route = createFileRoute('/_dashboard/dashboard/settings')({
  loader: () => getProfile(),
  component: SettingsPage,
})

function SettingsPage() {
  const profile = Route.useLoaderData()
  const [billingLoading, setBillingLoading] = useState(false)
  const [billingError, setBillingError] = useState('')

  const redirectToBilling = async (action: () => Promise<Record<string, unknown>>) => {
    setBillingLoading(true)
    setBillingError('')
    try {
      const result = await action()
      if ('url' in result && typeof result.url === 'string') {
        window.location.href = result.url
      } else if ('error' in result && typeof result.error === 'string') {
        setBillingError(result.error)
        setBillingLoading(false)
      }
    } catch {
      setBillingError('Something went wrong. Please try again.')
      setBillingLoading(false)
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-display font-semibold tracking-tight mb-8">Settings</h1>

      <div className="space-y-8 max-w-2xl">
        {/* Account Info */}
        <div className={SETTINGS_CARD}>
          <h2 className="font-medium text-text-secondary text-sm mb-4">Account</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-text-secondary">Plan</span>
              <span className="capitalize font-bold">{profile?.tier || 'free'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">EPK URL</span>
              <span className="font-mono text-accent">/{profile?.slug}</span>
            </div>
            {profile?.custom_domain && (
              <div className="flex justify-between">
                <span className="text-text-secondary">Custom Domain</span>
                <span className="font-mono">{profile.custom_domain}</span>
              </div>
            )}
          </div>
        </div>

        {/* Billing */}
        <div className={SETTINGS_CARD}>
          <h2 className="font-medium text-text-secondary text-sm mb-4">Billing</h2>
          {profile?.tier === 'pro' ? (
            <div>
              <p className="text-sm text-text-secondary mb-4">You're on the <span className="text-accent font-bold">Pro</span> plan.</p>
              <button
                type="button"
                onClick={() => redirectToBilling(createPortalSession)}
                disabled={billingLoading}
                className="bg-bg hover:bg-border disabled:opacity-30 text-text-primary text-sm font-medium px-6 py-2 rounded-lg transition-colors"
              >
                {billingLoading ? 'Loading...' : 'Manage Subscription'}
              </button>
            </div>
          ) : (
            <div>
              <p className="text-sm text-text-secondary mb-4">You're on the <span className="font-bold">Free</span> plan. Upgrade for custom domains, remove branding, and more.</p>
              <button
                type="button"
                onClick={() => redirectToBilling(createCheckoutSession)}
                disabled={billingLoading}
                className="bg-accent hover:bg-accent/80 disabled:opacity-30 text-white text-sm font-medium px-6 py-2 rounded-lg transition-colors"
              >
                {billingLoading ? 'Loading...' : 'Upgrade to Pro'}
              </button>
            </div>
          )}
          {billingError && <p className="text-xs text-red-500 mt-3">{billingError}</p>}
        </div>

        {/* Branding */}
        <BrandingSection profile={profile} />

        {/* Custom Domain */}
        <CustomDomainSection profile={profile} />
      </div>
    </div>
  )
}

function BrandingSection({ profile }: { profile: ProfileRow | null }) {
  const [faviconUrl, setFaviconUrl] = useState(profile?.favicon_url || '')
  const [hideBranding, setHideBranding] = useState(profile?.hide_platform_branding || false)
  const [metaDescription, setMetaDescription] = useState(profile?.meta_description || '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  if (profile?.tier !== 'pro') {
    return (
      <div className={SETTINGS_CARD}>
        <h2 className="font-medium text-text-secondary text-sm mb-4">Branding</h2>
        <p className="text-text-secondary text-sm">Upgrade to Pro to customise branding.</p>
      </div>
    )
  }

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    setError('')
    const result = await updateProfile({
      data: {
        favicon_url: faviconUrl || undefined,
        hide_platform_branding: hideBranding,
        meta_description: metaDescription || undefined,
      },
    })
    setSaving(false)
    if (result && 'error' in result && result.error) {
      setError(result.error as string)
    } else {
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }
  }

  return (
    <div className={SETTINGS_CARD}>
      <h2 className="font-medium text-text-secondary text-sm mb-4">Branding</h2>
      <div className="space-y-4">
        <div>
          <label className="text-xs text-text-secondary block mb-1">Favicon URL</label>
          <input
            type="text"
            value={faviconUrl}
            onChange={(e) => setFaviconUrl(e.target.value)}
            placeholder="https://example.com/favicon.ico"
            className="w-full bg-bg border border-border rounded-lg px-4 py-2 text-text-primary text-sm focus:border-accent focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="hide-branding"
            checked={hideBranding}
            onChange={(e) => setHideBranding(e.target.checked)}
            className="accent-accent w-4 h-4"
          />
          <label htmlFor="hide-branding" className="text-sm text-text-secondary cursor-pointer">
            Hide &ldquo;Built with DJ EPK&rdquo; footer
          </label>
        </div>
        <div>
          <label className="text-xs text-text-secondary block mb-1">
            Custom Meta Description <span className="text-text-secondary/50">({metaDescription.length}/300)</span>
          </label>
          <textarea
            value={metaDescription}
            onChange={(e) => setMetaDescription(e.target.value.slice(0, 300))}
            placeholder="Custom description for search engines and social sharing..."
            rows={3}
            className="w-full bg-bg border border-border rounded-lg px-4 py-2 text-text-primary text-sm focus:border-accent focus:outline-none resize-none"
          />
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="bg-accent hover:bg-accent/80 disabled:opacity-30 text-white text-sm font-medium px-6 py-2 rounded-lg transition-colors"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
          {saved && <span className="text-xs text-green-600">Saved!</span>}
          {error && <span className="text-xs text-red-500">{error}</span>}
        </div>
      </div>
    </div>
  )
}

function CustomDomainSection({ profile }: { profile: ProfileRow | null }) {
  const [domain, setDomain] = useState(profile?.custom_domain || '')
  const [status, setStatus] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleAdd = async () => {
    setLoading(true)
    const result = await addCustomDomain({ data: { domain } })
    setLoading(false)
    if ('error' in result) {
      setStatus(result.error as string)
    } else {
      setStatus('Domain added. Configure your DNS: CNAME → cname.vercel-dns.com')
    }
  }

  const handleRemove = async () => {
    setLoading(true)
    await removeCustomDomain()
    setLoading(false)
    setDomain('')
    setStatus('Domain removed.')
  }

  const handleCheck = async () => {
    const result = await checkDomainStatus({ data: { domain } })
    setStatus(result.configured ? 'Domain is verified and active.' : 'Domain not yet verified. Check your DNS settings.')
  }

  if (profile?.tier !== 'pro') {
    return (
      <div className={SETTINGS_CARD}>
        <h2 className="font-medium text-text-secondary text-sm mb-4">Custom Domain</h2>
        <p className="text-text-secondary text-sm">Upgrade to Pro to use a custom domain.</p>
      </div>
    )
  }

  return (
    <div className={SETTINGS_CARD}>
      <h2 className="font-medium text-text-secondary text-sm mb-4">Custom Domain</h2>
      {profile?.custom_domain ? (
        <div className="space-y-3">
          <p className="text-sm">Current domain: <span className="font-mono text-accent">{profile.custom_domain}</span></p>
          <div className="flex gap-2">
            <button type="button" onClick={handleCheck} className="text-xs text-text-secondary hover:text-text-primary transition-colors">Check status</button>
            <button type="button" onClick={handleRemove} disabled={loading} className="text-xs text-red-500 hover:text-red-400 transition-colors">Remove</button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <input
            type="text"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="yourdomain.com"
            className="w-full bg-bg border border-border rounded-lg px-4 py-2 text-text-primary text-sm focus:border-accent focus:outline-none"
          />
          <button
            type="button"
            onClick={handleAdd}
            disabled={!domain || loading}
            className="bg-accent hover:bg-accent/80 disabled:opacity-30 text-white text-sm font-medium px-6 py-2 rounded-lg transition-colors"
          >
            {loading ? 'Adding...' : 'Add Domain'}
          </button>
        </div>
      )}
      {status && <p className="text-xs text-text-secondary mt-3">{status}</p>}
      <div className="mt-4 text-xs text-text-secondary">
        <p className="font-bold mb-1">DNS Configuration:</p>
        <p>Add a CNAME record pointing your domain to <code className="text-accent">cname.vercel-dns.com</code></p>
      </div>
    </div>
  )
}
