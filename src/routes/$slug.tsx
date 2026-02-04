import { createFileRoute } from '@tanstack/react-router'
import { getPublicProfile } from '~/server/public-profile'
import { Nav } from '~/components/Nav'
import { FadeIn } from '~/components/FadeIn'
import type { MixRow, EventRow, SocialLinkRow, PressAssetRow } from '~/types/database'

export const Route = createFileRoute('/$slug')({
  validateSearch: (search: Record<string, unknown>) => ({
    preview: search.preview === 'true',
    accent: (search.accent as string) || undefined,
    bg: (search.bg as string) || undefined,
    font: (search.font as string) || undefined,
  }),
  loader: ({ params }) => getPublicProfile({ data: params.slug }),
  head: ({ loaderData }) => {
    const name = loaderData?.profile?.display_name || 'DJ'
    const font = loaderData?.profile?.font_family || 'Inter'
    const fontParam = font.replace(/ /g, '+')
    return {
      meta: [
        { title: `${name} | DJ - Official Press Kit` },
        { name: 'description', content: `Official Electronic Press Kit for ${name}.` },
        { name: 'og:title', content: `${name} | DJ - Official Press Kit` },
        { name: 'og:type', content: 'website' },
      ],
      links: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'stylesheet', href: `https://fonts.googleapis.com/css2?family=${fontParam}:wght@400;700;900&display=swap` },
      ],
    }
  },
  component: PublicEPK,
  notFoundComponent: () => (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center">
      <p className="text-text-secondary">This EPK page doesn't exist.</p>
    </div>
  ),
})

function PublicEPK() {
  const data = Route.useLoaderData()
  const search = Route.useSearch()

  if (!data) return (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center">
      <p className="text-text-secondary">Page not found.</p>
    </div>
  )

  const { profile, socialLinks, mixes, events, technicalRider, bookingContact, pressAssets } = data

  const accent = search.accent || profile.accent_color || '#3b82f6'
  const bg = search.bg || profile.bg_color || '#0a0a0f'
  const font = search.font || profile.font_family || 'Inter'

  return (
    <div
      style={{
        '--color-accent': accent,
        '--color-accent-glow': accent,
        '--color-dark-bg': bg,
        '--font-display': `'${font}', sans-serif`,
        backgroundColor: bg,
        fontFamily: `'${font}', sans-serif`,
      } as React.CSSProperties}
      className="min-h-screen text-white"
    >
      <Nav />
      <main>
        {/* Hero */}
        <section className="relative h-screen flex items-center justify-center overflow-hidden">
          {profile.hero_image_url ? (
            <img src={profile.hero_image_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-b from-dark-bg via-dark-surface to-dark-bg" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-dark-bg/90 via-transparent to-dark-bg/60" />
          <div className="relative z-10 text-center">
            <h1 className="text-6xl md:text-8xl font-black tracking-tight mb-2">
              {(profile.display_name || 'DJ').toUpperCase()}
            </h1>
            {profile.tagline && (
              <p className="text-lg md:text-xl tracking-[0.3em] text-text-secondary uppercase mb-8">
                {profile.tagline}
              </p>
            )}
            {socialLinks.length > 0 && (
              <div className="flex items-center justify-center gap-4 mt-4">
                {socialLinks.map((link: SocialLinkRow) => (
                  <a
                    key={link.id}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={link.platform}
                    className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center text-sm font-bold uppercase hover:border-accent hover:text-accent transition-colors"
                  >
                    {link.platform.charAt(0)}
                  </a>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Bio */}
        {(profile.bio_left || profile.bio_right) && (
          <FadeIn>
            <section id="bio" className="py-20 px-4">
              <div className="max-w-6xl mx-auto">
                <div className="w-20 h-1 bg-accent mb-8 shadow-[0_0_10px_var(--color-accent-glow)]" />
                <h2 className="text-4xl md:text-5xl font-black uppercase tracking-wider mb-12">Bio</h2>
                <div className="grid md:grid-cols-2 gap-8 md:gap-12 text-text-secondary leading-relaxed">
                  {profile.bio_left && <div className="whitespace-pre-line">{profile.bio_left}</div>}
                  {profile.bio_right && <div className="whitespace-pre-line">{profile.bio_right}</div>}
                </div>
              </div>
            </section>
          </FadeIn>
        )}

        {/* Mixes */}
        {mixes.length > 0 && (
          <FadeIn>
            <section id="music" className="py-20 px-4">
              <div className="max-w-6xl mx-auto">
                <div className="w-20 h-1 bg-accent mb-8 shadow-[0_0_10px_var(--color-accent-glow)]" />
                <h2 className="text-4xl md:text-5xl font-black uppercase tracking-wider mb-12">Listen</h2>
                {Object.entries(
                  mixes.reduce<Record<string, MixRow[]>>((acc, mix) => {
                    const cat = mix.category || 'other'
                    if (!acc[cat]) acc[cat] = []
                    acc[cat].push(mix)
                    return acc
                  }, {})
                ).map(([category, categoryMixes]) => (
                  <div key={category} className="mb-10">
                    <h3 className="text-lg font-bold uppercase tracking-wider text-accent mb-6 capitalize">
                      {category.replace(/-/g, ' ')}
                    </h3>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {categoryMixes.map((mix) => (
                        <a key={mix.id} href={mix.url} target="_blank" rel="noopener noreferrer"
                          className="bg-dark-card border border-white/5 rounded-lg p-4 hover:border-accent/30 transition-colors">
                          <p className="font-bold text-sm mb-1">{mix.title}</p>
                          <p className="text-xs text-text-secondary truncate">{mix.url}</p>
                        </a>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </FadeIn>
        )}

        {/* Events */}
        {events.length > 0 && (
          <FadeIn>
            <section id="events" className="py-20 px-4">
              <div className="max-w-6xl mx-auto">
                <div className="w-20 h-1 bg-accent mb-8 shadow-[0_0_10px_var(--color-accent-glow)]" />
                <h2 className="text-4xl md:text-5xl font-black uppercase tracking-wider mb-12">
                  Events <span className="text-accent">&amp;</span> Brands
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {events.map((event: EventRow) => (
                    <a
                      key={event.id}
                      href={event.link_url || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group block rounded-lg overflow-hidden border border-white/5 hover:border-accent/30 transition-all hover:scale-105"
                    >
                      <div className="aspect-square overflow-hidden bg-dark-card">
                        {event.image_url && (
                          <img src={event.image_url} alt={event.name} className="w-full h-full object-cover object-center" loading="lazy" />
                        )}
                      </div>
                      <div className="bg-dark-card/80 backdrop-blur-sm px-3 py-2">
                        <p className="text-xs text-center text-text-secondary leading-tight">{event.name}</p>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            </section>
          </FadeIn>
        )}

        {/* Technical Rider */}
        {technicalRider && (technicalRider.preferred_setup || technicalRider.alternative_setup) && (
          <FadeIn>
            <section id="technical" className="py-20 px-4">
              <div className="max-w-4xl mx-auto">
                <div className="w-20 h-1 bg-accent mb-8 shadow-[0_0_10px_var(--color-accent-glow)]" />
                <h2 className="text-4xl md:text-5xl font-black uppercase tracking-wider mb-12">Technical Rider</h2>
                <div className="bg-dark-card backdrop-blur-sm rounded-xl border border-white/5 overflow-hidden">
                  {technicalRider.preferred_setup && (
                    <div className="px-6 py-4 border-b border-white/5">
                      <p className="text-sm uppercase tracking-widest font-bold mb-3">Preferred Setup</p>
                      <div className="text-text-secondary text-sm leading-relaxed whitespace-pre-line">{technicalRider.preferred_setup}</div>
                    </div>
                  )}
                  {technicalRider.alternative_setup && (
                    <div className="px-6 py-4">
                      <p className="text-sm uppercase tracking-widest font-bold mb-3">Alternative Setup</p>
                      <div className="text-text-secondary text-sm leading-relaxed whitespace-pre-line">{technicalRider.alternative_setup}</div>
                    </div>
                  )}
                </div>
              </div>
            </section>
          </FadeIn>
        )}

        {/* Press Assets */}
        {pressAssets && pressAssets.length > 0 && (
          <FadeIn>
            <section id="press" className="py-20 px-4">
              <div className="max-w-6xl mx-auto">
                <div className="w-20 h-1 bg-accent mb-8 shadow-[0_0_10px_var(--color-accent-glow)]" />
                <h2 className="text-4xl md:text-5xl font-black uppercase tracking-wider mb-12">Press Assets</h2>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pressAssets.map((asset: PressAssetRow) => (
                    <a
                      key={asset.title}
                      href={asset.file_url}
                      download
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-dark-card border border-white/5 rounded-lg p-4 hover:border-accent/30 transition-colors group"
                    >
                      <p className="font-bold text-sm mb-1">{asset.title}</p>
                      <p className="text-xs text-text-secondary group-hover:text-accent transition-colors">Download</p>
                    </a>
                  ))}
                </div>
              </div>
            </section>
          </FadeIn>
        )}

        {/* Contact */}
        {bookingContact && bookingContact.manager_name && (
          <FadeIn>
            <section id="contact" className="py-20 px-4">
              <div className="max-w-4xl mx-auto">
                <div className="w-20 h-1 bg-accent mb-8 shadow-[0_0_10px_var(--color-accent-glow)]" />
                <h2 className="text-4xl md:text-5xl font-black uppercase tracking-wider mb-12">Booking Contact</h2>
                <div className="text-text-secondary space-y-2">
                  <p><strong>Management:</strong> {bookingContact.manager_name}</p>
                  {bookingContact.email && <p><strong>Email:</strong> {bookingContact.email}</p>}
                  {bookingContact.phone && <p><strong>Phone:</strong> {bookingContact.phone}</p>}
                </div>
              </div>
            </section>
          </FadeIn>
        )}
      </main>

      {/* Branded footer for free tier */}
      {profile.tier === 'free' && (
        <footer className="py-6 text-center border-t border-white/5">
          <p className="text-xs text-text-secondary">
            Built with <a href="/" className="text-accent hover:underline">DJ EPK</a>
          </p>
        </footer>
      )}
    </div>
  )
}
