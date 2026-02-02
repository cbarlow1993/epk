const COMMERCIAL_MIXES = [
  { title: 'Ministry Of Sound, Room 103', href: '#' },
  { title: 'Switch Disco', href: '#' },
  { title: 'Craig David', href: '#' },
  { title: 'Splash Hits', href: '#' },
  { title: 'DJEZ', href: '#' },
  { title: 'Love Juice', href: '#' },
]

const MELODIC_MIXES = [
  { title: 'Ministry Of Sound, The Box', href: '#' },
  { title: 'EGG LND (Electro)', href: '#' },
  { title: 'Eden Ibiza', href: '#' },
]

export function Highlights() {
  return (
    <section id="highlights" className="py-20 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="grid md:grid-cols-2 gap-12 md:gap-16">
          {/* Commercial */}
          <div>
            <div className="w-20 h-1 bg-accent mb-8 shadow-[0_0_10px_var(--color-accent-glow)]" />
            <h2 className="text-3xl md:text-4xl font-black uppercase tracking-wider mb-2">Commercial</h2>
            <h3 className="text-2xl md:text-3xl font-black uppercase tracking-wider text-text-secondary mb-8">Highlights</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {COMMERCIAL_MIXES.map((mix) => (
                <MixCard key={mix.title} {...mix} />
              ))}
            </div>
          </div>

          {/* Melodic & Progressive */}
          <div>
            <div className="w-20 h-1 bg-accent mb-8 shadow-[0_0_10px_var(--color-accent-glow)]" />
            <h2 className="text-3xl md:text-4xl font-black uppercase tracking-wider mb-2">Melodic &amp;</h2>
            <h3 className="text-2xl md:text-3xl font-black uppercase tracking-wider text-text-secondary mb-8">Progressive Highlights</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {MELODIC_MIXES.map((mix) => (
                <MixCard key={mix.title} {...mix} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function MixCard({ title, href }: { title: string; href: string }) {
  return (
    <a
      href={href}
      className="group block bg-dark-card backdrop-blur-sm rounded-lg overflow-hidden border border-white/5 hover:border-accent/30 transition-all"
    >
      {/* Placeholder thumbnail */}
      <div className="aspect-square bg-gradient-to-br from-dark-surface to-dark-bg flex items-center justify-center">
        <svg className="w-8 h-8 text-text-secondary/30 group-hover:text-accent transition-colors" fill="currentColor" viewBox="0 0 24 24">
          <path d="M8 5v14l11-7z" />
        </svg>
      </div>
      <div className="p-3">
        <p className="text-xs text-text-secondary truncate mb-2">{title}</p>
        <span className="text-xs uppercase tracking-widest font-bold text-accent">Listen</span>
      </div>
    </a>
  )
}
