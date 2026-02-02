import { createFileRoute } from '@tanstack/react-router'
import { getProfile } from '~/server/profile'

export const Route = createFileRoute('/_dashboard/dashboard/settings')({
  loader: () => getProfile(),
  component: SettingsPage,
})

function SettingsPage() {
  const profile = Route.useLoaderData()

  return (
    <div>
      <h1 className="text-2xl font-black uppercase tracking-wider mb-8">Settings</h1>

      <div className="space-y-8 max-w-2xl">
        {/* Account Info */}
        <div className="bg-dark-card border border-white/10 rounded-lg p-6">
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

        {/* Billing - placeholder for Phase 4 */}
        <div className="bg-dark-card border border-white/10 rounded-lg p-6">
          <h2 className="text-sm uppercase tracking-widest font-bold mb-4">Billing</h2>
          <p className="text-text-secondary text-sm">Billing and subscription management coming soon.</p>
        </div>

        {/* Custom Domain - placeholder for Phase 4 */}
        <div className="bg-dark-card border border-white/10 rounded-lg p-6">
          <h2 className="text-sm uppercase tracking-widest font-bold mb-4">Custom Domain</h2>
          <p className="text-text-secondary text-sm">Custom domain configuration available on the Pro plan.</p>
        </div>
      </div>
    </div>
  )
}
