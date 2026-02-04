import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { getProfile } from '~/server/profile'
import type { ProfileRow } from '~/types/database'
import { createCheckoutSession, createPortalSession } from '~/server/billing'
import { addCustomDomain, removeCustomDomain, checkDomainStatus } from '~/server/domains'
import { SETTINGS_CARD } from '~/components/forms'

export const Route = createFileRoute('/_dashboard/dashboard/settings')({
  loader: () => getProfile(),
  component: SettingsPage,
})

async function redirectToBilling(action: () => Promise<Record<string, unknown>>) {
  const result = await action()
  if ('url' in result && typeof result.url === 'string') window.location.href = result.url
}

function SettingsPage() {
  const profile = Route.useLoaderData()

  return (
    <div>
      <h1 className="text-2xl font-black uppercase tracking-wider mb-8">Settings</h1>

      <div className="space-y-8 max-w-2xl">
        {/* Account Info */}
        <div className={SETTINGS_CARD}>
          <h2 className="text-sm uppercase tracking-widest font-bold mb-4">Account</h2>
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
          <h2 className="text-sm uppercase tracking-widest font-bold mb-4">Billing</h2>
          {profile?.tier === 'pro' ? (
            <div>
              <p className="text-sm text-text-secondary mb-4">You're on the <span className="text-accent font-bold">Pro</span> plan.</p>
              <button
                type="button"
                onClick={() => redirectToBilling(createPortalSession)}
                className="bg-white/10 hover:bg-white/20 text-white text-sm font-bold uppercase tracking-widest px-6 py-2 rounded-lg transition-colors"
              >
                Manage Subscription
              </button>
            </div>
          ) : (
            <div>
              <p className="text-sm text-text-secondary mb-4">You're on the <span className="font-bold">Free</span> plan. Upgrade for custom domains, remove branding, and more.</p>
              <button
                type="button"
                onClick={() => redirectToBilling(createCheckoutSession)}
                className="bg-accent hover:bg-accent/80 text-white text-sm font-bold uppercase tracking-widest px-6 py-2 rounded-lg transition-colors"
              >
                Upgrade to Pro
              </button>
            </div>
          )}
        </div>

        {/* Custom Domain */}
        <CustomDomainSection profile={profile} />
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
        <h2 className="text-sm uppercase tracking-widest font-bold mb-4">Custom Domain</h2>
        <p className="text-text-secondary text-sm">Upgrade to Pro to use a custom domain.</p>
      </div>
    )
  }

  return (
    <div className={SETTINGS_CARD}>
      <h2 className="text-sm uppercase tracking-widest font-bold mb-4">Custom Domain</h2>
      {profile?.custom_domain ? (
        <div className="space-y-3">
          <p className="text-sm">Current domain: <span className="font-mono text-accent">{profile.custom_domain}</span></p>
          <div className="flex gap-2">
            <button type="button" onClick={handleCheck} className="text-xs text-text-secondary hover:text-white transition-colors">Check status</button>
            <button type="button" onClick={handleRemove} disabled={loading} className="text-xs text-red-400 hover:text-red-300 transition-colors">Remove</button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <input
            type="text"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="yourdomain.com"
            className="w-full bg-dark-bg border border-white/10 rounded-lg px-4 py-2 text-white text-sm focus:border-accent focus:outline-none"
          />
          <button
            type="button"
            onClick={handleAdd}
            disabled={!domain || loading}
            className="bg-accent hover:bg-accent/80 disabled:opacity-30 text-white text-sm font-bold uppercase tracking-widest px-6 py-2 rounded-lg transition-colors"
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
