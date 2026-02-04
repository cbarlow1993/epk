import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { getSupabaseServerClient } from '~/utils/supabase.server'

const getAgencyPage = createServerFn({ method: 'GET' })
  .inputValidator((data: unknown) => z.string().min(1).max(50).regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/).parse(data))
  .handler(async ({ data: slug }) => {
    const supabase = getSupabaseServerClient()

    const { data: org } = await supabase
      .from('organizations')
      .select('name, logo_url, website_url, slug')
      .eq('slug', slug)
      .single()

    if (!org) return null

    const { data: profiles } = await supabase
      .from('profiles')
      .select('display_name, slug, profile_image_url, tagline, genres')
      .eq('organization_id', org.id)
      .eq('published', true)
      .order('display_name')

    return { organization: org, profiles: profiles || [] }
  })

export const Route = createFileRoute('/agency/$orgSlug')({
  loader: ({ params }) => getAgencyPage({ data: params.orgSlug }),
  component: AgencyPage,
  notFoundComponent: () => (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center">
      <p className="text-text-secondary">Agency not found.</p>
    </div>
  ),
})

function AgencyPage() {
  const data = Route.useLoaderData()
  if (!data) return null

  const { organization: org, profiles } = data

  return (
    <div className="min-h-screen bg-dark-bg text-white">
      {/* Header */}
      <header className="py-16 text-center border-b border-white/5">
        {org.logo_url && (
          <img src={org.logo_url} alt={org.name} className="h-16 mx-auto mb-6 object-contain" />
        )}
        <h1 className="text-4xl font-black uppercase tracking-wider mb-2">{org.name}</h1>
        {org.website_url && (
          <a href={org.website_url} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline text-sm">
            {org.website_url.replace(/^https?:\/\//, '')}
          </a>
        )}
      </header>

      {/* Artist Grid */}
      <main className="max-w-6xl mx-auto px-6 py-12">
        <h2 className="text-sm uppercase tracking-widest font-bold text-text-secondary mb-8">Artists</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {profiles.map((profile: { slug: string | null; display_name: string | null; profile_image_url: string | null; tagline: string | null; genres: string[] | null }) => (
            <a
              key={profile.slug}
              href={`/${profile.slug}`}
              className="group block bg-dark-card border border-white/5 rounded-xl overflow-hidden hover:border-accent/30 transition-all hover:scale-105"
            >
              <div className="aspect-square bg-dark-surface overflow-hidden">
                {profile.profile_image_url ? (
                  <img src={profile.profile_image_url} alt={profile.display_name || ''} className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-6xl font-black text-white/10">{(profile.display_name || '?')[0]}</span>
                  </div>
                )}
              </div>
              <div className="p-4">
                <p className="font-bold truncate">{profile.display_name}</p>
                {profile.tagline && <p className="text-xs text-text-secondary truncate mt-1">{profile.tagline}</p>}
                {profile.genres && profile.genres.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {profile.genres.slice(0, 3).map((g: string) => (
                      <span key={g} className="text-[10px] bg-white/10 rounded px-1.5 py-0.5">{g}</span>
                    ))}
                  </div>
                )}
              </div>
            </a>
          ))}
        </div>
      </main>
    </div>
  )
}
