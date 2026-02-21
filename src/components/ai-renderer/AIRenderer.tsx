import { AITokenProvider } from './AITokenProvider'
import { AIHero, AIBio, AIMusic, AIEvents, AIPhotos, AIContact, AINav, AIFooter } from './sections'
import type { AIDesignTokens, SectionKey } from '~/schemas/ai-design-tokens'
import type { MixRow, EventRow, SocialLinkRow } from '~/types/database'

type PhotoRow = { id: string; image_url: string; caption: string | null; sort_order: number }

export interface AIRendererContent {
  profile: {
    display_name: string | null
    tagline: string | null
    genres: string[] | null
    profile_image_url: string | null
    hero_image_url: string | null
    hero_video_url?: string | null
    short_bio: string | null
    bio: Record<string, unknown> | null
    bpm_min: number | null
    bpm_max: number | null
    tier?: string
    hide_platform_branding?: boolean
    slug?: string
  }
  profileId: string
  mixes: MixRow[]
  events: EventRow[]
  photos: PhotoRow[]
  socialLinks: SocialLinkRow[]
  bookingContact: {
    contact_mode?: string
    manager_name: string | null
    email: string | null
    phone: string | null
  } | null
}

interface AIRendererProps {
  tokens: AIDesignTokens
  content: AIRendererContent
}

function BackgroundPattern({ pattern }: { pattern: string }) {
  if (pattern === 'none') return null

  const patternStyles: Record<string, React.CSSProperties> = {
    dots: {
      backgroundImage: 'radial-gradient(var(--ai-color-border) 1px, transparent 1px)',
      backgroundSize: '20px 20px',
    },
    grid: {
      backgroundImage:
        'linear-gradient(var(--ai-color-border) 1px, transparent 1px), linear-gradient(to right, var(--ai-color-border) 1px, transparent 1px)',
      backgroundSize: '40px 40px',
    },
    noise: {
      backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.05'/%3E%3C/svg%3E")`,
    },
    topography: {
      backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M10 30 Q 30 10, 50 30 T 90 30' fill='none' stroke='%23888' stroke-width='0.3'/%3E%3Cpath d='M10 50 Q 30 30, 50 50 T 90 50' fill='none' stroke='%23888' stroke-width='0.3'/%3E%3Cpath d='M10 70 Q 30 50, 50 70 T 90 70' fill='none' stroke='%23888' stroke-width='0.3'/%3E%3C/svg%3E")`,
      backgroundSize: '100px 100px',
    },
  }

  const style = patternStyles[pattern]
  if (!style) return null

  return (
    <div
      className="fixed inset-0 pointer-events-none z-0 opacity-30"
      style={style}
    />
  )
}

function SectionDivider({ style }: { style: string }) {
  if (style === 'none') return null

  if (style === 'line') {
    return (
      <div className="px-4">
        <div className="mx-auto" style={{ maxWidth: 'var(--ai-content-width)' }}>
          <hr style={{ borderColor: 'var(--ai-color-border)' }} />
        </div>
      </div>
    )
  }

  if (style === 'gradient') {
    return (
      <div className="px-4">
        <div className="mx-auto" style={{ maxWidth: 'var(--ai-content-width)' }}>
          <div
            className="h-px"
            style={{
              background: `linear-gradient(to right, transparent, var(--ai-color-accent), transparent)`,
            }}
          />
        </div>
      </div>
    )
  }

  if (style === 'dots') {
    return (
      <div className="flex justify-center gap-2 py-4">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: 'var(--ai-color-accent)', opacity: 0.5 }}
          />
        ))}
      </div>
    )
  }

  // wave or diagonal — simple line fallback
  return (
    <div className="px-4">
      <div className="mx-auto" style={{ maxWidth: 'var(--ai-content-width)' }}>
        <hr style={{ borderColor: 'var(--ai-color-border)' }} />
      </div>
    </div>
  )
}

export function AIRenderer({ tokens, content }: AIRendererProps) {
  const { profile, profileId, mixes, events, photos, socialLinks, bookingContact } = content

  const sectionOrder = tokens.layout.sectionOrder
  const sectionVisibility = tokens.layout.sectionVisibility

  const visibleSections = sectionOrder.filter(
    (key) => sectionVisibility[key] !== false,
  )

  const sectionComponents: Record<SectionKey, React.ReactNode> = {
    hero: (
      <AIHero
        profile={profile}
        socialLinks={socialLinks}
      />
    ),
    bio: (
      <AIBio profile={profile} />
    ),
    music: (
      <AIMusic mixes={mixes} />
    ),
    events: (
      <AIEvents events={events} />
    ),
    photos: (
      <AIPhotos photos={photos} />
    ),
    contact: (
      <AIContact
        profileId={profileId}
        bookingContact={bookingContact}
        socialLinks={socialLinks}
      />
    ),
  }

  return (
    <AITokenProvider tokens={tokens}>
      <div
        className="min-h-screen relative"
        style={{
          backgroundColor: 'var(--ai-color-background)',
          color: 'var(--ai-color-text)',
          fontFamily: 'var(--ai-font-body)',
          fontSize: 'var(--ai-size-body)',
          fontWeight: 'var(--ai-weight-body)',
        }}
      >
        <BackgroundPattern pattern={tokens.decorative.backgroundPattern} />

        <AINav
          displayName={profile.display_name || 'DJ'}
          sectionOrder={sectionOrder}
          sectionVisibility={sectionVisibility}
        />

        {/* Add top padding if nav is fixed */}
        {tokens.layout.navStyle === 'fixed' && <div className="h-14" />}

        <main className="relative z-10">
          {visibleSections.map((key, index) => (
            <div key={key}>
              {/* Divider between sections (not before first) */}
              {index > 0 && key !== 'hero' && (
                <SectionDivider style={tokens.decorative.dividerStyle} />
              )}
              {sectionComponents[key]}
            </div>
          ))}
        </main>

        <AIFooter
          displayName={profile.display_name || 'DJ'}
          socialLinks={socialLinks}
          hideBranding={profile.hide_platform_branding}
          tier={profile.tier}
        />
      </div>
    </AITokenProvider>
  )
}
