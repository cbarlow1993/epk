import { useState, useEffect } from 'react'

interface NavSection {
  label: string
  href: string
}

interface NavProps {
  displayName: string
  sections: NavSection[]
}

export function Nav({ displayName, sections }: NavProps) {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-white/80 backdrop-blur-md shadow-card' : 'bg-transparent'
      }`}
    >
      <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        <a href="#" className="text-lg font-display font-semibold tracking-tight">{displayName}</a>
        <div className="hidden md:flex gap-6">
          {sections.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              {item.label}
            </a>
          ))}
        </div>
      </div>
    </nav>
  )
}
