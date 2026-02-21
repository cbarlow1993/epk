import { useAITokens } from '../AITokenProvider'
import type { SectionKey } from '~/schemas/ai-design-tokens'

interface AINavProps {
  displayName: string
  sectionOrder: SectionKey[]
  sectionVisibility: Partial<Record<SectionKey, boolean>>
}

const SECTION_LABELS: Record<SectionKey, string> = {
  hero: 'Home',
  bio: 'Bio',
  music: 'Music',
  events: 'Events',
  photos: 'Photos',
  contact: 'Contact',
}

export function AINav({ displayName, sectionOrder, sectionVisibility }: AINavProps) {
  const tokens = useAITokens()

  if (tokens.layout.navStyle === 'hidden') return null

  const visibleSections = sectionOrder.filter(
    (key) => sectionVisibility[key] !== false && key !== 'hero',
  )

  const isFixed = tokens.layout.navStyle === 'fixed'

  return (
    <nav
      className={`${isFixed ? 'fixed top-0 left-0 right-0 z-40' : ''} flex items-center justify-between px-6 py-4 backdrop-blur-sm`}
      style={{
        backgroundColor: isFixed
          ? 'color-mix(in srgb, var(--ai-color-background) 80%, transparent)'
          : 'var(--ai-color-background)',
        borderBottom: `1px solid var(--ai-color-border)`,
        fontFamily: 'var(--ai-font-body)',
      }}
    >
      <a
        href="#"
        className="font-semibold text-sm"
        style={{
          color: 'var(--ai-color-heading)',
          fontFamily: 'var(--ai-font-h3)',
        }}
      >
        {displayName}
      </a>
      <div className="flex items-center gap-6">
        {visibleSections.map((key) => (
          <a
            key={key}
            href={`#${key}`}
            className="text-xs font-medium uppercase tracking-wider hover:opacity-80 transition-opacity"
            style={{ color: 'var(--ai-color-textMuted)' }}
          >
            {SECTION_LABELS[key]}
          </a>
        ))}
      </div>
    </nav>
  )
}
