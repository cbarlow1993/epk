interface NavSection {
  label: string
  href: string
}

interface NavProps {
  displayName: string
  sections: NavSection[]
}

export function Nav({ displayName, sections }: NavProps) {

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 bg-transparent"
    >
      <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        <a href="#" className="font-display font-extrabold text-lg tracking-tight">{displayName}</a>
        <div className="hidden md:flex gap-6">
          {sections.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-xs font-medium uppercase tracking-wider text-text-secondary hover:text-accent transition-colors"
            >
              {item.label}
            </a>
          ))}
        </div>
      </div>
    </nav>
  )
}
