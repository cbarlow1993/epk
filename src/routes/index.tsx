import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { BLOG_POSTS } from '~/data/blog-posts'
import { trackCTA, trackNavClick, trackSectionView } from '~/utils/analytics'

export const Route = createFileRoute('/')({
  component: LandingPage,
  head: () => ({
    meta: [
      { title: 'myEPK - Professional Electronic Press Kits for DJs & Artists' },
      { name: 'description', content: 'Create a professional DJ press kit in minutes. Bio, mixes, events, technical rider, booking info — all in one beautiful page.' },
      { property: 'og:title', content: 'myEPK — Professional Electronic Press Kits for DJs & Artists' },
      { property: 'og:description', content: 'Create a professional DJ press kit in minutes. Bio, mixes, events, technical rider, booking info — all in one beautiful page.' },
      { property: 'og:type', content: 'website' },
      { property: 'og:url', content: 'https://myepk.bio' },
      { property: 'og:image', content: 'https://myepk.bio/og-default.png' },
      { property: 'twitter:card', content: 'summary_large_image' },
      { property: 'twitter:image', content: 'https://myepk.bio/og-default.png' },
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

const PRICING_FEATURES = [
  { label: 'Full EPK page', free: true, pro: true },
  { label: 'All sections (bio, mixes, events, rider, press, contact)', free: true, pro: true },
  { label: 'myepk.bio/your-dj-name URL', free: true, pro: true },
  { label: 'Social links', free: true, pro: true },
  { label: 'Platform branding removed', free: false, pro: true },
  { label: 'Custom domain', free: false, pro: true },
  { label: 'Full theme customisation', free: false, pro: true },
  { label: 'Priority support', free: false, pro: true },
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
              (entry.target as HTMLElement).style.transform = 'translateY(0)'
            }, index * 60)
            observer.unobserve(entry.target)
          }
        }
      },
      { rootMargin: '0px 0px -40px 0px', threshold: 0.1 }
    )
    items.forEach((item) => observer.observe(item))
    return () => observer.disconnect()
  }, [ref])
}

function EqBars({ className = '' }: { className?: string }) {
  const bars = useRef(
    Array.from({ length: 48 }, () => ({
      height: 8 + Math.random() * 44,
      delay: Math.random() * 1.6,
      duration: 1.0 + Math.random() * 0.8,
    }))
  )

  return (
    <div className={`flex items-end justify-center gap-[2px] ${className}`}>
      {bars.current.map((bar, i) => (
        <div
          key={i}
          className="w-[3px] rounded-t-sm bg-accent/30"
          style={{
            height: '4px',
            animation: `eq-bar ${bar.duration}s ease-in-out infinite`,
            animationDelay: `${bar.delay}s`,
            '--eq-height': `${bar.height}px`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  )
}

function LandingPage() {
  const mainRef = useRef<HTMLDivElement>(null)
  const [scrolled, setScrolled] = useState(false)
  useScrollReveal(mainRef)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Track which landing page sections users scroll to
  useEffect(() => {
    const sections = mainRef.current?.querySelectorAll('[data-section]')
    if (!sections?.length) return
    const fired = new Set<string>()
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const name = (entry.target as HTMLElement).dataset.section!
          if (entry.isIntersecting && !fired.has(name)) {
            fired.add(name)
            trackSectionView(name)
          }
        }
      },
      { threshold: 0.3 }
    )
    sections.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={mainRef} className="theme-dark min-h-screen bg-bg text-text-primary font-body">
      {/* Grain texture overlay */}
      <div
        className="fixed inset-0 pointer-events-none z-[100] opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='a'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.75' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23a)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Nav */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'bg-bg/95 backdrop-blur-md border-b border-border'
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-[1400px] mx-auto px-[clamp(1.5rem,4vw,4rem)] h-16 flex items-center justify-between">
          <Link to="/" className="font-display font-bold text-lg tracking-tight flex items-center gap-2">
            myEPK <span className="inline-block w-2 h-2 bg-accent rounded-full" />
          </Link>
          <div className="flex items-center gap-8">
            <a href="#features" onClick={() => trackNavClick('features')} className="hidden sm:inline text-xs font-medium tracking-wider text-text-secondary hover:text-accent transition-colors">Features</a>
            <a href="#pricing" onClick={() => trackNavClick('pricing')} className="hidden sm:inline text-xs font-medium tracking-wider text-text-secondary hover:text-accent transition-colors">Pricing</a>
            <Link to="/blog" onClick={() => trackNavClick('blog')} className="hidden sm:inline text-xs font-medium tracking-wider text-text-secondary hover:text-accent transition-colors">Blog</Link>
            <Link to="/login" onClick={() => trackNavClick('login')} className="text-xs font-medium tracking-wider text-text-secondary hover:text-text-primary transition-colors">Log in</Link>
            <Link to="/signup" onClick={() => trackCTA('get_started', 'nav')} className="text-xs font-semibold tracking-wider bg-accent text-white px-5 py-2 rounded-full hover:brightness-110 transition-all">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section data-section="hero" className="relative min-h-screen flex flex-col justify-center overflow-hidden pt-16">
        {/* Ambient gradient orbs */}
        <div
          className="absolute top-[15%] left-[10%] w-[500px] h-[500px] rounded-full blur-[180px]"
          style={{ background: 'radial-gradient(circle, rgba(255,85,0,0.12) 0%, transparent 70%)', animation: 'pulse-glow 6s ease-in-out infinite' }}
        />
        <div
          className="absolute bottom-[20%] right-[5%] w-[400px] h-[400px] rounded-full blur-[150px]"
          style={{ background: 'radial-gradient(circle, rgba(255,85,0,0.08) 0%, transparent 70%)', animation: 'pulse-glow 8s ease-in-out infinite 2s' }}
        />
        <div
          className="absolute top-[60%] left-[50%] w-[300px] h-[300px] rounded-full blur-[120px]"
          style={{ background: 'radial-gradient(circle, rgba(255,130,40,0.06) 0%, transparent 70%)', animation: 'pulse-glow 7s ease-in-out infinite 4s' }}
        />

        {/* Dot grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: 'radial-gradient(circle, #888 1px, transparent 1px)', backgroundSize: '32px 32px' }}
        />

        {/* Content */}
        <div className="relative z-10 max-w-[1400px] mx-auto px-[clamp(1.5rem,4vw,4rem)] w-full">
          <div className="grid lg:grid-cols-[1.2fr_1fr] gap-12 items-end">
            <div>
              <div className="flex items-center gap-3 mb-8">
                <div className="h-px w-12 bg-accent" />
                <span className="text-xs font-medium tracking-widest text-accent uppercase">Electronic Press Kits</span>
              </div>
              <h1 className="font-display font-extrabold text-[clamp(3.5rem,10vw,8rem)] leading-[0.9] tracking-tight">
                Your<br />
                Press<br />
                <span className="text-accent">Kit.</span>
              </h1>
            </div>
            <div className="flex flex-col gap-8 pb-4">
              <p className="text-[clamp(1rem,1.5vw,1.15rem)] leading-relaxed text-text-secondary max-w-[420px]">
                One link for your bio, mixes, events, rider, and booking contact. Built for DJs who take their career seriously.
              </p>
              <div className="flex gap-4">
                <Link
                  to="/signup"
                  onClick={() => trackCTA('create_your_epk', 'hero')}
                  className="px-8 py-3.5 bg-accent text-white font-semibold text-sm tracking-wider rounded-full hover:brightness-110 hover:shadow-[0_0_24px_rgba(255,85,0,0.3)] transition-all"
                >
                  Create Your EPK
                </Link>
                <a
                  href="#features"
                  onClick={() => trackCTA('learn_more', 'hero')}
                  className="px-8 py-3.5 border border-border text-text-secondary font-medium text-sm tracking-wider rounded-full hover:border-text-secondary hover:text-text-primary transition-all"
                >
                  Learn More
                </a>
              </div>
              <div className="flex gap-12 pt-4">
                {[
                  { value: '8', label: 'Sections' },
                  { value: '1', label: 'Link' },
                  { value: '$0', label: 'To Start' },
                ].map((stat) => (
                  <div key={stat.label} className="text-xs font-medium tracking-widest text-text-secondary uppercase">
                    <span className="block font-display font-bold text-2xl tracking-tight text-text-primary mb-1">{stat.value}</span>
                    {stat.label}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Equalizer bars at bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-16 overflow-hidden">
          <EqBars className="h-full" />
        </div>
      </section>

      {/* Accent line */}
      <div className="h-px bg-gradient-to-r from-transparent via-accent to-transparent" />

      {/* Features */}
      <section id="features" data-section="features" className="py-24">
        <div className="max-w-[1400px] mx-auto px-[clamp(1.5rem,4vw,4rem)]">
          <div className="flex items-center gap-4 mb-16">
            <span className="font-display font-bold text-sm tracking-wider text-accent">01</span>
            <div className="h-px w-8 bg-border" />
            <h2 className="font-display font-bold text-[clamp(1.8rem,4vw,3rem)] tracking-tight">Features</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {FEATURES.map((f, i) => (
              <div
                key={f.title}
                data-reveal
                className="group bg-surface border border-border rounded-xl p-6 hover:border-accent/50 hover:shadow-[0_0_20px_rgba(255,85,0,0.06)] transition-all duration-300"
                style={{ opacity: 0, transform: 'translateY(20px)', transition: 'opacity 0.5s ease, transform 0.5s ease' }}
              >
                <span className="inline-block font-display font-bold text-xs text-accent mb-4">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h3 className="font-display font-semibold text-base tracking-tight mb-2 group-hover:text-accent transition-colors">{f.title}</h3>
                <p className="text-sm text-text-secondary leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" data-section="pricing" className="py-24">
        <div className="max-w-[1400px] mx-auto px-[clamp(1.5rem,4vw,4rem)]">
          <div className="flex items-center gap-4 mb-16">
            <span className="font-display font-bold text-sm tracking-wider text-accent">02</span>
            <div className="h-px w-8 bg-border" />
            <h2 className="font-display font-bold text-[clamp(1.8rem,4vw,3rem)] tracking-tight">Pricing</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {/* Free */}
            <div
              data-reveal
              className="bg-surface border border-border rounded-xl p-8 flex flex-col"
              style={{ opacity: 0, transform: 'translateY(20px)', transition: 'opacity 0.5s ease, transform 0.5s ease' }}
            >
              <div className="mb-8">
                <span className="text-xs font-semibold tracking-widest text-text-secondary uppercase">Free</span>
                <div className="mt-2">
                  <span className="font-display font-bold text-4xl tracking-tight">$0</span>
                  <span className="text-text-secondary text-sm ml-2">forever</span>
                </div>
              </div>
              <ul className="space-y-3 flex-1 mb-8">
                {PRICING_FEATURES.map((row) => (
                  <li key={row.label} className="flex items-start gap-3 text-sm">
                    {row.free ? (
                      <svg className="w-4 h-4 text-accent mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 text-text-secondary/40 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M18 12H6" />
                      </svg>
                    )}
                    <span className={row.free ? 'text-text-primary' : 'text-text-secondary/50'}>{row.label}</span>
                  </li>
                ))}
              </ul>
              <Link
                to="/signup"
                onClick={() => trackCTA('start_free', 'pricing')}
                className="block text-center px-6 py-3 border border-border text-text-primary font-semibold text-sm tracking-wider rounded-full hover:border-text-secondary transition-colors"
              >
                Start Free
              </Link>
            </div>

            {/* Pro */}
            <div
              data-reveal
              className="relative bg-surface border border-accent/40 rounded-xl p-8 flex flex-col shadow-[0_0_30px_rgba(255,85,0,0.08)]"
              style={{ opacity: 0, transform: 'translateY(20px)', transition: 'opacity 0.5s ease, transform 0.5s ease' }}
            >
              <div className="absolute -top-3 right-6">
                <span className="bg-accent text-white text-[10px] font-bold tracking-widest uppercase px-3 py-1 rounded-full">
                  Recommended
                </span>
              </div>
              <div className="mb-8">
                <span className="text-xs font-semibold tracking-widest text-accent uppercase">Pro</span>
                <div className="mt-2">
                  <span className="font-display font-bold text-4xl tracking-tight">$5</span>
                  <span className="text-text-secondary text-sm ml-2">per month</span>
                </div>
              </div>
              <ul className="space-y-3 flex-1 mb-8">
                {PRICING_FEATURES.map((row) => (
                  <li key={row.label} className="flex items-start gap-3 text-sm">
                    <svg className="w-4 h-4 text-accent mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-text-primary">{row.label}</span>
                  </li>
                ))}
              </ul>
              <Link
                to="/signup"
                onClick={() => trackCTA('go_pro', 'pricing')}
                className="block text-center px-6 py-3 bg-accent text-white font-semibold text-sm tracking-wider rounded-full hover:brightness-110 hover:shadow-[0_0_20px_rgba(255,85,0,0.25)] transition-all"
              >
                Go Pro
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Blog */}
      <section data-section="blog" className="py-24">
        <div className="max-w-[1400px] mx-auto px-[clamp(1.5rem,4vw,4rem)]">
          <div className="flex items-center gap-4 mb-16">
            <span className="font-display font-bold text-sm tracking-wider text-accent">03</span>
            <div className="h-px w-8 bg-border" />
            <h2 className="font-display font-bold text-[clamp(1.8rem,4vw,3rem)] tracking-tight">From the Blog</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {BLOG_POSTS.slice(0, 3).map((post, i) => (
              <Link
                key={post.slug}
                to="/blog/$slug"
                params={{ slug: post.slug }}
                data-reveal
                className="group bg-surface border border-border rounded-xl p-8 hover:border-accent/40 transition-all duration-300"
                style={{ opacity: 0, transform: 'translateY(20px)', transition: 'opacity 0.5s ease, transform 0.5s ease' }}
              >
                <span className="font-display font-bold text-xs text-accent">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h3 className="font-display font-semibold text-base tracking-tight mt-4 mb-3 group-hover:text-accent transition-colors">
                  {post.title}
                </h3>
                <p className="text-sm text-text-secondary leading-relaxed mb-6">
                  {post.excerpt}
                </p>
                <span className="text-xs font-semibold tracking-wider text-accent opacity-0 group-hover:opacity-100 transition-opacity">
                  Read &rarr;
                </span>
              </Link>
            ))}
          </div>
          <div className="mt-8">
            <Link
              to="/blog"
              className="text-xs font-semibold tracking-wider text-text-secondary hover:text-accent transition-colors"
            >
              View all posts &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section data-section="cta" className="py-32 text-center relative overflow-hidden">
        {/* Ambient glow behind CTA */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[200px]"
          style={{ background: 'radial-gradient(circle, rgba(255,85,0,0.1) 0%, transparent 70%)' }}
        />
        <div className="relative z-10 max-w-[1400px] mx-auto px-[clamp(1.5rem,4vw,4rem)]">
          <h2 className="font-display font-extrabold text-[clamp(2.5rem,7vw,5.5rem)] tracking-tight leading-[0.95] mb-6">
            Stop Sending<br /><span className="text-accent">PDFs.</span>
          </h2>
          <p className="text-lg text-text-secondary max-w-[480px] mx-auto mb-10 leading-relaxed">
            Build your electronic press kit in minutes. Share one link with every promoter, venue, and agent.
          </p>
          <Link
            to="/signup"
            onClick={() => trackCTA('create_your_epk', 'footer_cta')}
            className="inline-block px-10 py-4 bg-accent text-white font-semibold text-sm tracking-wider rounded-full hover:brightness-110 hover:shadow-[0_0_32px_rgba(255,85,0,0.3)] transition-all"
          >
            Create Your EPK
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-6">
        <div className="max-w-[1400px] mx-auto px-[clamp(1.5rem,4vw,4rem)] flex items-center justify-between">
          <span className="font-display font-bold text-sm">myEPK <span className="text-accent">&bull;</span></span>
          <span className="text-xs text-text-secondary">&copy; {new Date().getFullYear()} myEPK</span>
        </div>
      </footer>
    </div>
  )
}
