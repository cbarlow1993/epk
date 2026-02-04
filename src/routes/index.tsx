import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useRef } from 'react'

export const Route = createFileRoute('/')({
  component: LandingPage,
  head: () => ({
    meta: [
      { title: 'DJ EPK - Professional Electronic Press Kits for DJs & Artists' },
      { name: 'description', content: 'Create a professional DJ press kit in minutes. Bio, mixes, events, technical rider, booking info — all in one beautiful page.' },
      { name: 'og:title', content: 'DJ EPK - Professional Electronic Press Kits' },
      { name: 'og:type', content: 'website' },
    ],
  }),
})

const FEATURES = [
  { title: 'Bio & Profile', desc: 'Tell your story. Photo, biography, genre tags, and location — everything a promoter needs at a glance.' },
  { title: 'Music & Mixes', desc: 'Embed your SoundCloud, Mixcloud, or direct links. Let your sound speak before you do.' },
  { title: 'Events & Brands', desc: 'Showcase past and upcoming gigs. Display the brands and venues you have worked with.' },
  { title: 'Technical Rider', desc: 'Specify your equipment requirements and setup preferences. No more back-and-forth emails.' },
  { title: 'Press Assets', desc: 'High-resolution photos, logos, and promotional material ready for download.' },
  { title: 'Booking Contact', desc: 'A clean contact form so promoters and agents can reach you directly.' },
  { title: 'Social Links', desc: 'Connect all your platforms in one place. Instagram, SoundCloud, Spotify, and more.' },
  { title: 'Custom Themes', desc: 'Match your EPK to your brand identity. Colours, layout, and typography — your rules.' },
]

const PRICING_ROWS = [
  { feature: 'Full EPK page', free: true, pro: true },
  { feature: 'All sections (bio, mixes, events, rider, press, contact)', free: true, pro: true },
  { feature: 'yourname.djepk.com URL', free: true, pro: true },
  { feature: 'Social links', free: true, pro: true },
  { feature: 'Platform branding', free: true, pro: false, proLabel: 'Removed' },
  { feature: 'Custom domain', free: false, pro: true },
  { feature: 'Full theme customisation', free: false, pro: true },
  { feature: 'Priority support', free: false, pro: true },
]

function useScrollReveal(ref: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!ref.current) return
    const items = ref.current.querySelectorAll('[data-reveal]')
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const parent = entry.target.parentElement
            if (!parent) continue
            const siblings = parent.querySelectorAll('[data-reveal]')
            const index = Array.from(siblings).indexOf(entry.target as Element)
            setTimeout(() => {
              (entry.target as HTMLElement).style.opacity = '1';
              (entry.target as HTMLElement).style.transform = 'translateX(0)'
            }, index * 80)
            observer.unobserve(entry.target)
          }
        }
      },
      { rootMargin: '0px 0px -60px 0px', threshold: 0.1 }
    )
    items.forEach((item) => observer.observe(item))
    return () => observer.disconnect()
  }, [ref])
}

function LandingPage() {
  const mainRef = useRef<HTMLDivElement>(null)
  useScrollReveal(mainRef)

  return (
    <div ref={mainRef} className="min-h-screen bg-bg">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-text-primary">
        <div className="max-w-[1400px] mx-auto px-[clamp(1.5rem,4vw,4rem)] h-16 flex items-center justify-between">
          <Link to="/" className="font-display font-extrabold text-xl tracking-tight flex items-center gap-2">
            DJ EPK <span className="inline-block w-2 h-2 bg-accent rounded-full" />
          </Link>
          <div className="flex items-center gap-8">
            <a href="#features" className="hidden sm:inline text-xs font-medium uppercase tracking-wider hover:text-accent transition-colors">Features</a>
            <a href="#pricing" className="hidden sm:inline text-xs font-medium uppercase tracking-wider hover:text-accent transition-colors">Pricing</a>
            <Link to="/login" className="text-xs font-medium uppercase tracking-wider hover:text-accent transition-colors">Log in</Link>
            <Link to="/signup" className="text-xs font-semibold uppercase tracking-wider bg-text-primary text-white px-5 py-2 hover:bg-accent transition-colors">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="min-h-screen flex flex-col justify-end pt-16 pb-16 border-b border-text-primary">
        <div className="max-w-[1400px] mx-auto px-[clamp(1.5rem,4vw,4rem)] w-full">
          <div className="grid md:grid-cols-2 gap-6 items-end">
            <h1 className="font-display font-extrabold text-[clamp(3.5rem,10vw,9rem)] leading-[0.9] tracking-tighter uppercase">
              Your<br />
              Press<br />
              <span className="text-accent">Kit.</span>
            </h1>
            <div className="flex flex-col gap-8 pb-2">
              <p className="text-[clamp(1rem,1.5vw,1.25rem)] leading-relaxed text-text-secondary max-w-[400px]">
                One link for your bio, mixes, events, rider, and booking contact. Built for DJs who take their career seriously.
              </p>
              <div className="flex gap-12 text-xs font-semibold uppercase tracking-widest text-text-secondary">
                <div>
                  <span className="block font-display font-extrabold text-3xl tracking-tight text-text-primary normal-case mb-1">8</span>
                  Sections
                </div>
                <div>
                  <span className="block font-display font-extrabold text-3xl tracking-tight text-text-primary normal-case mb-1">1</span>
                  Link
                </div>
                <div>
                  <span className="block font-display font-extrabold text-3xl tracking-tight text-text-primary normal-case mb-1">&pound;0</span>
                  To Start
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Red divider */}
      <div className="h-[3px] bg-accent" />

      {/* Features */}
      <section id="features" className="border-b border-text-primary">
        <div className="max-w-[1400px] mx-auto px-[clamp(1.5rem,4vw,4rem)]">
          <div className="flex items-baseline gap-8 pt-16 pb-8">
            <span className="font-display font-bold text-sm tracking-wider text-text-secondary">01</span>
            <h2 className="font-display font-extrabold text-[clamp(2rem,5vw,4rem)] tracking-tighter uppercase leading-none">Features</h2>
          </div>
          <div className="grid md:grid-cols-2">
            {FEATURES.map((f, i) => (
              <div
                key={f.title}
                data-reveal
                className="grid grid-cols-[2rem_1fr] gap-6 py-8 pr-8 border-t border-border md:even:pl-8 md:even:border-l md:even:border-l-border"
                style={{ opacity: 0, transform: 'translateX(-30px)', transition: 'opacity 0.6s ease, transform 0.6s ease' }}
              >
                <span className="font-display font-bold text-xs text-text-secondary pt-0.5">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div>
                  <h3 className="font-display font-bold text-xl tracking-tight mb-2">{f.title}</h3>
                  <p className="text-sm text-text-secondary leading-relaxed max-w-[320px]">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="border-b border-text-primary">
        <div className="max-w-[1400px] mx-auto px-[clamp(1.5rem,4vw,4rem)]">
          <div className="flex items-baseline gap-8 pt-16 pb-8">
            <span className="font-display font-bold text-sm tracking-wider text-text-secondary">02</span>
            <h2 className="font-display font-extrabold text-[clamp(2rem,5vw,4rem)] tracking-tighter uppercase leading-none">Pricing</h2>
          </div>

          <table className="w-full border-collapse mt-4">
            <thead>
              <tr>
                <th className="w-1/2 text-left font-display font-bold text-sm uppercase tracking-wider p-4 border-b-2 border-text-primary align-bottom" />
                <th className="text-left font-display font-bold text-sm uppercase tracking-wider p-4 border-b-2 border-text-primary align-bottom">
                  Free
                  <span className="block font-display font-extrabold text-4xl tracking-tighter mt-1 leading-none">&pound;0</span>
                  <span className="font-normal text-xs text-text-secondary tracking-wider">Forever</span>
                </th>
                <th className="text-left font-display font-bold text-sm uppercase tracking-wider p-4 border-b-2 border-text-primary bg-text-primary text-white align-bottom">
                  Pro
                  <span className="block font-display font-extrabold text-4xl tracking-tighter mt-1 leading-none">&pound;9</span>
                  <span className="font-normal text-xs text-white/60 tracking-wider">Per Month</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {PRICING_ROWS.map((row, i) => (
                <tr
                  key={row.feature}
                  data-reveal
                  style={{ opacity: 0, transform: 'translateX(-20px)', transition: `opacity 0.4s ease, transform 0.4s ease` }}
                >
                  <td className="p-3.5 border-b border-border text-sm font-medium text-text-secondary">{row.feature}</td>
                  <td className="p-3.5 border-b border-border text-center text-sm font-semibold">
                    {row.free ? <span>&#10003;</span> : <span className="text-border">&#8212;</span>}
                  </td>
                  <td className="p-3.5 border-b border-text-primary/10 text-center text-sm font-semibold bg-text-primary text-white">
                    {row.pro ? (
                      <span>&#10003;</span>
                    ) : (
                      <span className="text-white/40">&#8212; {row.proLabel}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td className="p-4" />
                <td className="p-4 text-center">
                  <Link
                    to="/signup"
                    className="inline-block px-8 py-3 border border-text-primary text-text-primary text-xs font-semibold uppercase tracking-wider hover:bg-text-primary hover:text-white transition-colors"
                  >
                    Start Free
                  </Link>
                </td>
                <td className="p-4 text-center bg-text-primary">
                  <Link
                    to="/signup"
                    className="inline-block px-8 py-3 bg-accent text-white text-xs font-semibold uppercase tracking-wider border border-accent hover:bg-red-600 transition-colors"
                  >
                    Go Pro
                  </Link>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      {/* CTA */}
      <section className="py-32 text-center">
        <div className="max-w-[1400px] mx-auto px-[clamp(1.5rem,4vw,4rem)]">
          <h2 className="font-display font-extrabold text-[clamp(2.5rem,7vw,6rem)] tracking-tighter uppercase leading-[0.95] mb-8">
            Stop<br />Sending<br /><span className="text-accent">PDFs.</span>
          </h2>
          <p className="text-lg text-text-secondary max-w-[500px] mx-auto mb-12 leading-relaxed">
            Build your electronic press kit in minutes. Share one link with every promoter, venue, and agent.
          </p>
          <Link
            to="/signup"
            className="inline-block px-12 py-4 bg-accent text-white font-bold text-sm uppercase tracking-widest hover:translate-y-[-2px] hover:shadow-[0_4px_0_0_black] transition-all"
          >
            Create Your EPK
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-text-primary py-6">
        <div className="max-w-[1400px] mx-auto px-[clamp(1.5rem,4vw,4rem)] flex items-center justify-between">
          <span className="font-display font-bold text-sm">DJ EPK <span className="text-accent">&#9679;</span></span>
          <span className="text-xs text-text-secondary">&copy; {new Date().getFullYear()} DJ EPK</span>
        </div>
      </footer>
    </div>
  )
}
