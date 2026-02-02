import { createFileRoute, Link } from '@tanstack/react-router'

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
  { title: 'Bio & Profile', desc: 'Two-column bio, profile photo, hero image, tagline, genres.' },
  { title: 'Music & Mixes', desc: 'Showcase your sets with SoundCloud/Mixcloud links, categorised by genre.' },
  { title: 'Events & Brands', desc: 'Display event flyers and brand logos in a visual grid.' },
  { title: 'Technical Rider', desc: 'Share your preferred and alternative DJ setup requirements.' },
  { title: 'Press Assets', desc: 'Upload photos, videos, and logos for promoters to download.' },
  { title: 'Booking Contact', desc: 'Manager name, email, phone — easy for promoters to reach you.' },
  { title: 'Social Links', desc: 'Connect all your social profiles in one place.' },
  { title: 'Custom Themes', desc: 'Pick your colours, font, and make it match your brand.' },
]

const PRICING = [
  {
    name: 'Free',
    price: '£0',
    period: 'forever',
    features: ['Full EPK page', 'All content sections', 'yourname.djepk.com URL', 'Social links', 'Platform branding in footer'],
    cta: 'Get Started Free',
    highlight: false,
  },
  {
    name: 'Pro',
    price: '£9',
    period: '/month',
    features: ['Everything in Free', 'Custom domain', 'Remove platform branding', 'Priority support', 'Full theme customisation'],
    cta: 'Upgrade to Pro',
    highlight: true,
  },
]

function LandingPage() {
  return (
    <div className="min-h-screen bg-dark-bg">
      {/* Nav */}
      <nav className="max-w-6xl mx-auto px-4 py-6 flex items-center justify-between">
        <span className="text-lg font-bold tracking-wider">DJ EPK</span>
        <div className="flex gap-4 items-center">
          <Link to="/login" className="text-sm text-text-secondary hover:text-white transition-colors">Log in</Link>
          <Link to="/signup" className="text-sm bg-accent hover:bg-accent/80 text-white px-4 py-2 rounded-lg transition-colors font-bold">Sign up free</Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-4 py-24 md:py-32 text-center">
        <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-6">
          Your DJ Press Kit,<br />Online.
        </h1>
        <p className="text-xl text-text-secondary mb-12 max-w-2xl mx-auto leading-relaxed">
          Create a professional Electronic Press Kit in minutes. Share your bio, mixes, events, technical rider and booking info — all in one link.
        </p>
        <Link
          to="/signup"
          className="inline-block bg-accent hover:bg-accent/80 text-white font-bold uppercase tracking-widest px-8 py-4 rounded-lg transition-colors text-lg"
        >
          Get Started Free
        </Link>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <div className="w-20 h-1 bg-accent mx-auto mb-8 shadow-[0_0_10px_var(--color-accent-glow)]" />
          <h2 className="text-3xl md:text-4xl font-black uppercase tracking-wider">Everything You Need</h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {FEATURES.map((f) => (
            <div key={f.title} className="bg-dark-card border border-white/5 rounded-lg p-6 hover:border-accent/20 transition-colors">
              <h3 className="font-bold text-sm uppercase tracking-wider mb-2">{f.title}</h3>
              <p className="text-text-secondary text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="max-w-4xl mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <div className="w-20 h-1 bg-accent mx-auto mb-8 shadow-[0_0_10px_var(--color-accent-glow)]" />
          <h2 className="text-3xl md:text-4xl font-black uppercase tracking-wider">Simple Pricing</h2>
        </div>
        <div className="grid md:grid-cols-2 gap-8">
          {PRICING.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-xl p-8 border ${plan.highlight ? 'border-accent bg-accent/5' : 'border-white/10 bg-dark-card'}`}
            >
              <h3 className="text-lg font-bold uppercase tracking-wider mb-2">{plan.name}</h3>
              <div className="mb-6">
                <span className="text-4xl font-black">{plan.price}</span>
                <span className="text-text-secondary text-sm ml-1">{plan.period}</span>
              </div>
              <ul className="space-y-3 mb-8">
                {plan.features.map((f) => (
                  <li key={f} className="text-sm text-text-secondary flex items-start gap-2">
                    <span className="text-accent mt-0.5">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                to="/signup"
                className={`block text-center py-3 rounded-lg font-bold uppercase tracking-widest text-sm transition-colors ${
                  plan.highlight
                    ? 'bg-accent hover:bg-accent/80 text-white'
                    : 'bg-white/10 hover:bg-white/20 text-white'
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-4xl mx-auto px-4 py-20 text-center">
        <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-6">
          Ready to stand out?
        </h2>
        <p className="text-text-secondary text-lg mb-8">Join DJs and artists who are taking their press kit online.</p>
        <Link
          to="/signup"
          className="inline-block bg-accent hover:bg-accent/80 text-white font-bold uppercase tracking-widest px-8 py-4 rounded-lg transition-colors text-lg"
        >
          Create Your EPK
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8">
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-between text-xs text-text-secondary">
          <span>DJ EPK</span>
          <span>© {new Date().getFullYear()}</span>
        </div>
      </footer>
    </div>
  )
}
