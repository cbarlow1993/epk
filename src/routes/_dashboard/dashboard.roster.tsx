import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { getOrgProfiles, createOrgProfile, getOrganization } from '~/server/organizations'
import { FORM_INPUT, BTN_PRIMARY, BTN_BASE, CARD_SECTION } from '~/components/forms'

export const Route = createFileRoute('/_dashboard/dashboard/roster')({
  loader: async () => {
    const [profiles, org] = await Promise.all([getOrgProfiles(), getOrganization()])
    return { profiles, org }
  },
  component: RosterPage,
})

function RosterPage() {
  const { profiles: initialProfiles, org } = Route.useLoaderData()
  const [profiles, setProfiles] = useState(initialProfiles || [])
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [newSlug, setNewSlug] = useState('')

  if (!org) {
    return (
      <div>
        <h1 className="text-2xl font-black uppercase tracking-wider mb-8">Artist Roster</h1>
        <p className="text-text-secondary">
          You are not part of an agency.{' '}
          <Link to="/onboarding" className="text-accent hover:underline">
            Create one
          </Link>
        </p>
      </div>
    )
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setAdding(true)
    const result = await createOrgProfile({ data: { display_name: newName, slug: newSlug } })
    if ('profile' in result && result.profile) {
      setProfiles((prev: typeof profiles) => [...prev, result.profile])
      setNewName('')
      setNewSlug('')
    }
    setAdding(false)
  }

  const isAdmin = org.userRole === 'owner' || org.userRole === 'admin'

  return (
    <div>
      <h1 className="text-2xl font-black uppercase tracking-wider mb-8">Artist Roster</h1>

      {/* Add Artist Form */}
      {isAdmin && (
        <form onSubmit={handleAdd} className={CARD_SECTION}>
          <h2 className="text-sm uppercase tracking-widest font-bold mb-4">Add Artist</h2>
          <div className="grid sm:grid-cols-2 gap-4 mb-4">
            <input
              type="text"
              placeholder="Artist Name"
              value={newName}
              onChange={(e) => {
                setNewName(e.target.value)
                setNewSlug(
                  e.target.value
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/^-|-$/g, ''),
                )
              }}
              className={FORM_INPUT}
              required
            />
            <input
              type="text"
              placeholder="url-slug"
              value={newSlug}
              onChange={(e) => setNewSlug(e.target.value)}
              className={FORM_INPUT}
              required
            />
          </div>
          <button type="submit" disabled={adding} className={BTN_PRIMARY}>
            {adding ? 'Adding...' : 'Add Artist'}
          </button>
        </form>
      )}

      {/* Artist Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {profiles.map(
          (profile: {
            id: string
            display_name: string | null
            slug: string | null
            profile_image_url: string | null
            tier: string
            published: boolean
          }) => (
            <div key={profile.id} className="bg-dark-card border border-white/10 rounded-xl overflow-hidden">
              <div className="aspect-video bg-dark-surface flex items-center justify-center">
                {profile.profile_image_url ? (
                  <img src={profile.profile_image_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-4xl font-black text-white/10">
                    {(profile.display_name || '?')[0]}
                  </span>
                )}
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-bold truncate">{profile.display_name}</p>
                  <span
                    className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded ${
                      profile.tier === 'pro'
                        ? 'bg-accent/20 text-accent'
                        : 'bg-white/10 text-text-secondary'
                    }`}
                  >
                    {profile.tier}
                  </span>
                </div>
                <p className="text-xs text-text-secondary mb-3">/{profile.slug}</p>
                <div className="flex gap-2">
                  <Link
                    to="/dashboard"
                    search={{ profile: profile.id }}
                    className={`${BTN_BASE} text-xs bg-accent text-black hover:bg-accent/80`}
                  >
                    Edit
                  </Link>
                  {profile.published && (
                    <a
                      href={`/${profile.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`${BTN_BASE} text-xs bg-white/10 text-white hover:bg-white/20`}
                    >
                      View
                    </a>
                  )}
                </div>
              </div>
            </div>
          ),
        )}
      </div>
    </div>
  )
}
