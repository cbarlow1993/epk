const EVENTS = [
  'Room 103 - Ministry Of Sound',
  'Love Juice',
  'Dizzee Rascal - Ministry Of Sound',
  'Future Citizens Vol. 3 - Ministry Of Sound',
  'Future Citizens Launch Party - Ministry Of Sound',
  'May 23rd',
  'Ibiza Rocks Residents',
  'Wildfire',
  'Le Plongeoir',
  'Linekers Y',
  'Guildford Mirage Project',
  'Joel Corry - Ministry Of Sound',
  'Future Citizens Vol. 2',
  'Splash Hits',
  'Love Juice',
  'DJEZ',
  'EGG LDN',
  'Flex FM',
  'Select',
  'Itaca Ibiza',
  'Ibiza Rocks',
  'Craig David TS5',
  'Eden',
  'Switch Disco',
]

export function Events() {
  return (
    <section id="events" className="py-20 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="w-20 h-1 bg-accent mb-8 shadow-[0_0_10px_var(--color-accent-glow)]" />
        <h2 className="text-4xl md:text-5xl font-black uppercase tracking-wider mb-12">
          Events <span className="text-accent">&amp;</span> Brands
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {EVENTS.map((event, i) => (
            <div
              key={`${event}-${i}`}
              className="aspect-square bg-dark-card backdrop-blur-sm rounded-lg border border-white/5 flex items-center justify-center p-3 hover:border-accent/30 transition-all"
            >
              <p className="text-xs text-center text-text-secondary leading-tight">{event}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
