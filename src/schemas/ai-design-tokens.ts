import { z } from 'zod'

// --- Primitives ---

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/)

const gradientStop = z.object({
  color: hexColor,
  position: z.number().min(0).max(100),
})

const gradientDef = z.object({
  type: z.enum(['linear', 'radial', 'conic']),
  angle: z.number().min(0).max(360).optional(),
  stops: z.array(gradientStop).min(2),
})

const typographyTier = z.object({
  fontFamily: z.string(),
  fontSize: z.string(),
  fontWeight: z.string(),
  lineHeight: z.string().optional(),
  letterSpacing: z.string().optional(),
  textTransform: z.enum(['none', 'uppercase', 'lowercase', 'capitalize']).optional(),
})

// --- Section Variants ---

const heroVariant = z.enum(['fullscreen', 'split', 'minimal', 'video-bg', 'parallax'])
const bioVariant = z.enum(['centered', 'split-image', 'full-width', 'sidebar'])
const musicVariant = z.enum(['cards', 'list', 'waveform', 'featured'])
const eventsVariant = z.enum(['timeline', 'grid', 'list', 'calendar'])
const photosVariant = z.enum(['masonry', 'grid', 'carousel', 'lightbox'])
const contactVariant = z.enum(['form', 'minimal', 'card', 'split'])

// --- Section Tokens ---

const sectionTokens = z.object({
  background: z.string().optional(),
  textColor: hexColor.optional(),
  padding: z.string().optional(),
})

const heroTokens = sectionTokens.extend({
  variant: heroVariant,
  overlayOpacity: z.number().min(0).max(1).optional(),
  titleAlignment: z.enum(['left', 'center', 'right']).optional(),
  showSubtitle: z.boolean().optional(),
  showGenres: z.boolean().optional(),
})

const bioTokens = sectionTokens.extend({
  variant: bioVariant,
  showReadMore: z.boolean().optional(),
  maxLines: z.number().min(3).max(20).optional(),
})

const musicTokens = sectionTokens.extend({
  variant: musicVariant,
  columnsDesktop: z.number().min(1).max(4).optional(),
  showCoverArt: z.boolean().optional(),
  showDuration: z.boolean().optional(),
})

const eventsTokens = sectionTokens.extend({
  variant: eventsVariant,
  showPastEvents: z.boolean().optional(),
  maxVisible: z.number().min(3).max(20).optional(),
})

const photosTokens = sectionTokens.extend({
  variant: photosVariant,
  columnsDesktop: z.number().min(2).max(6).optional(),
  gap: z.string().optional(),
  aspectRatio: z.enum(['square', 'landscape', 'portrait', 'auto']).optional(),
})

const contactTokens = sectionTokens.extend({
  variant: contactVariant,
  showSocialLinks: z.boolean().optional(),
})

// --- Section Keys ---

export const SECTION_KEYS = [
  'hero', 'bio', 'music', 'events', 'photos', 'contact',
] as const
export type SectionKey = (typeof SECTION_KEYS)[number]

// --- Main Token Schema ---

export const aiDesignTokensSchema = z.object({
  // Global colors
  colors: z.object({
    primary: hexColor,
    secondary: hexColor,
    accent: hexColor,
    background: hexColor,
    surface: hexColor,
    text: hexColor,
    textMuted: hexColor,
    heading: hexColor,
    link: hexColor,
    border: hexColor,
    error: hexColor,
    success: hexColor,
  }),

  // Gradients
  gradients: z.array(gradientDef).optional(),

  // Typography
  typography: z.object({
    display: typographyTier,
    h1: typographyTier,
    h2: typographyTier,
    h3: typographyTier,
    h4: typographyTier,
    body: typographyTier,
    small: typographyTier,
    caption: typographyTier,
  }),

  // Font imports (Google Fonts names)
  fontImports: z.array(z.string()),

  // Spacing scale
  spacing: z.object({
    xs: z.string(),
    sm: z.string(),
    md: z.string(),
    lg: z.string(),
    xl: z.string(),
    '2xl': z.string(),
  }),

  // Border radii
  radii: z.object({
    none: z.string(),
    sm: z.string(),
    md: z.string(),
    lg: z.string(),
    full: z.string(),
  }),

  // Shadows
  shadows: z.object({
    none: z.string(),
    sm: z.string(),
    md: z.string(),
    lg: z.string(),
    xl: z.string(),
  }),

  // Animations
  animation: z.object({
    sectionEntrance: z.enum(['fade', 'slide-up', 'scale', 'none']),
    duration: z.string().optional(),
    easing: z.string().optional(),
  }),

  // Layout
  layout: z.object({
    contentWidth: z.string(),
    sectionPadding: z.string(),
    sectionOrder: z.array(z.enum(['hero', 'bio', 'music', 'events', 'photos', 'contact'])),
    sectionVisibility: z.record(z.enum(['hero', 'bio', 'music', 'events', 'photos', 'contact']), z.boolean()),
    navStyle: z.enum(['fixed', 'static', 'hidden']),
    footerStyle: z.enum(['minimal', 'detailed', 'hidden']),
  }),

  // Section-specific tokens
  sections: z.object({
    hero: heroTokens,
    bio: bioTokens,
    music: musicTokens,
    events: eventsTokens,
    photos: photosTokens,
    contact: contactTokens,
  }),

  // Decorative
  decorative: z.object({
    dividerStyle: z.enum(['none', 'line', 'gradient', 'wave', 'diagonal', 'dots']),
    backgroundPattern: z.enum(['none', 'dots', 'grid', 'noise', 'topography']),
    accentElements: z.object({
      glow: z.object({ enabled: z.boolean(), color: hexColor.optional(), blur: z.string().optional() }).optional(),
      blur: z.object({ enabled: z.boolean(), radius: z.string().optional() }).optional(),
      geometricShapes: z.object({ enabled: z.boolean(), style: z.enum(['circles', 'lines', 'triangles', 'dots']).optional() }).optional(),
    }).optional(),
    cursorStyle: z.enum(['default', 'crosshair', 'pointer', 'custom']).optional(),
    scrollbarStyle: z.enum(['default', 'thin', 'hidden', 'accent']).optional(),
    buttonStyle: z.enum(['rounded', 'square', 'pill']),
    linkStyle: z.enum(['underline', 'none', 'hover-underline']),
    cardBorder: z.enum(['none', 'subtle', 'solid']),
    shadow: z.enum(['none', 'sm', 'md', 'lg']),
  }),
})

export type AIDesignTokens = z.infer<typeof aiDesignTokensSchema>

// Deep partial type for AI updates (only changed tokens)
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}
export type PartialAIDesignTokens = DeepPartial<AIDesignTokens>

// Runtime validation for partial token updates — accepts any nested subset
export const partialAIDesignTokensSchema = z.record(z.string(), z.unknown())

// Lock state tracking — maps dot-path keys to 'locked' | 'generated' | 'default'
export type TokenLockState = Record<string, 'locked' | 'generated' | 'default'>

// Chat message schema
export const aiChatMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string(),
  tokenChanges: partialAIDesignTokensSchema.optional(),
  timestamp: z.string(),
})
export type AIChatMessage = z.infer<typeof aiChatMessageSchema>
