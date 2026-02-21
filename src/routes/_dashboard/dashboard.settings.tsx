import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { getProfile, getUserEmail, updateProfile, updateUserEmail, updateUserPassword } from '~/server/profile'
import type { ProfileRow, DomainOrderRow } from '~/types/database'
import { createCheckoutSession, createPortalSession } from '~/server/billing'
import { addCustomDomain, removeCustomDomain, checkDomainStatus, searchDomain, getDomainOrder, createDomainCheckout, cancelDomainOrder } from '~/server/domains'
import { contactInfoSchema, type ContactInfo } from '~/schemas/domain-order'
import { getIntegrations, upsertIntegration } from '~/server/integrations'
import type { IntegrationType } from '~/schemas/integrations'
import { SETTINGS_CARD, FORM_LABEL, FORM_INPUT, FORM_INPUT_ERROR, BTN_PRIMARY } from '~/components/forms'

export const Route = createFileRoute('/_dashboard/dashboard/settings')({
  loader: async () => {
    const [profile, emailResult, domainResult, integrations] = await Promise.all([
      getProfile(),
      getUserEmail(),
      getDomainOrder(),
      getIntegrations(),
    ])
    return { profile, userEmail: emailResult.email, domainOrder: domainResult.order, integrations }
  },
  component: SettingsPage,
})

function SettingsPage() {
  const { profile, userEmail, domainOrder, integrations } = Route.useLoaderData()
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
      <h1 className="text-2xl font-display font-extrabold tracking-tight uppercase mb-8">Settings</h1>

      <div className="space-y-8 max-w-2xl">
        {/* Profile */}
        <ProfileSection profile={profile} userEmail={userEmail} />

        {/* Security */}
        <SecuritySection />

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
                className="px-4 py-2 text-sm font-semibold uppercase tracking-wider bg-bg text-text-primary hover:bg-border disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
                className={BTN_PRIMARY}
              >
                {billingLoading ? 'Loading...' : 'Upgrade to Pro'}
              </button>
            </div>
          )}
          {billingError && <p className="text-xs text-red-500 mt-3">{billingError}</p>}
        </div>

        {/* Google Analytics */}
        <GoogleAnalyticsSection integrations={integrations as { type: string; enabled: boolean; config: Record<string, string>; sort_order: number }[]} />

        {/* Custom Domain */}
        <CustomDomainSection profile={profile} initialOrder={domainOrder} />
      </div>
    </div>
  )
}

function GoogleAnalyticsSection({ integrations }: { integrations: { type: string; enabled: boolean; config: Record<string, string>; sort_order: number }[] }) {
  const existing = integrations.find((i) => i.type === 'google_analytics')
  const [measurementId, setMeasurementId] = useState(existing?.config?.measurement_id || '')
  const [enabled, setEnabled] = useState(existing?.enabled || false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    setError('')
    const result = await upsertIntegration({
      data: {
        type: 'google_analytics' as IntegrationType,
        config: { measurement_id: measurementId },
        enabled,
        sort_order: existing?.sort_order ?? 0,
      },
    })
    setSaving(false)
    if ('error' in result && result.error) {
      setError(result.error as string)
    } else {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    }
  }

  return (
    <div className={SETTINGS_CARD}>
      <h2 className="font-medium text-text-secondary text-sm mb-4">Google Analytics</h2>
      <div className="space-y-4">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="w-4 h-4 accent-accent"
          />
          <span className="text-sm text-text-secondary">Enable on public EPK</span>
        </label>
        <div>
          <label className={FORM_LABEL}>Measurement ID</label>
          <input
            type="text"
            value={measurementId}
            onChange={(e) => setMeasurementId(e.target.value)}
            placeholder="G-XXXXXXXXXX"
            className={FORM_INPUT}
          />
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className={BTN_PRIMARY}
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
          {saved && <span className="text-xs text-green-400">Saved!</span>}
          {error && <span className="text-xs text-red-500">{error}</span>}
        </div>
      </div>
    </div>
  )
}

function ProfileSection({ profile, userEmail }: { profile: ProfileRow | null; userEmail: string }) {
  const [displayName, setDisplayName] = useState(profile?.display_name || '')
  const [email, setEmail] = useState(userEmail)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    setError('')

    // Update display name if changed
    if (displayName !== (profile?.display_name || '')) {
      const result = await updateProfile({ data: { display_name: displayName } })
      if (result && 'error' in result && result.error) {
        setError(result.error as string)
        setSaving(false)
        return
      }
    }

    // Update email if changed
    if (email !== userEmail) {
      const result = await updateUserEmail({ data: { email } })
      if (result && 'error' in result && result.error) {
        setError(result.error as string)
        setSaving(false)
        return
      }
    }

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const isDirty = displayName !== (profile?.display_name || '') || email !== userEmail

  return (
    <div className={SETTINGS_CARD}>
      <h2 className="font-medium text-text-secondary text-sm mb-4">Profile</h2>
      <div className="space-y-4">
        <div>
          <label className={FORM_LABEL}>Display Name</label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your name"
            className={FORM_INPUT}
          />
        </div>
        <div>
          <label className={FORM_LABEL}>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className={FORM_INPUT}
          />
          <p className="text-xs text-text-secondary/60 mt-1">A confirmation email will be sent to your new address.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !isDirty}
            className={BTN_PRIMARY}
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
          {saved && <span className="text-xs text-green-400">{email !== userEmail ? 'Saved! Check your email to confirm the change.' : 'Saved!'}</span>}
          {error && <span className="text-xs text-red-500">{error}</span>}
        </div>
      </div>
    </div>
  )
}

function SecuritySection() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async () => {
    setError('')
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setSaving(true)
    setSaved(false)
    const result = await updateUserPassword({ data: { password } })
    setSaving(false)

    if (result && 'error' in result && result.error) {
      setError(result.error as string)
    } else {
      setSaved(true)
      setPassword('')
      setConfirmPassword('')
      setTimeout(() => setSaved(false), 3000)
    }
  }

  const isDirty = password.length > 0 || confirmPassword.length > 0

  return (
    <div className={SETTINGS_CARD}>
      <h2 className="font-medium text-text-secondary text-sm mb-4">Security</h2>
      <div className="space-y-4">
        <div>
          <label className={FORM_LABEL}>New Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className={FORM_INPUT}
          />
        </div>
        <div>
          <label className={FORM_LABEL}>Confirm Password</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
            className={FORM_INPUT}
          />
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !isDirty}
            className={BTN_PRIMARY}
          >
            {saving ? 'Updating...' : 'Update Password'}
          </button>
          {saved && <span className="text-xs text-green-400">Password updated!</span>}
          {error && <span className="text-xs text-red-500">{error}</span>}
        </div>
      </div>
    </div>
  )
}

type SearchResult = {
  domain: string
  available: boolean
  purchasePrice: number
  renewalPrice: number
  years: number
}

function CustomDomainSection({ profile, initialOrder }: { profile: ProfileRow | null; initialOrder: DomainOrderRow | null }) {
  const [tab, setTab] = useState<'byod' | 'buy'>('byod')
  const [domainOrder, setDomainOrder] = useState<DomainOrderRow | null>(initialOrder)

  if (profile?.tier !== 'pro') {
    return (
      <div className={SETTINGS_CARD}>
        <h2 className="font-medium text-text-secondary text-sm mb-4">Custom Domain</h2>
        <p className="text-text-secondary text-sm">Upgrade to Pro to use a custom domain.</p>
      </div>
    )
  }

  if (domainOrder && ['active', 'purchasing', 'renewal_failed', 'failed'].includes(domainOrder.status)) {
    return <DomainOrderStatus order={domainOrder} onRemove={() => setDomainOrder(null)} />
  }

  return (
    <div className={SETTINGS_CARD}>
      <h2 className="font-medium text-text-secondary text-sm mb-4">Custom Domain</h2>

      <div className="flex gap-4 mb-6 border-b border-border">
        <button
          type="button"
          onClick={() => setTab('byod')}
          className={`pb-2 text-sm font-medium transition-colors ${
            tab === 'byod'
              ? 'text-text-primary border-b-2 border-accent'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          Use your own
        </button>
        <button
          type="button"
          onClick={() => setTab('buy')}
          className={`pb-2 text-sm font-medium transition-colors ${
            tab === 'buy'
              ? 'text-text-primary border-b-2 border-accent'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          Buy a domain
        </button>
      </div>

      {tab === 'byod' ? (
        <BYODFlow profile={profile} />
      ) : (
        <DomainSearchFlow onOrderCreated={setDomainOrder} />
      )}
    </div>
  )
}

function BYODFlow({ profile }: { profile: ProfileRow | null }) {
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
    const result = await removeCustomDomain()
    setLoading(false)
    if (result && 'error' in result && result.error) {
      setStatus(result.error as string)
    } else {
      setDomain('')
      setStatus('Domain removed.')
    }
  }

  const handleCheck = async () => {
    setLoading(true)
    const result = await checkDomainStatus({ data: { domain } })
    setLoading(false)
    setStatus(result.configured ? 'Domain is verified and active.' : 'Domain not yet verified. Check your DNS settings.')
  }

  if (profile?.custom_domain) {
    return (
      <div className="space-y-3">
        <p className="text-sm">Current domain: <span className="font-mono text-accent">{profile.custom_domain}</span></p>
        <div className="flex gap-2">
          <button type="button" onClick={handleCheck} className="text-xs text-text-secondary hover:text-text-primary transition-colors">Check status</button>
          <button type="button" onClick={handleRemove} disabled={loading} className="text-xs text-red-500 hover:text-red-600 transition-colors">Remove</button>
        </div>
        {status && <p className="text-xs text-text-secondary mt-3">{status}</p>}
        <div className="mt-4 text-xs text-text-secondary">
          <p className="font-bold mb-1">DNS Configuration:</p>
          <p>Add a CNAME record pointing your domain to <code className="text-accent">cname.vercel-dns.com</code></p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <input
        type="text"
        value={domain}
        onChange={(e) => setDomain(e.target.value)}
        placeholder="myepk.bio"
        className={FORM_INPUT}
      />
      <button
        type="button"
        onClick={handleAdd}
        disabled={!domain || loading}
        className={BTN_PRIMARY}
      >
        {loading ? 'Adding...' : 'Add Domain'}
      </button>
      {status && <p className="text-xs text-text-secondary mt-3">{status}</p>}
      <div className="mt-4 text-xs text-text-secondary">
        <p className="font-bold mb-1">DNS Configuration:</p>
        <p>Add a CNAME record pointing your domain to <code className="text-accent">cname.vercel-dns.com</code></p>
      </div>
    </div>
  )
}

function DomainSearchFlow({ onOrderCreated }: { onOrderCreated: (order: DomainOrderRow) => void }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState('')
  const [selectedDomain, setSelectedDomain] = useState<SearchResult | null>(null)

  const SERVICE_FEE = 5

  const handleSearch = async () => {
    if (!query.trim()) return
    setSearching(true)
    setError('')
    setResults([])
    setSelectedDomain(null)

    const result = await searchDomain({ data: { domain: query.trim().toLowerCase() } })
    setSearching(false)

    if ('error' in result) {
      setError(result.error as string)
    } else {
      setResults(result.results)
      if (result.results.length === 0) {
        setError('No results found. Try a different name.')
      }
    }
  }

  if (selectedDomain) {
    return (
      <ContactInfoForm
        domain={selectedDomain}
        serviceFee={SERVICE_FEE}
        onBack={() => setSelectedDomain(null)}
        onOrderCreated={onOrderCreated}
      />
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="Search for a domain..."
          className={FORM_INPUT + ' flex-1'}
        />
        <button
          type="button"
          onClick={handleSearch}
          disabled={searching || !query.trim()}
          className={BTN_PRIMARY}
        >
          {searching ? 'Searching...' : 'Search'}
        </button>
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      {results.length > 0 && (
        <div className="border border-border divide-y divide-border">
          {results.map((r) => (
            <div key={r.domain} className="flex items-center justify-between px-4 py-3">
              <div>
                <span className="font-mono text-sm">{r.domain}</span>
                {!r.available && (
                  <span className="ml-2 text-xs text-text-secondary">Unavailable</span>
                )}
              </div>
              {r.available && (
                <div className="flex items-center gap-4">
                  <div className="text-right text-xs text-text-secondary">
                    <div>${(r.purchasePrice + SERVICE_FEE).toFixed(2)} first year</div>
                    {r.renewalPrice !== r.purchasePrice && (
                      <div>${(r.renewalPrice + SERVICE_FEE).toFixed(2)}/yr renewal</div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedDomain(r)}
                    className={BTN_PRIMARY + ' text-xs py-1.5 px-4'}
                  >
                    Buy
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-text-secondary">
        Prices include a ${SERVICE_FEE} service fee. Domains auto-renew annually.
      </p>
    </div>
  )
}

function ContactInfoForm({
  domain,
  serviceFee,
  onBack,
  onOrderCreated,
}: {
  domain: SearchResult
  serviceFee: number
  onBack: () => void
  onOrderCreated: (order: DomainOrderRow) => void
}) {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address1: '',
    address2: '',
    city: '',
    state: '',
    zip: '',
    country: 'US',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const updateField = (field: keyof ContactInfo, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => ({ ...prev, [field]: '' }))
  }

  const handleSubmit = async () => {
    const parsed = contactInfoSchema.safeParse(form)
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {}
      parsed.error.issues.forEach((issue) => {
        const field = issue.path[0] as string
        fieldErrors[field] = issue.message
      })
      setErrors(fieldErrors)
      return
    }

    setSubmitting(true)
    setSubmitError('')

    const result = await createDomainCheckout({
      data: {
        domain: domain.domain,
        contactInfo: parsed.data,
      },
    })

    if ('error' in result) {
      setSubmitError(result.error as string)
      setSubmitting(false)
    } else if ('url' in result && typeof result.url === 'string') {
      window.location.href = result.url
    }
  }

  const fields: { key: keyof ContactInfo; label: string; placeholder: string; half?: boolean }[] = [
    { key: 'firstName', label: 'First Name', placeholder: 'John', half: true },
    { key: 'lastName', label: 'Last Name', placeholder: 'Doe', half: true },
    { key: 'email', label: 'Email', placeholder: 'you@example.com' },
    { key: 'phone', label: 'Phone', placeholder: '+1 555 123 4567' },
    { key: 'address1', label: 'Address', placeholder: '123 Main St' },
    { key: 'address2', label: 'Address 2', placeholder: 'Apt 4B' },
    { key: 'city', label: 'City', placeholder: 'New York', half: true },
    { key: 'state', label: 'State', placeholder: 'NY', half: true },
    { key: 'zip', label: 'ZIP Code', placeholder: '10001', half: true },
    { key: 'country', label: 'Country Code', placeholder: 'US', half: true },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="text-sm font-medium">Register <span className="font-mono text-accent">{domain.domain}</span></p>
          <p className="text-xs text-text-secondary">${(domain.purchasePrice + serviceFee).toFixed(2)} first year, then ${(domain.renewalPrice + serviceFee).toFixed(2)}/yr</p>
        </div>
        <button type="button" onClick={onBack} className="text-xs text-text-secondary hover:text-text-primary">
          Back to search
        </button>
      </div>

      <p className="text-xs text-text-secondary font-bold uppercase tracking-wider">Registrant Information</p>

      <div className="grid grid-cols-2 gap-3">
        {fields.map((f) => (
          <div key={f.key} className={f.half ? '' : 'col-span-2'}>
            <label className={FORM_LABEL}>{f.label}</label>
            <input
              type="text"
              value={form[f.key]}
              onChange={(e) => updateField(f.key, e.target.value)}
              placeholder={f.placeholder}
              className={errors[f.key] ? FORM_INPUT_ERROR : FORM_INPUT}
            />
            {errors[f.key] && <p className="text-xs text-red-500 mt-1">{errors[f.key]}</p>}
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={submitting}
        className={BTN_PRIMARY + ' w-full'}
      >
        {submitting ? 'Redirecting to payment...' : `Pay $${(domain.purchasePrice + serviceFee).toFixed(2)} and register`}
      </button>

      {submitError && <p className="text-xs text-red-500">{submitError}</p>}
    </div>
  )
}

function DomainOrderStatus({ order, onRemove }: { order: DomainOrderRow; onRemove: () => void }) {
  const [removing, setRemoving] = useState(false)
  const [error, setError] = useState('')

  const handleRemove = async () => {
    if (!confirm('Remove this domain? Your renewal subscription will be cancelled.')) return
    setRemoving(true)
    const result = await cancelDomainOrder()
    setRemoving(false)
    if ('error' in result) {
      setError(result.error as string)
    } else {
      onRemove()
    }
  }

  return (
    <div className={SETTINGS_CARD}>
      <h2 className="font-medium text-text-secondary text-sm mb-4">Custom Domain</h2>

      {order.status === 'purchasing' && (
        <div className="flex items-center gap-2 text-sm text-text-secondary">
          <span className="animate-spin inline-block w-4 h-4 border-2 border-accent border-t-transparent rounded-full" />
          Setting up {order.domain}...
        </div>
      )}

      {order.status === 'active' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm text-accent">{order.domain}</span>
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 font-medium uppercase tracking-wider">Active</span>
          </div>
          {order.expires_at && (
            <p className="text-xs text-text-secondary">
              Expires {new Date(order.expires_at).toLocaleDateString()} (auto-renews)
            </p>
          )}
          <button
            type="button"
            onClick={handleRemove}
            disabled={removing}
            className="text-xs text-red-500 hover:text-red-600 transition-colors"
          >
            {removing ? 'Removing...' : 'Remove domain'}
          </button>
        </div>
      )}

      {order.status === 'renewal_failed' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm">{order.domain}</span>
            <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 font-medium uppercase tracking-wider">Renewal Issue</span>
          </div>
          <p className="text-xs text-yellow-600">
            Domain renewal failed. We&apos;ll retry automatically. Your domain remains active until {order.expires_at ? new Date(order.expires_at).toLocaleDateString() : 'expiry'}.
          </p>
          <button
            type="button"
            onClick={handleRemove}
            disabled={removing}
            className="text-xs text-red-500 hover:text-red-600 transition-colors"
          >
            {removing ? 'Removing...' : 'Remove domain'}
          </button>
        </div>
      )}

      {order.status === 'failed' && (
        <div className="space-y-3">
          <p className="text-xs text-red-500">
            Domain purchase for <span className="font-mono">{order.domain}</span> failed. Your payment has been refunded.
          </p>
          <button
            type="button"
            onClick={onRemove}
            className="text-xs text-text-secondary hover:text-text-primary transition-colors"
          >
            Dismiss
          </button>
        </div>
      )}

      {error && <p className="text-xs text-red-500 mt-3">{error}</p>}
    </div>
  )
}
