import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { createOrganization } from '~/server/organizations'
import { FORM_INPUT, FORM_LABEL, BTN_PRIMARY, SETTINGS_CARD } from '~/components/forms'

export const Route = createFileRoute('/onboarding')({
  component: OnboardingPage,
})

function OnboardingPage() {
  const [accountType, setAccountType] = useState<'individual' | 'agency' | null>(null)
  const [orgName, setOrgName] = useState('')
  const [orgSlug, setOrgSlug] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!accountType) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center px-4">
        <div className="w-full max-w-lg">
          <h1 className="text-3xl font-display font-extrabold tracking-tight uppercase text-center mb-8">Welcome</h1>
          <p className="text-text-secondary text-center mb-8">How will you be using myEPK?</p>
          <div className="grid sm:grid-cols-2 gap-4">
            <button
              onClick={() => { window.location.href = '/dashboard' }}
              className={`${SETTINGS_CARD} text-left hover:border-accent/30 transition-colors`}
            >
              <p className="font-bold text-lg mb-2">Individual Artist</p>
              <p className="text-text-secondary text-sm">Manage your own DJ profile and EPK.</p>
            </button>
            <button
              onClick={() => setAccountType('agency')}
              className={`${SETTINGS_CARD} text-left hover:border-accent/30 transition-colors`}
            >
              <p className="font-bold text-lg mb-2">Agency / Management</p>
              <p className="text-text-secondary text-sm">Manage multiple artists with your team.</p>
            </button>
          </div>
        </div>
      </div>
    )
  }

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const result = await createOrganization({
      data: { name: orgName, slug: orgSlug },
    })

    if ('error' in result && result.error) {
      setError(typeof result.error === 'string' ? result.error : 'Failed to create agency')
      setLoading(false)
      return
    }

    window.location.href = '/dashboard'
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-display font-extrabold tracking-tight uppercase text-center mb-8">Create Agency</h1>

        {error && (
          <div className="border border-red-500 px-4 py-3 mb-6 text-red-500 text-sm">{error}</div>
        )}

        <form onSubmit={handleCreateOrg} className="space-y-6">
          <div>
            <label className={FORM_LABEL}>Agency Name</label>
            <input
              type="text"
              value={orgName}
              onChange={(e) => {
                setOrgName(e.target.value)
                setOrgSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''))
              }}
              className={FORM_INPUT}
              placeholder="Your Agency Name"
              required
            />
          </div>
          <div>
            <label className={FORM_LABEL}>Agency URL</label>
            <div className="flex items-center">
              <span className="text-text-secondary text-sm mr-2">myepk.bio/agency/</span>
              <input
                type="text"
                value={orgSlug}
                onChange={(e) => setOrgSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                className={FORM_INPUT}
                required
              />
            </div>
          </div>
          <button type="submit" disabled={loading} className={`w-full ${BTN_PRIMARY} py-3`}>
            {loading ? 'Creating...' : 'Create Agency'}
          </button>
        </form>

        <button
          onClick={() => setAccountType(null)}
          className="text-text-secondary text-sm text-center mt-6 block mx-auto hover:text-text-primary"
        >
          Go back
        </button>
      </div>
    </div>
  )
}
