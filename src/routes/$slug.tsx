import { createFileRoute } from '@tanstack/react-router'
import { getPublicProfile } from '~/server/public-profile'
import { Nav } from '~/components/Nav'
import { Footer } from '~/components/Footer'
import { FadeIn } from '~/components/FadeIn'

export const Route = createFileRoute('/$slug')({
  loader: ({ params }) => getPublicProfile({ data: params.slug }),
  head: ({ loaderData }) => {
    const name = loaderData?.profile?.display_name || 'DJ'
    return {
      meta: [
        { title: `${name} | DJ - Official Press Kit` },
        { name: 'description', content: `Official Electronic Press Kit for ${name}.` },
        { name: 'og:title', content: `${name} | DJ - Official Press Kit` },
        { name: 'og:type', content: 'website' },
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
  if (!data) return (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center">
      <p className="text-text-secondary">Page not found.</p>
    </div>
  )

  const { profile, socialLinks, mixes, events, technicalRider, bookingContact } = data

  return (
    <>
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
              {profile.display_name.toUpperCase()}
            </h1>
            {profile.tagline && (
              <p className="text-lg md:text-xl tracking-[0.3em] text-text-secondary uppercase mb-8">
                {profile.tagline}
              </p>
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
                  {events.map((event: any) => (
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
      <Footer />
    </>
  )
}
