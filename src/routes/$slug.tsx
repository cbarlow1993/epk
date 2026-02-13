import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { getPublicProfile } from '~/server/public-profile'
import { Nav } from '~/components/Nav'
import { sanitize, sanitizeEmbed } from '~/utils/sanitize'
import { BlockRenderer } from '~/components/BlockRenderer'
import { EPKSection } from '~/components/EPKSection'
import { Analytics, trackSectionView } from '~/components/Analytics'
import { getTemplate, resolveTheme } from '~/utils/templates'
import { isLightBackground } from '~/utils/color'
import type { MixRow, EventRow, SocialLinkRow, FileRow } from '~/types/database'
import { formatEventDate } from '~/utils/dates'

type PhotoRow = { id: string; image_url: string; caption: string | null; sort_order: number }

// Theme search params accepted in preview mode
const THEME_SEARCH_KEYS = [
  'accent_color', 'bg_color', 'font_family', 'template',
  'hero_style', 'bio_layout', 'events_layout', 'music_layout', 'animate_sections',
  'theme_display_font', 'theme_display_size', 'theme_display_weight',
  'theme_heading_font', 'theme_heading_size', 'theme_heading_weight',
  'theme_subheading_font', 'theme_subheading_size', 'theme_subheading_weight',
  'theme_body_font', 'theme_body_size', 'theme_body_weight',
  'theme_text_color', 'theme_heading_color', 'theme_link_color',
  'theme_card_bg', 'theme_border_color',
  'theme_section_padding', 'theme_content_width', 'theme_card_radius', 'theme_element_gap',
  'theme_button_style', 'theme_link_style',
  'theme_card_border', 'theme_shadow', 'theme_divider_style',
] as const

export const Route = createFileRoute('/$slug')({
  validateSearch: (search: Record<string, unknown>) => {
    const result: Record<string, unknown> = {
      preview: search.preview === 'true',
      // Legacy short params (backward compat)
      accent: (search.accent as string) || undefined,
      bg: (search.bg as string) || undefined,
      font: (search.font as string) || undefined,
      hero: (search.hero as string) || undefined,
      bioLayout: (search.bioLayout as string) || undefined,
      sections: (search.sections as string) || undefined,
    }
    // Pass through all theme_* and known field params for preview
    for (const key of THEME_SEARCH_KEYS) {
      if (typeof search[key] === 'string' && search[key]) {
        result[key] = search[key] as string
      }
    }
    return result as Record<string, string | boolean | undefined>
  },
  loader: ({ params }) => getPublicProfile({ data: params.slug }),
  head: ({ loaderData }) => {
    const profile = loaderData?.profile
    const name = profile?.display_name || 'DJ'
    const templateConfig = getTemplate(profile?.template || 'default')
    const theme = resolveTheme(profile as Record<string, unknown> || {}, templateConfig)

    // Collect unique Google Fonts from all tiers
    const customFontNames = new Set(
      ((profile?.theme_custom_fonts as Array<{name: string}>) || []).map(f => f.name)
    )
    const googleFonts = new Set<string>()
    for (const font of [theme.displayFont, theme.headingFont, theme.subheadingFont, theme.bodyFont]) {
      if (!customFontNames.has(font)) googleFonts.add(font)
    }
    const fontParam = [...googleFonts].map(f => `family=${f.replace(/ /g, '+')}:wght@300;400;500;600;700;800;900`).join('&')
    const tagline = profile?.tagline
    const genres = profile?.genres as string[] | undefined
    const autoTitle = `${name} | DJ - Official Press Kit`
    const autoDescription = [
      `Official Electronic Press Kit for ${name}.`,
      tagline,
      genres?.length ? genres.join(', ') : null,
    ].filter(Boolean).join(' — ')

    const isPro = profile?.tier === 'pro'
    const ogTitle = isPro ? (profile?.og_title || autoTitle) : `${name} | myepk.bio`
    const ogDescription = isPro
      ? (profile?.og_description || profile?.meta_description || autoDescription)
      : (profile?.meta_description || autoDescription)
    const ogImage = profile?.og_image_url || profile?.profile_image_url || ''
    const twitterCard = isPro ? (profile?.twitter_card_type || 'summary_large_image') : 'summary_large_image'
    const siteBase = import.meta.env.VITE_SITE_URL || 'https://myepk.bio'
    const ogUrl = profile?.custom_domain
      ? `https://${profile.custom_domain}`
      : `${siteBase}/${profile?.slug || ''}`

    return {
      meta: [
        { title: isPro ? autoTitle : `${name} | myepk.bio` },
        { name: 'description', content: profile?.meta_description || autoDescription },
        { property: 'og:title', content: ogTitle },
        { property: 'og:description', content: ogDescription },
        { property: 'og:type', content: 'website' },
        { property: 'og:url', content: ogUrl },
        ...(ogImage ? [{ property: 'og:image', content: ogImage }] : []),
        { name: 'twitter:card', content: twitterCard },
        { name: 'twitter:title', content: ogTitle },
        { name: 'twitter:description', content: ogDescription },
        ...(ogImage ? [{ name: 'twitter:image', content: ogImage }] : []),
      ],
      links: [
        ...(profile?.favicon_url ? [{ rel: 'icon', href: profile.favicon_url }] : []),
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'stylesheet', href: `https://fonts.googleapis.com/css2?${fontParam}&display=swap` },
      ],
    }
  },
  component: PublicEPK,
  notFoundComponent: () => (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <p className="text-text-secondary">This EPK page doesn't exist.</p>
    </div>
  ),
})

function BioContent({ bio, proseClass, textSecClass, accentColor }: {
  bio: import('@editorjs/editorjs').OutputData
  proseClass: string
  textSecClass: string
  accentColor: string
}) {
  const [expanded, setExpanded] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)
  const isLong = bio.blocks && bio.blocks.length > 3

  return (
    <div className={`${textSecClass} leading-relaxed`}>
      <div
        ref={contentRef}
        className="overflow-hidden transition-[max-height] duration-500 ease-in-out"
        style={{ maxHeight: !isLong || expanded ? '9999px' : '16rem' }}
      >
        <BlockRenderer data={bio} className={proseClass} />
      </div>
      {isLong && !expanded && (
        <div className="relative -mt-12 pt-12 bg-gradient-to-t from-inherit">
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="text-sm font-semibold uppercase tracking-wider hover:underline"
            style={{ color: accentColor }}
          >
            Read more
          </button>
        </div>
      )}
      {isLong && expanded && (
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="mt-4 text-sm font-semibold uppercase tracking-wider hover:underline"
          style={{ color: accentColor }}
        >
          Read less
        </button>
      )}
    </div>
  )
}

function MailchimpForm({ profileId, heading, buttonText, textSecClass }: {
  profileId: string
  heading: string
  buttonText: string
  textSecClass: string
}) {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('loading')

    const { subscribeMailchimp } = await import('~/server/integrations')
    const result = await subscribeMailchimp({ data: { profileId, email } })

    if ('error' in result && result.error) {
      setStatus('error')
      setMessage(result.error as string)
    } else {
      setStatus('success')
      setMessage('Thanks for subscribing!')
      setEmail('')
    }
  }

  return (
    <div className="max-w-md mx-auto text-center">
      <p className={`${textSecClass} mb-4`}>{heading}</p>
      {status === 'success' ? (
        <p className="text-green-600 font-semibold text-sm">{message}</p>
      ) : (
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Your email"
            className="flex-1 bg-transparent border border-current/20 px-4 py-2 text-sm placeholder-current/40 focus:border-accent focus:outline-none"
          />
          <button
            type="submit"
            disabled={status === 'loading'}
            className="px-6 py-2 text-xs font-semibold uppercase tracking-wider bg-accent text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {status === 'loading' ? '...' : buttonText}
          </button>
        </form>
      )}
      {status === 'error' && <p className="text-red-500 text-xs mt-2">{message}</p>}
    </div>
  )
}

function PublicEPK() {
  const data = Route.useLoaderData()
  const search = Route.useSearch()

  // Preview mode: receive live theme updates via postMessage (no iframe reload)
  const [previewOverrides, setPreviewOverrides] = useState<Record<string, string>>({})
  useEffect(() => {
    if (!search.preview) return
    function handleMessage(e: MessageEvent) {
      if (e.data?.type === 'theme-update' && e.data.values) {
        setPreviewOverrides(e.data.values)
      }
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [search.preview])

  if (!data) return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <p className="text-text-secondary">Page not found.</p>
    </div>
  )

  const { profile, socialLinks, mixes, events, technicalRider, bookingContact, pressAssets, photos: rawPhotos } = data
  const photos = (rawPhotos || []) as PhotoRow[]

  // Build search overrides from URL params or postMessage (preview mode)
  const s = search as Record<string, string | boolean | undefined>
  const ov = Object.keys(previewOverrides).length > 0 ? previewOverrides : null

  const searchOverrides: Record<string, string | undefined> = {}
  if (ov) {
    // postMessage overrides are the sole source of truth for theme keys
    for (const [key, value] of Object.entries(ov)) {
      if (value != null && value !== '') {
        searchOverrides[key] = value
      }
    }
  } else {
    // Initial load: use URL search params
    searchOverrides.accent_color = (s.accent_color as string) || (search.accent as string | undefined)
    searchOverrides.bg_color = (s.bg_color as string) || (search.bg as string | undefined)
    if (search.font) {
      searchOverrides.theme_display_font = search.font as string
      searchOverrides.theme_body_font = search.font as string
    }
    for (const key of THEME_SEARCH_KEYS) {
      const val = s[key]
      if (typeof val === 'string' && val && !(key in searchOverrides && searchOverrides[key])) {
        searchOverrides[key] = val
      }
    }
  }

  const searchTemplate = ov ? ov.template : (s.template as string | undefined)
  const templateConfig = getTemplate(searchTemplate || profile.template || 'default')
  const theme = resolveTheme(
    profile as Record<string, unknown>,
    templateConfig,
    searchOverrides,
  )

  const heroStyle = (ov ? ov.hero_style : (s.hero_style as string)) || (search.hero as string | undefined) || profile.hero_style || templateConfig.heroStyle
  const bioLayout = (ov ? ov.bio_layout : (s.bio_layout as string)) || (search.bioLayout as string | undefined) || profile.bio_layout || templateConfig.bioLayout
  const eventsLayout = (ov ? ov.events_layout : (s.events_layout as string)) || profile.events_layout || templateConfig.eventsLayout
  const musicLayout = (ov ? ov.music_layout : (s.music_layout as string)) || profile.music_layout || templateConfig.musicLayout
  const sectionOrder = search.sections
    ? (search.sections as string).split(',')
    : profile.section_order || templateConfig.sectionOrder
  const sectionVisibility = (profile.section_visibility || {}) as Record<string, boolean>
  const rawAnimateSections = ov ? ov.animate_sections : (s.animate_sections as string | undefined)
  const animateSections = rawAnimateSections != null ? rawAnimateSections !== 'false' : profile.animate_sections !== false

  const accent = theme.accent
  const bg = theme.bg
  const name = profile.display_name || 'DJ'
  const isLight = isLightBackground(bg)

  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  // Track section views via IntersectionObserver
  const mainRef = useRef<HTMLElement>(null)
  useEffect(() => {
    if (typeof window === 'undefined' || !mainRef.current) return

    const tracked = new Set<string>()
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = entry.target.id
          if (entry.isIntersecting && id && !tracked.has(id)) {
            tracked.add(id)
            trackSectionView(profile.slug as string, id)
          }
        }
      },
      { threshold: 0.3 }
    )

    const sections = mainRef.current.querySelectorAll('section[id]')
    sections.forEach((section) => observer.observe(section))

    return () => observer.disconnect()
  }, [profile.slug])

  // Inject third-party analytics scripts
  useEffect(() => {
    if (typeof window === 'undefined') return
    const intList = data?.integrations || []

    const ga = intList.find((i: { type: string }) => i.type === 'google_analytics')
    if (ga) {
      const mid = (ga.config as { measurement_id: string }).measurement_id
      if (mid) {
        const script1 = document.createElement('script')
        script1.src = `https://www.googletagmanager.com/gtag/js?id=${mid}`
        script1.async = true
        document.head.appendChild(script1)

        const script2 = document.createElement('script')
        script2.textContent = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${mid}');`
        document.head.appendChild(script2)
      }
    }

    const pl = intList.find((i: { type: string }) => i.type === 'plausible')
    if (pl) {
      const domain = (pl.config as { domain: string }).domain
      if (domain) {
        const script = document.createElement('script')
        script.src = 'https://plausible.io/js/script.js'
        script.defer = true
        script.setAttribute('data-domain', domain)
        document.head.appendChild(script)
      }
    }
  }, [data?.integrations])

  const navSections = [
    profile.bio && { label: 'Bio', href: '#bio' },
    mixes.length > 0 && { label: 'Music', href: '#music' },
    events.length > 0 && { label: 'Events', href: '#events' },
    technicalRider && (technicalRider.deck_model || technicalRider.mixer_model || technicalRider.monitor_type || technicalRider.additional_notes) && { label: 'Rider', href: '#technical' },
    (pressAssets.length > 0 || profile.press_kit_url) && { label: 'Press', href: '#press' },
    bookingContact && bookingContact.manager_name && { label: 'Contact', href: '#contact' },
    (data?.integrations || []).some((i: { type: string }) => ['soundcloud', 'spotify', 'mixcloud'].includes(i.type)) && { label: 'Listen', href: '#listen-embeds' },
    (data?.integrations || []).some((i: { type: string }) => ['mailchimp', 'custom_embed'].includes(i.type)) && { label: 'Newsletter', href: '#newsletter' },
  ].filter((s): s is { label: string; href: string } => !!s)

  // Conditional classes based on background brightness
  const textClass = isLight ? 'text-text-primary' : 'text-white'
  const textSecClass = isLight ? 'text-text-secondary' : 'text-white/60'
  const proseClass = isLight ? 'prose prose-sm max-w-none' : 'prose prose-invert prose-sm max-w-none'
  const socialBorderClass = isLight ? 'border-black/10' : 'border-white/20'

  // Card styles derived from CSS variables
  const cardStyle: React.CSSProperties = {
    backgroundColor: 'var(--theme-card-bg)',
    borderColor: 'var(--theme-border-color)',
    borderWidth: 'var(--theme-border-width)',
    borderRadius: 'var(--theme-card-radius)',
    boxShadow: 'var(--theme-shadow)',
  }
  const borderStyle: React.CSSProperties = {
    borderColor: 'var(--theme-border-color)',
  }

  return (
    <div
      style={{
        '--color-accent': theme.accent,
        '--theme-display-font': `'${theme.displayFont}', sans-serif`,
        '--theme-display-size': theme.displaySize,
        '--theme-display-weight': theme.displayWeight,
        '--theme-heading-font': `'${theme.headingFont}', sans-serif`,
        '--theme-heading-size': theme.headingSize,
        '--theme-heading-weight': theme.headingWeight,
        '--theme-subheading-font': `'${theme.subheadingFont}', sans-serif`,
        '--theme-subheading-size': theme.subheadingSize,
        '--theme-subheading-weight': theme.subheadingWeight,
        '--theme-body-font': `'${theme.bodyFont}', sans-serif`,
        '--theme-body-size': theme.bodySize,
        '--theme-body-weight': theme.bodyWeight,
        '--theme-text-color': theme.textColor,
        '--theme-heading-color': theme.headingColor,
        '--theme-link-color': theme.linkColor,
        '--theme-card-bg': theme.cardBg,
        '--theme-border-color': theme.borderColor,
        '--theme-section-padding': theme.sectionPaddingCss,
        '--theme-content-width': theme.contentWidthCss,
        '--theme-card-radius': theme.cardRadiusCss,
        '--theme-element-gap': theme.elementGapCss,
        '--theme-button-radius': theme.buttonRadiusCss,
        '--theme-shadow': theme.shadowCss,
        '--theme-border-width': theme.borderWidthCss,
        backgroundColor: bg,
        fontFamily: `'${theme.bodyFont}', sans-serif`,
        fontSize: theme.bodySize,
        fontWeight: theme.bodyWeight,
        color: theme.textColor,
      } as React.CSSProperties}
      className="min-h-screen"
    >
      {profile.theme_custom_fonts && (profile.theme_custom_fonts as Array<{name: string; url: string; weight: string}>).length > 0 && (
        <style dangerouslySetInnerHTML={{ __html: (profile.theme_custom_fonts as Array<{name: string; url: string; weight: string}>).map(f => {
          // Sanitize values to prevent CSS injection
          const safeName = f.name.replace(/['"\\}{;()<>]/g, '')
          const safeUrl = f.url.replace(/['"\\}{;()<>]/g, '')
          const safeWeight = f.weight.replace(/[^0-9]/g, '') || '400'
          const format = safeUrl.endsWith('.woff2') ? 'woff2' : safeUrl.endsWith('.woff') ? 'woff' : safeUrl.endsWith('.otf') ? 'opentype' : 'truetype'
          return `@font-face{font-family:'${safeName}';src:url('${safeUrl}') format('${format}');font-weight:${safeWeight};font-display:swap;}`
        }).join('\n') }} />
      )}
      <Analytics slug={profile.slug as string} />
      <Nav displayName={name} sections={navSections} />
      <main ref={mainRef}>
        {/* Hero */}
        <section className={`relative flex items-center justify-center overflow-hidden ${
          heroStyle === 'fullbleed' ? 'h-screen' :
          heroStyle === 'contained' ? 'h-[60vh]' :
          'py-32'
        }`}>
          {heroStyle !== 'minimal' && (
            <>
              {profile.hero_video_url ? (
                <>
                  {/* Video hero — hidden on mobile and reduced-motion for perf/a11y */}
                  <video
                    src={profile.hero_video_url}
                    autoPlay
                    muted
                    loop
                    playsInline
                    className="absolute inset-0 w-full h-full object-cover hidden md:motion-safe:block"
                  />
                  {/* Fallback image for mobile / reduced-motion */}
                  {profile.hero_image_url && (
                    <img
                      src={profile.hero_image_url}
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover md:motion-reduce:block md:motion-safe:hidden"
                    />
                  )}
                </>
              ) : profile.hero_image_url ? (
                <img src={profile.hero_image_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
              ) : (
                <div className="absolute inset-0" style={{ background: `linear-gradient(to bottom, ${bg}, ${isLight ? '#f0ede8' : '#111'}, ${bg})` }} />
              )}
              <div className="absolute inset-0" style={{ background: `linear-gradient(to top, ${bg}e6, transparent, ${bg}99)` }} />
            </>
          )}
          <div className="relative z-10 text-center">
            {/* Hero text is always light when there's a media overlay */}
            <h1
              className={`font-bold tracking-tight mb-2 ${profile.hero_image_url || profile.hero_video_url ? 'text-white' : ''}`}
              style={{
                fontFamily: `var(--theme-display-font)`,
                fontSize: `var(--theme-display-size)`,
                fontWeight: `var(--theme-display-weight)`,
              }}
            >
              {profile.display_name || 'DJ'}
            </h1>
            {profile.tagline && (
              <p className={`text-lg md:text-xl mb-8 ${profile.hero_image_url || profile.hero_video_url ? 'text-white/70' : textSecClass}`}>
                {profile.tagline}
              </p>
            )}
            {profile.genres && (profile.genres as string[]).length > 0 && (
              <div className="flex flex-wrap justify-center gap-2 mt-4">
                {(profile.genres as string[]).map((genre) => (
                  <span key={genre} className="px-3 py-1 text-xs font-semibold uppercase tracking-wider bg-accent/20 text-accent">
                    {genre}
                  </span>
                ))}
              </div>
            )}
            {(profile.bpm_min || profile.bpm_max) && (
              <p className={`text-sm mt-3 ${profile.hero_image_url || profile.hero_video_url ? 'text-white/50' : textSecClass}`}>
                {profile.bpm_min && profile.bpm_max
                  ? `${profile.bpm_min}\u2013${profile.bpm_max} BPM`
                  : profile.bpm_min ? `${profile.bpm_min}+ BPM` : `Up to ${profile.bpm_max} BPM`}
              </p>
            )}
            {socialLinks.length > 0 && (
              <div className="flex items-center justify-center gap-4 mt-4">
                {socialLinks.map((link: SocialLinkRow) => (
                  <a
                    key={link.id}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={link.platform}
                    aria-label={`${link.platform} profile`}
                    className={`w-10 h-10 rounded-full border ${profile.hero_image_url || profile.hero_video_url ? 'border-white/20 hover:border-accent hover:text-accent' : `${socialBorderClass} hover:border-accent hover:text-accent`} flex items-center justify-center text-sm font-semibold transition-colors`}
                  >
                    {link.platform.charAt(0)}
                  </a>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Template-ordered sections */}
        {(() => {
          const visibleSections = sectionOrder.filter(
            (id: string) => sectionVisibility[id] !== false
          )
          return visibleSections.map((sectionId: string) => {
          const sectionRenderers: Record<string, React.ReactNode> = {
            bio: profile.bio || profile.short_bio ? (
              <EPKSection key="bio" id="bio" heading="Bio" animate={animateSections}>
                <div className={bioLayout === 'two-column' && profile.profile_image_url ? 'grid md:grid-cols-[200px_1fr] gap-8 items-start' : ''}>
                  {bioLayout === 'two-column' && profile.profile_image_url && (
                    <img
                      src={profile.profile_image_url}
                      alt={profile.display_name || 'Artist'}
                      className="w-full aspect-square object-cover"
                    />
                  )}
                  <div>
                    {profile.short_bio && (
                      <p className={`text-lg leading-relaxed mb-6 ${textSecClass}`}>{profile.short_bio}</p>
                    )}
                    {profile.bio && (
                      <BioContent
                        bio={profile.bio as import('@editorjs/editorjs').OutputData}
                        proseClass={proseClass}
                        textSecClass={textSecClass}
                        accentColor={accent}
                      />
                    )}
                  </div>
                </div>
              </EPKSection>
            ) : null,

            music: mixes.length > 0 ? (
              <EPKSection key="music" id="music" heading="Listen" animate={animateSections}>
                {Object.entries(
                  mixes.reduce((acc: Record<string, MixRow[]>, mix) => {
                    const cat = mix.category || 'other'
                    if (!acc[cat]) acc[cat] = []
                    acc[cat].push(mix)
                    return acc
                  }, {} as Record<string, MixRow[]>)
                ).map(([category, categoryMixes]) => (
                  <div key={category} className="mb-10">
                    <h3 className="text-lg font-semibold text-accent mb-6 capitalize">
                      {category.replace(/-/g, ' ')}
                    </h3>
                    {musicLayout === 'featured' ? (
                      <>
                        {/* Hero first mix */}
                        {categoryMixes[0] && (
                          <div className="border overflow-hidden mb-6" style={cardStyle}>
                            {categoryMixes[0].embed_html ? (
                              <div
                                className="w-full [&_iframe]:w-full [&_iframe]:rounded-none"
                                dangerouslySetInnerHTML={{ __html: sanitizeEmbed(categoryMixes[0].embed_html) }}
                              />
                            ) : (
                              <a href={categoryMixes[0].url} target="_blank" rel="noopener noreferrer" className="grid md:grid-cols-[2fr_3fr] group">
                                <div className="aspect-video md:aspect-auto overflow-hidden">
                                  {categoryMixes[0].image_url ? (
                                    <img src={categoryMixes[0].image_url} alt={categoryMixes[0].title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                                  ) : (
                                    <div className="w-full h-full" style={{ backgroundColor: 'var(--theme-card-bg)' }} />
                                  )}
                                </div>
                                <div className="p-6">
                                  <p className="text-lg font-semibold mb-2">{categoryMixes[0].title}</p>
                                  {categoryMixes[0].description && (
                                    <p className={`text-sm ${textSecClass} mb-2`}>{categoryMixes[0].description}</p>
                                  )}
                                  <p className={`text-xs ${textSecClass} truncate`}>{categoryMixes[0].url}</p>
                                </div>
                              </a>
                            )}
                          </div>
                        )}
                        {/* Remaining mixes */}
                        {categoryMixes.length > 1 && (
                          <div className="grid sm:grid-cols-2 gap-4">
                            {categoryMixes.slice(1).map((mix) => (
                              <div key={mix.id} className="border overflow-hidden" style={cardStyle}>
                                {mix.embed_html ? (
                                  <div
                                    className="w-full [&_iframe]:w-full [&_iframe]:rounded-none"
                                    dangerouslySetInnerHTML={{ __html: sanitizeEmbed(mix.embed_html) }}
                                  />
                                ) : (
                                  <a href={mix.url} target="_blank" rel="noopener noreferrer"
                                    className="block hover:border-accent/30 transition-colors">
                                    {mix.image_url && (
                                      <img src={mix.image_url} alt={mix.title} className="w-full aspect-video object-cover" loading="lazy" />
                                    )}
                                    <div className="p-4">
                                      <p className="font-semibold text-sm mb-1">{mix.title}</p>
                                      {mix.description && (
                                        <p className={`text-xs ${textSecClass} mb-1`}>{mix.description}</p>
                                      )}
                                      <p className={`text-xs ${textSecClass} truncate`}>{mix.url}</p>
                                    </div>
                                  </a>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    ) : musicLayout === 'showcase' ? (
                      <div className="space-y-4">
                        {categoryMixes.map((mix, index) => (
                          <div
                            key={mix.id}
                            className="border overflow-hidden"
                            style={{ ...cardStyle, ...(index % 2 === 1 ? { backgroundColor: 'var(--theme-card-bg)' } : {}) }}
                          >
                            {mix.embed_html ? (
                              <div
                                className="w-full [&_iframe]:w-full [&_iframe]:rounded-none"
                                dangerouslySetInnerHTML={{ __html: sanitizeEmbed(mix.embed_html) }}
                              />
                            ) : (
                              <a href={mix.url} target="_blank" rel="noopener noreferrer" className="grid md:grid-cols-[1fr_2fr] group">
                                <div className="aspect-video md:aspect-square overflow-hidden">
                                  {mix.image_url ? (
                                    <img src={mix.image_url} alt={mix.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                                  ) : (
                                    <div className="w-full h-full" style={{ backgroundColor: 'var(--theme-card-bg)' }} />
                                  )}
                                </div>
                                <div className="p-6">
                                  <p className="text-base font-semibold mb-2">{mix.title}</p>
                                  {mix.description && (
                                    <p className={`text-sm ${textSecClass} mb-2`}>{mix.description}</p>
                                  )}
                                  <p className={`text-xs ${textSecClass} truncate`}>{mix.url}</p>
                                </div>
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : musicLayout === 'compact' ? (
                      <div className="divide-y" style={{ borderColor: 'var(--theme-border-color)' }}>
                        {categoryMixes.map((mix) => (
                          mix.embed_html ? (
                            <div key={mix.id} className="py-2 overflow-hidden" style={{ maxHeight: '120px' }}>
                              <div
                                className="w-full [&_iframe]:w-full [&_iframe]:rounded-none"
                                dangerouslySetInnerHTML={{ __html: sanitizeEmbed(mix.embed_html) }}
                              />
                            </div>
                          ) : (
                            <a
                              key={mix.id}
                              href={mix.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-4 py-3 hover:bg-accent/5 transition-colors group px-2"
                            >
                              {mix.image_url ? (
                                <img
                                  src={mix.image_url}
                                  alt={mix.title}
                                  className="w-12 h-12 object-cover shrink-0"
                                  style={{ borderRadius: 'var(--theme-card-radius)' }}
                                  loading="lazy"
                                />
                              ) : (
                                <div
                                  className="w-12 h-12 shrink-0"
                                  style={{ borderRadius: 'var(--theme-card-radius)', backgroundColor: 'var(--theme-card-bg)' }}
                                />
                              )}
                              <div className="min-w-0 flex-1">
                                <p className="font-semibold text-sm">{mix.title}</p>
                                {mix.description && (
                                  <p className={`text-xs ${textSecClass} truncate`}>{mix.description}</p>
                                )}
                              </div>
                              <svg className="w-4 h-4 shrink-0 group-hover:text-accent transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path d="M9 5l7 7-7 7" />
                              </svg>
                            </a>
                          )
                        ))}
                      </div>
                    ) : (
                      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {categoryMixes.map((mix) => (
                          <div key={mix.id} className="border overflow-hidden" style={cardStyle}>
                            {mix.embed_html ? (
                              <div
                                className="w-full [&_iframe]:w-full [&_iframe]:rounded-none"
                                dangerouslySetInnerHTML={{ __html: sanitizeEmbed(mix.embed_html) }}
                              />
                            ) : (
                              <a href={mix.url} target="_blank" rel="noopener noreferrer"
                                className="block hover:border-accent/30 transition-colors">
                                {mix.image_url && (
                                  <img src={mix.image_url} alt={mix.title} className="w-full aspect-video object-cover" loading="lazy" />
                                )}
                                <div className="p-4">
                                  <p className="font-semibold text-sm mb-1">{mix.title}</p>
                                  {mix.description && (
                                    <p className={`text-xs ${textSecClass} mb-1`}>{mix.description}</p>
                                  )}
                                  <p className={`text-xs ${textSecClass} truncate`}>{mix.url}</p>
                                </div>
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </EPKSection>
            ) : null,

            events: events.length > 0 ? (
              <EPKSection key="events" id="events" heading={<>Events <span className="text-accent">&amp;</span> Brands</>} animate={animateSections}>
                {eventsLayout === 'marquee' ? (
                  <div>
                    {/* Hero first event */}
                    {events[0] && (
                      <a
                        href={events[0].link_url || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group relative block overflow-hidden border hover:border-accent/30 transition-colors mb-4"
                        style={cardStyle}
                      >
                        <div className="aspect-[3/1] overflow-hidden">
                          {events[0].image_url && (
                            <img
                              src={events[0].image_url}
                              alt={events[0].name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              loading="lazy"
                            />
                          )}
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                        <div className="absolute bottom-0 p-6">
                          <p className="text-white font-semibold text-lg">{events[0].name}</p>
                          {formatEventDate(events[0].event_date, events[0].event_date_end) && (
                            <p className="text-white/70 text-sm mt-1">{formatEventDate(events[0].event_date, events[0].event_date_end)}</p>
                          )}
                        </div>
                      </a>
                    )}
                    {/* Remaining events grid */}
                    {events.length > 1 && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {events.slice(1).map((event: EventRow) => (
                          <a
                            key={event.id}
                            href={event.link_url || '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group block overflow-hidden border hover:border-accent/30 transition-all hover:scale-105"
                            style={cardStyle}
                          >
                            <div className="aspect-square overflow-hidden" style={{ backgroundColor: 'var(--theme-card-bg)' }}>
                              {event.image_url && (
                                <img src={event.image_url} alt={event.name} className="w-full h-full object-cover object-center" loading="lazy" />
                              )}
                            </div>
                            <div className="backdrop-blur-sm px-3 py-2" style={{ backgroundColor: 'var(--theme-card-bg)' }}>
                              <p className={`text-xs text-center ${textSecClass} leading-tight`}>{event.name}</p>
                              {formatEventDate(event.event_date, event.event_date_end) && (
                                <p className={`text-[10px] text-center ${textSecClass} opacity-70 mt-0.5`}>{formatEventDate(event.event_date, event.event_date_end)}</p>
                              )}
                            </div>
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                ) : eventsLayout === 'carousel' ? (
                  <div className="relative">
                    <div
                      className="flex gap-4 overflow-x-auto pb-4"
                      style={{ scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch' }}
                    >
                      {events.map((event: EventRow) => (
                        <a
                          key={event.id}
                          href={event.link_url || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group relative flex-none w-[280px] block overflow-hidden border hover:border-accent/30 transition-colors"
                          style={{ ...cardStyle, scrollSnapAlign: 'start' }}
                        >
                          <div className="aspect-[3/4] overflow-hidden">
                            {event.image_url && (
                              <img
                                src={event.image_url}
                                alt={event.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                loading="lazy"
                              />
                            )}
                          </div>
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                          <div className="absolute bottom-0 p-4">
                            <p className="text-white font-semibold text-sm">{event.name}</p>
                            {formatEventDate(event.event_date, event.event_date_end) && (
                              <p className="text-white/70 text-xs mt-1">{formatEventDate(event.event_date, event.event_date_end)}</p>
                            )}
                          </div>
                        </a>
                      ))}
                    </div>
                    {/* Fade edges */}
                    <div
                      className="pointer-events-none absolute left-0 top-0 bottom-4 w-8 bg-gradient-to-r from-[var(--bg)] to-transparent"
                      style={{ '--bg': bg } as React.CSSProperties}
                    />
                    <div
                      className="pointer-events-none absolute right-0 top-0 bottom-4 w-8 bg-gradient-to-l from-[var(--bg)] to-transparent"
                      style={{ '--bg': bg } as React.CSSProperties}
                    />
                  </div>
                ) : eventsLayout === 'timeline' ? (
                  <div className="relative">
                    {/* Vertical accent line */}
                    <div className="absolute left-4 md:left-1/2 top-0 bottom-0 w-0.5 bg-accent/30 -translate-x-1/2" />
                    <div className="space-y-8">
                      {events.map((event: EventRow, index: number) => (
                        <div key={event.id} className={`relative flex flex-col ${index % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'}`}>
                          {/* Accent dot */}
                          <div
                            className="absolute left-4 md:left-1/2 w-3 h-3 rounded-full bg-accent border-2 -translate-x-1/2 mt-4 z-10"
                            style={{ borderColor: bg }}
                          />
                          {/* Hidden spacer */}
                          <div className="hidden md:block md:w-1/2" />
                          {/* Card */}
                          <a
                            href={event.link_url || '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-10 md:ml-0 md:w-1/2 flex items-start gap-4 border p-4 hover:border-accent/30 transition-colors"
                            style={cardStyle}
                          >
                            {event.image_url && (
                              <img
                                src={event.image_url}
                                alt={event.name}
                                className="w-16 h-16 object-cover shrink-0"
                                loading="lazy"
                              />
                            )}
                            <div className="min-w-0">
                              <p className="font-semibold text-sm">{event.name}</p>
                              {formatEventDate(event.event_date, event.event_date_end) && (
                                <p className={`text-xs ${textSecClass} mt-0.5`}>{formatEventDate(event.event_date, event.event_date_end)}</p>
                              )}
                              {event.description && (
                                <p className={`text-xs ${textSecClass} mt-1 line-clamp-2`}>{event.description}</p>
                              )}
                            </div>
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  /* Grid (default) */
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {events.map((event: EventRow) => (
                      <a
                        key={event.id}
                        href={event.link_url || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group block overflow-hidden border hover:border-accent/30 transition-all hover:scale-105"
                        style={cardStyle}
                      >
                        <div className="aspect-square overflow-hidden" style={{ backgroundColor: 'var(--theme-card-bg)' }}>
                          {event.image_url && (
                            <img src={event.image_url} alt={event.name} className="w-full h-full object-cover object-center" loading="lazy" />
                          )}
                        </div>
                        <div className="backdrop-blur-sm px-3 py-2" style={{ backgroundColor: 'var(--theme-card-bg)' }}>
                          <p className={`text-xs text-center ${textSecClass} leading-tight`}>{event.name}</p>
                          {formatEventDate(event.event_date, event.event_date_end) && (
                            <p className={`text-[10px] text-center ${textSecClass} opacity-70 mt-0.5`}>{formatEventDate(event.event_date, event.event_date_end)}</p>
                          )}
                        </div>
                      </a>
                    ))}
                  </div>
                )}
              </EPKSection>
            ) : null,

            photos: photos.length > 0 ? (
              <EPKSection key="photos" id="photos" heading="Photos" animate={animateSections}>
                <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4">
                  {photos.map((photo: PhotoRow, index: number) => (
                    <button
                      key={photo.id}
                      type="button"
                      onClick={() => setLightboxIndex(index)}
                      className="w-full break-inside-avoid overflow-hidden border border-current/5 hover:border-accent/30 transition-all cursor-pointer group block"
                    >
                      <img
                        src={photo.image_url}
                        alt={photo.caption || ''}
                        className="w-full h-auto group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                      {photo.caption && (
                        <div className="px-3 py-2" style={{ backgroundColor: 'var(--theme-card-bg)' }}>
                          <p className={`text-xs ${textSecClass}`}>{photo.caption}</p>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </EPKSection>
            ) : null,

            technical: technicalRider && (technicalRider.deck_model || technicalRider.mixer_model || technicalRider.monitor_type || technicalRider.additional_notes) ? (
              <EPKSection key="technical" id="technical" heading="Technical Rider" animate={animateSections}>
                <div className="backdrop-blur-sm border overflow-hidden max-w-4xl mx-auto" style={cardStyle}>
                  <dl className="divide-y divide-current/5">
                    {technicalRider.deck_model && (
                      <div className="px-6 py-4 flex justify-between items-baseline">
                        <dt className="text-sm font-medium">Decks</dt>
                        <dd className={`text-sm ${textSecClass}`}>
                          {technicalRider.deck_quantity ? `${technicalRider.deck_quantity}x ` : ''}
                          {technicalRider.deck_model === 'Other' ? technicalRider.deck_model_other : technicalRider.deck_model}
                        </dd>
                      </div>
                    )}
                    {technicalRider.mixer_model && (
                      <div className="px-6 py-4 flex justify-between items-baseline">
                        <dt className="text-sm font-medium">Mixer</dt>
                        <dd className={`text-sm ${textSecClass}`}>
                          {technicalRider.mixer_model === 'Other' ? technicalRider.mixer_model_other : technicalRider.mixer_model}
                        </dd>
                      </div>
                    )}
                    {technicalRider.monitor_type && (
                      <div className="px-6 py-4 flex justify-between items-baseline">
                        <dt className="text-sm font-medium">Monitoring</dt>
                        <dd className={`text-sm ${textSecClass} text-right`}>
                          <span>
                            {technicalRider.monitor_quantity ? `${technicalRider.monitor_quantity}x ` : ''}
                            {technicalRider.monitor_type}
                          </span>
                          {technicalRider.monitor_notes && (
                            <span className="block text-xs mt-1 italic">{technicalRider.monitor_notes}</span>
                          )}
                        </dd>
                      </div>
                    )}
                  </dl>
                  {technicalRider.additional_notes && (
                    <>
                      <div className="border-t" style={borderStyle} />
                      <div className="px-6 py-4">
                        <p className="text-sm font-medium mb-2">Additional Notes</p>
                        <p className={`text-sm ${textSecClass} whitespace-pre-line`}>{technicalRider.additional_notes}</p>
                      </div>
                    </>
                  )}
                </div>
              </EPKSection>
            ) : null,

            press: (pressAssets.length > 0 || profile.press_kit_url) ? (
              <EPKSection key="press" id="press" heading="Press Assets" animate={animateSections}>
                {profile.press_kit_url && (
                  <div className="mb-6">
                    <a
                      href={profile.press_kit_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 border px-5 py-3 hover:border-accent/30 transition-colors group"
                      style={cardStyle}
                    >
                      <span className="font-semibold text-sm">Download Press Kit</span>
                      <span className={`text-xs ${textSecClass} group-hover:text-accent transition-colors`}>&rarr;</span>
                    </a>
                  </div>
                )}
                {pressAssets.length > 0 && (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {pressAssets.map((asset: FileRow) => (
                      <a
                        key={asset.id}
                        href={asset.file_url}
                        download
                        target="_blank"
                        rel="noopener noreferrer"
                        className="border p-4 hover:border-accent/30 transition-colors group"
                        style={cardStyle}
                      >
                        <p className="font-semibold text-sm mb-1">{asset.press_title || asset.name}</p>
                        <p className={`text-xs ${textSecClass} group-hover:text-accent transition-colors`}>Download</p>
                      </a>
                    ))}
                  </div>
                )}
              </EPKSection>
            ) : null,

            contact: bookingContact && bookingContact.manager_name ? (
              <EPKSection key="contact" id="contact" heading="Booking Contact" animate={animateSections}>
                <div className={`${textSecClass} space-y-2`}>
                  <p><strong>Management:</strong> {bookingContact.manager_name}</p>
                  {bookingContact.email && <p><strong>Email:</strong> {bookingContact.email}</p>}
                  {bookingContact.phone && <p><strong>Phone:</strong> {bookingContact.phone}</p>}
                </div>
              </EPKSection>
            ) : null,
          }
          return sectionRenderers[sectionId] || null
        })
        })()}

        {/* Integration sections */}
        {(() => {
          const intList = data?.integrations || []
          const embedIntegrations = intList.filter(
            (i: { type: string }) => ['soundcloud', 'spotify', 'mixcloud'].includes(i.type)
          )
          const marketingIntegrations = intList.filter(
            (i: { type: string }) => ['mailchimp', 'custom_embed'].includes(i.type)
          )

          return (
            <>
              {embedIntegrations.length > 0 && (
                <EPKSection id="listen-embeds" heading="Listen" animate={animateSections}>
                  <div className="space-y-6">
                    {embedIntegrations.map((integration: { id: string; config: Record<string, string> }) => (
                      integration.config.embed_html ? (
                        <div
                          key={integration.id}
                          className="[&_iframe]:w-full [&_iframe]:rounded-none"
                          dangerouslySetInnerHTML={{ __html: sanitizeEmbed(integration.config.embed_html) }}
                        />
                      ) : null
                    ))}
                  </div>
                </EPKSection>
              )}

              {marketingIntegrations.length > 0 && marketingIntegrations.map((integration: { id: string; type: string; config: Record<string, string> }) => (
                integration.type === 'mailchimp' ? (
                  <EPKSection key={integration.id} id="newsletter" heading={integration.config.form_heading || 'Newsletter'} animate={animateSections}>
                    <MailchimpForm
                      profileId={data!.profileId}
                      heading={integration.config.form_heading || 'Join my mailing list'}
                      buttonText={integration.config.button_text || 'Subscribe'}
                      textSecClass={textSecClass}
                    />
                  </EPKSection>
                ) : integration.type === 'custom_embed' && integration.config.embed_html ? (
                  <EPKSection key={integration.id} id="newsletter" heading={integration.config.label || 'Newsletter'} animate={animateSections}>
                    <div dangerouslySetInnerHTML={{ __html: sanitize(integration.config.embed_html) }} />
                  </EPKSection>
                ) : null
              ))}
            </>
          )
        })()}
      </main>

      {/* Photo Lightbox */}
      {lightboxIndex !== null && photos.length > 0 && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={() => setLightboxIndex(null)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setLightboxIndex(null)
            if (e.key === 'ArrowLeft') setLightboxIndex((prev) => prev !== null && prev > 0 ? prev - 1 : prev)
            if (e.key === 'ArrowRight') setLightboxIndex((prev) => prev !== null && prev < photos.length - 1 ? prev + 1 : prev)
          }}
          tabIndex={0}
          role="dialog"
          aria-modal="true"
          ref={(el) => { if (el) el.focus() }}
        >
          {/* Close button */}
          <button
            onClick={() => setLightboxIndex(null)}
            className="absolute top-4 right-4 text-white/70 hover:text-white text-2xl z-10"
            aria-label="Close lightbox"
          >
            ✕
          </button>

          {/* Previous arrow */}
          {lightboxIndex > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); setLightboxIndex(lightboxIndex - 1) }}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white text-3xl z-10"
              aria-label="Previous photo"
            >
              ‹
            </button>
          )}

          {/* Next arrow */}
          {lightboxIndex < photos.length - 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); setLightboxIndex(lightboxIndex + 1) }}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white text-3xl z-10"
              aria-label="Next photo"
            >
              ›
            </button>
          )}

          {/* Image + caption */}
          <div onClick={(e) => e.stopPropagation()} className="max-w-5xl max-h-[90vh] flex flex-col items-center">
            <img
              src={photos[lightboxIndex].image_url}
              alt={photos[lightboxIndex].caption || ''}
              className="max-w-full max-h-[80vh] object-contain"
            />
            {photos[lightboxIndex].caption && (
              <p className="text-white/70 text-sm mt-3 text-center px-4">
                {photos[lightboxIndex].caption}
              </p>
            )}
            <p className="text-white/40 text-xs mt-2" aria-live="polite">
              {lightboxIndex + 1} / {photos.length}
            </p>
          </div>
        </div>
      )}

      {/* Agency Branding */}
      {data.organization && (
        <div className="py-6 text-center border-t" style={borderStyle}>
          <p className={`text-xs ${textSecClass}`}>
            Represented by{' '}
            {data.organization.website_url ? (
              <a href={data.organization.website_url} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                {data.organization.name}
              </a>
            ) : (
              <span>{data.organization.name}</span>
            )}
          </p>
        </div>
      )}

      {/* Branded footer for free tier */}
      {!(profile.hide_platform_branding && profile.tier === 'pro') && (
        <footer className="py-6 text-center border-t" style={borderStyle}>
          <p className={`text-xs ${textSecClass}`}>
            Built with <a href="/" className="text-accent hover:underline">myEPK</a>
          </p>
        </footer>
      )}
    </div>
  )
}
