import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { getOrgBillingOverview, createCheckoutSession } from '~/server/billing'
import { getOrganization } from '~/server/organizations'
import { BTN_PRIMARY, CARD_SECTION } from '~/components/forms'

export const Route = createFileRoute('/_dashboard/dashboard/billing')({
  loader: async () => {
    const [billing, org] = await Promise.all([getOrgBillingOverview(), getOrganization()])
    return { billing, org }
  },
  component: BillingPage,
})

function BillingPage() {
  const { billing, org } = Route.useLoaderData()
  const [upgrading, setUpgrading] = useState<string | null>(null)

  if (!org || 'error' in billing) {
    return (
      <div>
        <h1 className="text-2xl font-display font-extrabold tracking-tight uppercase mb-8">Billing</h1>
        <p className="text-text-secondary">Agency billing is available to organization owners and admins.</p>
      </div>
    )
  }

  const handleUpgrade = async (profileId: string) => {
    setUpgrading(profileId)
    const result = await createCheckoutSession({ data: { profileId } })
    if ('url' in result && result.url) {
      window.location.href = result.url
    }
    setUpgrading(null)
  }

  return (
    <div>
      <h1 className="text-2xl font-display font-extrabold tracking-tight uppercase mb-8">Billing</h1>

      {/* Summary */}
      <div className={CARD_SECTION}>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-3xl font-display font-extrabold text-accent">{billing.proCount}</p>
            <p className="text-xs font-medium text-text-secondary mt-1">Pro Artists</p>
          </div>
          <div>
            <p className="text-3xl font-display font-extrabold">{billing.freeCount}</p>
            <p className="text-xs font-medium text-text-secondary mt-1">Free Artists</p>
          </div>
          <div>
            <p className="text-3xl font-display font-extrabold text-accent">${billing.monthlyTotal}</p>
            <p className="text-xs font-medium text-text-secondary mt-1">Monthly Total</p>
          </div>
        </div>
      </div>

      {/* Per-Artist Table */}
      <div className="space-y-3">
        {billing.profiles.map((profile: { id: string; display_name: string | null; slug: string | null; tier: string }) => (
          <div key={profile.id} className="bg-surface border border-border p-4 flex items-center gap-4">
            <div className="flex-1">
              <p className="font-bold text-sm">{profile.display_name}</p>
              <p className="text-xs text-text-secondary">/{profile.slug}</p>
            </div>
            <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded ${
              profile.tier === 'pro' ? 'bg-accent/20 text-accent' : 'bg-bg text-text-secondary'
            }`}>
              {profile.tier}
            </span>
            {profile.tier === 'free' && (
              <button
                onClick={() => handleUpgrade(profile.id)}
                disabled={upgrading === profile.id}
                className={`${BTN_PRIMARY} text-xs`}
              >
                {upgrading === profile.id ? 'Redirecting...' : 'Upgrade'}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
