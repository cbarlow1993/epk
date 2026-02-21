import { useAITokens } from '../AITokenProvider'
import type { SocialLinkRow } from '~/types/database'
import { SocialIcon } from '~/components/SocialIcon'

interface AIHeroProps {
  profile: {
    display_name: string | null
    tagline: string | null
    genres: string[] | null
    hero_image_url: string | null
    hero_video_url?: string | null
    profile_image_url: string | null
    bpm_min: number | null
    bpm_max: number | null
  }
  socialLinks: SocialLinkRow[]
}

export function AIHero({ profile, socialLinks }: AIHeroProps) {
  const tokens = useAITokens()
  const hero = tokens.sections.hero

  switch (hero.variant) {
    case 'fullscreen':
      return <HeroFullscreen profile={profile} socialLinks={socialLinks} />
    case 'split':
      return <HeroSplit profile={profile} socialLinks={socialLinks} />
    case 'minimal':
      return <HeroMinimal profile={profile} socialLinks={socialLinks} />
    case 'video-bg':
      return <HeroVideoBg profile={profile} socialLinks={socialLinks} />
    case 'parallax':
      return <HeroParallax profile={profile} socialLinks={socialLinks} />
    default:
      return <HeroFullscreen profile={profile} socialLinks={socialLinks} />
  }
}

function SocialLinksList({ links }: { links: SocialLinkRow[] }) {
  if (links.length === 0) return null
  return (
    <div className="flex items-center justify-center gap-4 mt-6">
      {links.map((link) => (
        <a
          key={link.id}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          title={link.platform}
          aria-label={`${link.platform} profile`}
          className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center text-white/70 hover:text-white hover:border-white/50 transition-colors"
        >
          <SocialIcon platform={link.platform} />
        </a>
      ))}
    </div>
  )
}

function GenreTags({ genres }: { genres: string[] | null }) {
  if (!genres || genres.length === 0) return null
  return (
    <div className="flex flex-wrap justify-center gap-2 mt-4">
      {genres.map((genre) => (
        <span
          key={genre}
          className="px-3 py-1 text-xs font-semibold uppercase tracking-wider"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--ai-color-accent) 20%, transparent)',
            color: 'var(--ai-color-accent)',
          }}
        >
          {genre}
        </span>
      ))}
    </div>
  )
}

function HeroFullscreen({ profile, socialLinks }: AIHeroProps) {
  const tokens = useAITokens()
  const hero = tokens.sections.hero

  return (
    <section
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
      style={{
        background: hero.background || 'var(--ai-color-background)',
        color: hero.textColor || 'var(--ai-color-heading)',
        padding: hero.padding,
      }}
    >
      {profile.hero_image_url && (
        <img
          src={profile.hero_image_url}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}
      <div
        className="absolute inset-0"
        style={{ background: `rgba(0,0,0,${hero.overlayOpacity ?? 0.5})` }}
      />
      <div
        className="relative z-10 px-4"
        style={{ textAlign: hero.titleAlignment || 'center' }}
      >
        <h1
          style={{
            fontFamily: 'var(--ai-font-display)',
            fontSize: 'var(--ai-size-display)',
            fontWeight: 'var(--ai-weight-display)',
            textTransform: tokens.typography.display.textTransform || undefined,
            letterSpacing: tokens.typography.display.letterSpacing || undefined,
          }}
        >
          {profile.display_name || 'DJ'}
        </h1>
        {hero.showSubtitle !== false && profile.tagline && (
          <p
            className="mt-4 text-lg opacity-70"
            style={{ fontFamily: 'var(--ai-font-body)' }}
          >
            {profile.tagline}
          </p>
        )}
        {hero.showGenres !== false && <GenreTags genres={profile.genres} />}
        <SocialLinksList links={socialLinks} />
      </div>
    </section>
  )
}

function HeroSplit({ profile, socialLinks }: AIHeroProps) {
  const tokens = useAITokens()
  const hero = tokens.sections.hero

  return (
    <section
      className="grid md:grid-cols-2 min-h-[70vh]"
      style={{
        background: hero.background || 'var(--ai-color-background)',
        color: hero.textColor || 'var(--ai-color-heading)',
        padding: hero.padding,
      }}
    >
      <div className="flex flex-col justify-center px-8 py-16 md:px-16">
        <h1
          style={{
            fontFamily: 'var(--ai-font-display)',
            fontSize: 'var(--ai-size-display)',
            fontWeight: 'var(--ai-weight-display)',
            textTransform: tokens.typography.display.textTransform || undefined,
            letterSpacing: tokens.typography.display.letterSpacing || undefined,
          }}
        >
          {profile.display_name || 'DJ'}
        </h1>
        {hero.showSubtitle !== false && profile.tagline && (
          <p
            className="mt-4 text-lg"
            style={{ color: 'var(--ai-color-textMuted)', fontFamily: 'var(--ai-font-body)' }}
          >
            {profile.tagline}
          </p>
        )}
        {hero.showGenres !== false && (
          <div className="mt-4">
            <GenreTags genres={profile.genres} />
          </div>
        )}
        <SocialLinksList links={socialLinks} />
      </div>
      <div className="relative overflow-hidden">
        {profile.hero_image_url ? (
          <img
            src={profile.hero_image_url}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : profile.profile_image_url ? (
          <img
            src={profile.profile_image_url}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div
            className="absolute inset-0"
            style={{ background: 'var(--ai-color-surface)' }}
          />
        )}
      </div>
    </section>
  )
}

function HeroMinimal({ profile, socialLinks }: AIHeroProps) {
  const tokens = useAITokens()
  const hero = tokens.sections.hero

  return (
    <section
      className="py-24 md:py-32 px-4"
      style={{
        background: hero.background || 'var(--ai-color-background)',
        color: hero.textColor || 'var(--ai-color-heading)',
        padding: hero.padding,
      }}
    >
      <div
        className="mx-auto"
        style={{ maxWidth: 'var(--ai-content-width)', textAlign: hero.titleAlignment || 'center' }}
      >
        <h1
          style={{
            fontFamily: 'var(--ai-font-display)',
            fontSize: 'var(--ai-size-display)',
            fontWeight: 'var(--ai-weight-display)',
            textTransform: tokens.typography.display.textTransform || undefined,
            letterSpacing: tokens.typography.display.letterSpacing || undefined,
          }}
        >
          {profile.display_name || 'DJ'}
        </h1>
        {hero.showSubtitle !== false && profile.tagline && (
          <p
            className="mt-4 text-lg"
            style={{ color: 'var(--ai-color-textMuted)', fontFamily: 'var(--ai-font-body)' }}
          >
            {profile.tagline}
          </p>
        )}
        {hero.showGenres !== false && <GenreTags genres={profile.genres} />}
        <SocialLinksList links={socialLinks} />
      </div>
    </section>
  )
}

function HeroVideoBg({ profile, socialLinks }: AIHeroProps) {
  const tokens = useAITokens()
  const hero = tokens.sections.hero

  return (
    <section
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
      style={{
        background: hero.background || 'var(--ai-color-background)',
        color: hero.textColor || 'var(--ai-color-heading)',
        padding: hero.padding,
      }}
    >
      {profile.hero_video_url ? (
        <video
          src={profile.hero_video_url}
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : profile.hero_image_url ? (
        <img
          src={profile.hero_image_url}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : null}
      <div
        className="absolute inset-0"
        style={{ background: `rgba(0,0,0,${hero.overlayOpacity ?? 0.6})` }}
      />
      <div
        className="relative z-10 text-center px-4"
        style={{ textAlign: hero.titleAlignment || 'center' }}
      >
        <h1
          style={{
            fontFamily: 'var(--ai-font-display)',
            fontSize: 'var(--ai-size-display)',
            fontWeight: 'var(--ai-weight-display)',
            textTransform: tokens.typography.display.textTransform || undefined,
            letterSpacing: tokens.typography.display.letterSpacing || undefined,
          }}
        >
          {profile.display_name || 'DJ'}
        </h1>
        {hero.showSubtitle !== false && profile.tagline && (
          <p
            className="mt-4 text-lg opacity-70"
            style={{ fontFamily: 'var(--ai-font-body)' }}
          >
            {profile.tagline}
          </p>
        )}
        {hero.showGenres !== false && <GenreTags genres={profile.genres} />}
        <SocialLinksList links={socialLinks} />
      </div>
    </section>
  )
}

function HeroParallax({ profile, socialLinks }: AIHeroProps) {
  const tokens = useAITokens()
  const hero = tokens.sections.hero

  return (
    <section
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
      style={{
        background: hero.background || 'var(--ai-color-background)',
        color: hero.textColor || 'var(--ai-color-heading)',
        padding: hero.padding,
      }}
    >
      {profile.hero_image_url && (
        <div
          className="absolute inset-0 bg-fixed bg-center bg-cover"
          style={{ backgroundImage: `url(${profile.hero_image_url})` }}
        />
      )}
      <div
        className="absolute inset-0"
        style={{ background: `rgba(0,0,0,${hero.overlayOpacity ?? 0.5})` }}
      />
      <div
        className="relative z-10 text-center px-4"
        style={{ textAlign: hero.titleAlignment || 'center' }}
      >
        <h1
          style={{
            fontFamily: 'var(--ai-font-display)',
            fontSize: 'var(--ai-size-display)',
            fontWeight: 'var(--ai-weight-display)',
            textTransform: tokens.typography.display.textTransform || undefined,
            letterSpacing: tokens.typography.display.letterSpacing || undefined,
          }}
        >
          {profile.display_name || 'DJ'}
        </h1>
        {hero.showSubtitle !== false && profile.tagline && (
          <p
            className="mt-4 text-lg opacity-70"
            style={{ fontFamily: 'var(--ai-font-body)' }}
          >
            {profile.tagline}
          </p>
        )}
        {hero.showGenres !== false && <GenreTags genres={profile.genres} />}
        <SocialLinksList links={socialLinks} />
      </div>
    </section>
  )
}
