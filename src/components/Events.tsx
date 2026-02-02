const EVENTS = [
  // Row 1
  { name: 'Room 103\nMinistry Of Sound', image: '/images/events/room-103-ministry-of-sound.png', href: '#' },
  { name: 'Ibiza Rocks', image: '/images/events/ibiza-rocks.png', href: '#' },
  { name: 'Craig David TS5', image: '/images/events/craig-david-ts5.png', href: '#' },
  { name: 'Eden', image: '/images/events/eden.png', href: '#' },
  { name: 'Switch Disco', image: '/images/events/switch-disco.png', href: '#' },
  // Row 2
  { name: 'Love Juice', image: '/images/events/love-juice-ibiza-2025.png', href: '#' },
  { name: 'EGG LDN', image: '/images/events/egg-ldn.png', href: '#' },
  { name: 'Flex FM', image: '/images/events/flex-fm.png', href: '#' },
  { name: 'Select', image: '/images/events/select.png', href: '#' },
  { name: 'Itaca Ibiza', image: '/images/events/itaca-ibiza.png', href: '#' },
  // Row 3
  { name: 'Joel Corry', image: '/images/events/joel-corry.png', href: '#' },
  { name: 'Future Citizens Vol. 2', image: '/images/events/future-citizens-vol-2.png', href: '#' },
  { name: 'Splash Hits', image: '/images/events/splash-hits.png', href: '#' },
  { name: 'Love Juice', image: '/images/events/love-juice-2.png', href: '#' },
  { name: 'DJEZ', image: '/images/events/djez.png', href: '#' },
  // Row 4
  { name: 'Dizzee Rascal', image: '/images/events/dizzee-rascal.png', href: '#' },
  { name: 'Le Plongeoir', image: '/images/events/le-plongeoir.png', href: '#' },
  { name: 'Linekers', image: '/images/events/linekers.png', href: '#' },
  { name: 'Y Guildford', image: '/images/events/y-guildford.png', href: '#' },
  { name: 'Mirage Project', image: '/images/events/mirage-project.png', href: '#' },
  // Row 5
  { name: 'Future Citizens Vol. 3', image: '/images/events/future-citizens-vol-3.png', href: '#' },
  { name: 'Wildfire', image: '/images/events/wildfire.png', href: '#' },
  { name: 'Future Citizens\nLaunch Party', image: '/images/events/future-citizens-launch-party.png', href: '#' },
  { name: 'Ministry Of Sound\nMay 23rd', image: '/images/events/ministry-of-sound-may-23rd.png', href: '#' },
  { name: 'Ibiza Rocks\nResidents', image: '/images/events/ibiza-rocks-residents.png', href: '#' },
]

export function Events() {
  return (
    <section id="events" className="py-20 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="w-20 h-1 bg-accent mb-8 shadow-[0_0_10px_var(--color-accent-glow)]" />
        <h2 className="text-4xl md:text-5xl font-black uppercase tracking-wider mb-12">
          Events <span className="text-accent">&amp;</span> Brands
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {EVENTS.map((event, i) => (
            <a
              key={`${event.name}-${i}`}
              href={event.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group block rounded-lg overflow-hidden border border-white/5 hover:border-accent/30 transition-all hover:scale-105"
            >
              <div className="aspect-square overflow-hidden">
                <img
                  src={event.image}
                  alt={event.name.replace('\n', ' ')}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                  loading="lazy"
                />
              </div>
              <div className="bg-dark-card/80 backdrop-blur-sm px-3 py-2">
                <p className="text-xs text-center text-text-secondary leading-tight whitespace-pre-line">
                  {event.name}
                </p>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  )
}
