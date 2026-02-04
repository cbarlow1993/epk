import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { getPublicProfile } from '~/server/public-profile'
import { submitBookingRequestForSlug } from '~/server/booking-requests'
import { Nav } from '~/components/Nav'
import { sanitize } from '~/utils/sanitize'
import { EPKSection } from '~/components/EPKSection'
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
    const profile = loaderData?.profile
    const name = profile?.display_name || 'DJ'
    const font = profile?.font_family || 'Inter'
    const fontParam = font.replace(/ /g, '+')
    const tagline = profile?.tagline
    const genres = profile?.genres as string[] | undefined
    const description = [
      `Official Electronic Press Kit for ${name}.`,
      tagline,
      genres?.length ? genres.join(', ') : null,
    ].filter(Boolean).join(' — ')
    return {
      meta: [
        { title: `${name} | DJ - Official Press Kit` },
        { name: 'description', content: description },
        { name: 'og:title', content: `${name} | DJ - Official Press Kit` },
        { name: 'og:description', content: description },
        { name: 'og:type', content: 'website' },
        ...(profile?.profile_image_url ? [{ name: 'og:image', content: profile.profile_image_url }] : []),
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

function BookingForm({ slug }: { slug: string }) {
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    name: '', email: '', event_name: '', event_date: '', venue_location: '',
    budget_range: '', message: '', honeypot: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.honeypot) return
    setSubmitting(true)
    setError('')

    const result = await submitBookingRequestForSlug({
      data: { slug, request: formData },
    })

    if ('error' in result && result.error) {
      setError(result.error)
      setSubmitting(false)
      return
    }

    setSubmitted(true)
    setSubmitting(false)
  }

  if (submitted) {
    return (
      <div className="bg-dark-card border border-accent/20 rounded-xl p-8 text-center">
        <p className="text-accent font-bold text-lg mb-2">Inquiry Sent!</p>
        <p className="text-text-secondary text-sm">Thanks for reaching out. You'll hear back soon.</p>
      </div>
    )
  }

  const inputClass = 'w-full bg-dark-surface border border-white/10 rounded-lg px-4 py-3 text-white placeholder-text-secondary/50 focus:border-accent focus:outline-none transition-colors text-sm'

  return (
    <form onSubmit={handleSubmit} className="bg-dark-card border border-white/5 rounded-xl p-6 mt-8">
      <h3 className="text-sm uppercase tracking-widest font-bold mb-6">Send Booking Inquiry</h3>
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 mb-4 text-red-400 text-sm">{error}</div>
      )}
      <input
        type="text"
        name="website"
        value={formData.honeypot}
        onChange={(e) => setFormData(prev => ({ ...prev, honeypot: e.target.value }))}
        className="absolute -left-[9999px]"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
      />
      <div className="grid sm:grid-cols-2 gap-4 mb-4">
        <input type="text" placeholder="Your Name *" required value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          className={inputClass} />
        <input type="email" placeholder="Your Email *" required value={formData.email}
          onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
          className={inputClass} />
        <input type="text" placeholder="Event Name" value={formData.event_name}
          onChange={(e) => setFormData(prev => ({ ...prev, event_name: e.target.value }))}
          className={inputClass} />
        <input type="date" placeholder="Event Date" value={formData.event_date}
          onChange={(e) => setFormData(prev => ({ ...prev, event_date: e.target.value }))}
          className={inputClass} />
        <input type="text" placeholder="Venue / Location" value={formData.venue_location}
          onChange={(e) => setFormData(prev => ({ ...prev, venue_location: e.target.value }))}
          className={inputClass} />
        <input type="text" placeholder="Budget Range" value={formData.budget_range}
          onChange={(e) => setFormData(prev => ({ ...prev, budget_range: e.target.value }))}
          className={inputClass} />
      </div>
      <textarea placeholder="Your Message *" required rows={4} value={formData.message}
        onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
        className={`${inputClass} mb-4`} />
      <button type="submit" disabled={submitting}
        className="bg-accent hover:bg-accent/80 disabled:opacity-50 text-black font-bold uppercase tracking-widest py-3 px-8 rounded-lg transition-colors text-sm">
        {submitting ? 'Sending...' : 'Send Inquiry'}
      </button>
    </form>
  )
}

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
  const name = profile.display_name || 'DJ'

  const navSections = [
    (profile.bio_left || profile.bio_right) && { label: 'Bio', href: '#bio' },
    mixes.length > 0 && { label: 'Music', href: '#music' },
    events.length > 0 && { label: 'Events', href: '#events' },
    technicalRider && (technicalRider.preferred_setup || technicalRider.alternative_setup) && { label: 'Technical', href: '#technical' },
    pressAssets.length > 0 && { label: 'Press', href: '#press' },
    bookingContact && bookingContact.manager_name && { label: 'Contact', href: '#contact' },
  ].filter((s): s is { label: string; href: string } => !!s)

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
      <Nav displayName={name} sections={navSections} />
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
            {profile.genres && (profile.genres as string[]).length > 0 && (
              <div className="flex flex-wrap justify-center gap-2 mt-4">
                {(profile.genres as string[]).map((genre) => (
                  <span key={genre} className="px-3 py-1 rounded-full text-xs font-bold bg-accent/20 text-accent">
                    {genre}
                  </span>
                ))}
              </div>
            )}
            {(profile.bpm_min || profile.bpm_max) && (
              <p className="text-sm text-text-secondary mt-3">
                {profile.bpm_min && profile.bpm_max
                  ? `${profile.bpm_min}\u2013${profile.bpm_max} BPM`
                  : profile.bpm_min ? `${profile.bpm_min}+ BPM` : `Up to ${profile.bpm_max} BPM`}
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
                    aria-label={`${link.platform} profile`}
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
          <EPKSection id="bio" heading="Bio">
            <div className="grid md:grid-cols-2 gap-8 md:gap-12 text-text-secondary leading-relaxed">
              {profile.bio_left && <div className="prose prose-invert prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: sanitize(profile.bio_left) }} />}
              {profile.bio_right && <div className="prose prose-invert prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: sanitize(profile.bio_right) }} />}
            </div>
          </EPKSection>
        )}

        {/* Mixes */}
        {mixes.length > 0 && (
          <EPKSection id="music" heading="Listen">
            {Object.entries(
              mixes.reduce((acc: Record<string, MixRow[]>, mix) => {
                const cat = mix.category || 'other'
                if (!acc[cat]) acc[cat] = []
                acc[cat].push(mix)
                return acc
              }, {} as Record<string, MixRow[]>)
            ).map(([category, categoryMixes]) => (
              <div key={category} className="mb-10">
                <h3 className="text-lg font-bold uppercase tracking-wider text-accent mb-6 capitalize">
                  {category.replace(/-/g, ' ')}
                </h3>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {categoryMixes.map((mix) => (
                    <div key={mix.id} className="bg-dark-card border border-white/5 rounded-lg overflow-hidden">
                      {mix.embed_html ? (
                        <div
                          className="w-full [&_iframe]:w-full [&_iframe]:rounded-none"
                          dangerouslySetInnerHTML={{ __html: mix.embed_html }}
                        />
                      ) : (
                        <a href={mix.url} target="_blank" rel="noopener noreferrer"
                          className="block p-4 hover:border-accent/30 transition-colors">
                          <p className="font-bold text-sm mb-1">{mix.title}</p>
                          <p className="text-xs text-text-secondary truncate">{mix.url}</p>
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </EPKSection>
        )}

        {/* Events */}
        {events.length > 0 && (
          <EPKSection id="events" heading={<>Events <span className="text-accent">&amp;</span> Brands</>}>
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
          </EPKSection>
        )}

        {/* Technical Rider */}
        {technicalRider && (technicalRider.preferred_setup || technicalRider.alternative_setup) && (
          <EPKSection id="technical" heading="Technical Rider" maxWidth="max-w-4xl">
            <div className="bg-dark-card backdrop-blur-sm rounded-xl border border-white/5 overflow-hidden">
              {technicalRider.preferred_setup && (
                <div className="px-6 py-4 border-b border-white/5">
                  <p className="text-sm uppercase tracking-widest font-bold mb-3">Preferred Setup</p>
                  <div className="prose prose-invert prose-sm max-w-none text-text-secondary" dangerouslySetInnerHTML={{ __html: sanitize(technicalRider.preferred_setup) }} />
                </div>
              )}
              {technicalRider.alternative_setup && (
                <div className="px-6 py-4">
                  <p className="text-sm uppercase tracking-widest font-bold mb-3">Alternative Setup</p>
                  <div className="prose prose-invert prose-sm max-w-none text-text-secondary" dangerouslySetInnerHTML={{ __html: sanitize(technicalRider.alternative_setup) }} />
                </div>
              )}
            </div>
          </EPKSection>
        )}

        {/* Press Assets */}
        {pressAssets && pressAssets.length > 0 && (
          <EPKSection id="press" heading="Press Assets">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {pressAssets.map((asset: PressAssetRow) => (
                <a
                  key={asset.id}
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
          </EPKSection>
        )}

        {/* Contact */}
        {bookingContact && bookingContact.manager_name && (
          <EPKSection id="contact" heading="Booking Contact" maxWidth="max-w-4xl">
            <div className="text-text-secondary space-y-2">
              <p><strong>Management:</strong> {bookingContact.manager_name}</p>
              {bookingContact.email && <p><strong>Email:</strong> {bookingContact.email}</p>}
              {bookingContact.phone && <p><strong>Phone:</strong> {bookingContact.phone}</p>}
            </div>
            <BookingForm slug={profile.slug as string} />
          </EPKSection>
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
