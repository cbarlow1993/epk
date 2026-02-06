// ---------------------------------------------------------------------------
// Template system – defines visual presets for DJ EPK pages.
// ---------------------------------------------------------------------------

// -- Typography tier --------------------------------------------------------

export interface TypographyTier {
  font: string
  size: string
  weight: string
}

// -- Template defaults (all theme properties) --------------------------------

export interface TemplateDefaults {
  // Legacy (kept for backward compat)
  accent_color: string
  bg_color: string
  font_family: string

  // Typography
  display: TypographyTier
  heading: TypographyTier
  subheading: TypographyTier
  body: TypographyTier

  // Colors
  text_color: string
  heading_color: string | null // null = inherit from text_color
  link_color: string | null // null = inherit from accent
  card_bg: string
  border_color: string

  // Spacing
  section_padding: 'compact' | 'default' | 'spacious'
  content_width: 'narrow' | 'default' | 'wide'
  card_radius: 'none' | 'sm' | 'md' | 'lg' | 'full'
  element_gap: 'tight' | 'default' | 'relaxed'

  // Buttons
  button_style: 'rounded' | 'square' | 'pill'
  link_style: 'underline' | 'none' | 'hover-underline'

  // Effects
  card_border: 'none' | 'subtle' | 'solid'
  shadow: 'none' | 'sm' | 'md' | 'lg'
  divider_style: 'none' | 'line' | 'accent' | 'gradient'
}

// -- Template config --------------------------------------------------------

export interface TemplateConfig {
  id: string
  name: string
  description: string
  defaults: TemplateDefaults
  sectionOrder: string[]
  heroStyle: 'fullbleed' | 'contained' | 'minimal'
  bioLayout: 'two-column' | 'single-column'
}

// ---------------------------------------------------------------------------
// Enum-to-CSS lookup maps
// ---------------------------------------------------------------------------

export const SECTION_PADDING_MAP: Record<string, string> = {
  compact: '3rem',
  default: '5rem',
  spacious: '7rem',
}

export const CONTENT_WIDTH_MAP: Record<string, string> = {
  narrow: '56rem',
  default: '72rem',
  wide: '90rem',
}

export const CARD_RADIUS_MAP: Record<string, string> = {
  none: '0',
  sm: '0.375rem',
  md: '0.75rem',
  lg: '1rem',
  full: '9999px',
}

export const ELEMENT_GAP_MAP: Record<string, string> = {
  tight: '0.75rem',
  default: '1rem',
  relaxed: '1.5rem',
}

export const BUTTON_RADIUS_MAP: Record<string, string> = {
  rounded: '0.375rem',
  square: '0',
  pill: '9999px',
}

export const SHADOW_MAP: Record<string, string> = {
  none: 'none',
  sm: '0 1px 2px rgba(0,0,0,0.05)',
  md: '0 4px 6px rgba(0,0,0,0.07)',
  lg: '0 10px 15px rgba(0,0,0,0.1)',
}

export const BORDER_WIDTH_MAP: Record<string, string> = {
  none: '0',
  subtle: '1px',
  solid: '2px',
}

// ---------------------------------------------------------------------------
// Template definitions
// ---------------------------------------------------------------------------

export const TEMPLATES: TemplateConfig[] = [
  // -- Swiss (default) ------------------------------------------------------
  {
    id: 'default',
    name: 'Swiss',
    description: 'Clean black and white with red accent',
    defaults: {
      accent_color: '#FF0000',
      bg_color: '#FFFFFF',
      font_family: 'Instrument Sans',

      display: { font: 'Instrument Sans', size: '5rem', weight: '900' },
      heading: { font: 'Instrument Sans', size: '2rem', weight: '700' },
      subheading: { font: 'Instrument Sans', size: '1.125rem', weight: '600' },
      body: { font: 'Instrument Sans', size: '1rem', weight: '400' },

      text_color: '#000000',
      heading_color: null,
      link_color: null,
      card_bg: '#FFFFFF',
      border_color: '#00000010',

      section_padding: 'default',
      content_width: 'default',
      card_radius: 'sm',
      element_gap: 'default',

      button_style: 'rounded',
      link_style: 'hover-underline',

      card_border: 'subtle',
      shadow: 'sm',
      divider_style: 'line',
    },
    sectionOrder: ['bio', 'music', 'events', 'photos', 'technical', 'press', 'contact'],
    heroStyle: 'fullbleed',
    bioLayout: 'two-column',
  },

  // -- Minimal ---------------------------------------------------------------
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Clean, centered single-column layout',
    defaults: {
      accent_color: '#000000',
      bg_color: '#FFFFFF',
      font_family: 'Instrument Sans',

      display: { font: 'Instrument Sans', size: '4rem', weight: '700' },
      heading: { font: 'Instrument Sans', size: '1.75rem', weight: '600' },
      subheading: { font: 'Instrument Sans', size: '1rem', weight: '500' },
      body: { font: 'Instrument Sans', size: '1rem', weight: '400' },

      text_color: '#000000',
      heading_color: null,
      link_color: null,
      card_bg: '#FFFFFF',
      border_color: '#00000008',

      section_padding: 'spacious',
      content_width: 'narrow',
      card_radius: 'none',
      element_gap: 'default',

      button_style: 'square',
      link_style: 'none',

      card_border: 'none',
      shadow: 'none',
      divider_style: 'line',
    },
    sectionOrder: ['bio', 'music', 'events', 'photos', 'press', 'technical', 'contact'],
    heroStyle: 'minimal',
    bioLayout: 'single-column',
  },

  // -- Editorial (id: festival) ---------------------------------------------
  {
    id: 'festival',
    name: 'Editorial',
    description: 'Warm paper tones with serif typography',
    defaults: {
      accent_color: '#C4553A',
      bg_color: '#F5F0EB',
      font_family: 'Playfair Display',

      display: { font: 'Playfair Display', size: '4.5rem', weight: '700' },
      heading: { font: 'Playfair Display', size: '2rem', weight: '700' },
      subheading: { font: 'Instrument Sans', size: '1rem', weight: '500' },
      body: { font: 'Instrument Sans', size: '1rem', weight: '400' },

      text_color: '#2C2C2C',
      heading_color: null,
      link_color: null,
      card_bg: '#FFFFFF',
      border_color: '#00000010',

      section_padding: 'default',
      content_width: 'default',
      card_radius: 'md',
      element_gap: 'default',

      button_style: 'rounded',
      link_style: 'underline',

      card_border: 'subtle',
      shadow: 'md',
      divider_style: 'accent',
    },
    sectionOrder: ['music', 'bio', 'events', 'photos', 'press', 'technical', 'contact'],
    heroStyle: 'fullbleed',
    bioLayout: 'single-column',
  },

  // -- Dark (id: underground) -----------------------------------------------
  {
    id: 'underground',
    name: 'Dark',
    description: 'Refined dark theme with warm gold accent',
    defaults: {
      accent_color: '#D4A574',
      bg_color: '#1A1A1A',
      font_family: 'Space Grotesk',

      display: { font: 'Space Grotesk', size: '5rem', weight: '800' },
      heading: { font: 'Space Grotesk', size: '2rem', weight: '700' },
      subheading: { font: 'DM Sans', size: '1.125rem', weight: '500' },
      body: { font: 'DM Sans', size: '1rem', weight: '400' },

      text_color: '#FFFFFF',
      heading_color: null,
      link_color: null,
      card_bg: 'rgba(255,255,255,0.05)',
      border_color: 'rgba(255,255,255,0.08)',

      section_padding: 'default',
      content_width: 'default',
      card_radius: 'sm',
      element_gap: 'default',

      button_style: 'rounded',
      link_style: 'hover-underline',

      card_border: 'subtle',
      shadow: 'lg',
      divider_style: 'line',
    },
    sectionOrder: ['music', 'bio', 'technical', 'events', 'photos', 'press', 'contact'],
    heroStyle: 'contained',
    bioLayout: 'two-column',
  },
]

// ---------------------------------------------------------------------------
// getTemplate – look up a template by id (falls back to first)
// ---------------------------------------------------------------------------

export function getTemplate(id: string): TemplateConfig {
  return TEMPLATES.find((t) => t.id === id) || TEMPLATES[0]
}

// ---------------------------------------------------------------------------
// ResolvedTheme – fully resolved CSS-ready values
// ---------------------------------------------------------------------------

export interface ResolvedTheme {
  // Colors
  accent: string
  bg: string
  textColor: string
  headingColor: string
  linkColor: string
  cardBg: string
  borderColor: string

  // Typography - display
  displayFont: string
  displaySize: string
  displayWeight: string

  // Typography - heading
  headingFont: string
  headingSize: string
  headingWeight: string

  // Typography - subheading
  subheadingFont: string
  subheadingSize: string
  subheadingWeight: string

  // Typography - body
  bodyFont: string
  bodySize: string
  bodyWeight: string

  // Layout enums (raw)
  sectionPadding: string
  contentWidth: string
  cardRadius: string
  elementGap: string
  buttonStyle: string
  linkStyle: string
  cardBorder: string
  shadow: string
  dividerStyle: string

  // Layout CSS values (resolved from maps)
  sectionPaddingCss: string
  contentWidthCss: string
  cardRadiusCss: string
  elementGapCss: string
  buttonRadiusCss: string
  shadowCss: string
  borderWidthCss: string

  // Layout
  heroStyle: string
  bioLayout: string
}

// ---------------------------------------------------------------------------
// resolveTheme – merge search overrides > profile columns > template defaults
// ---------------------------------------------------------------------------

export function resolveTheme(
  profile: Record<string, unknown>,
  templateConfig: TemplateConfig,
  searchOverrides?: Record<string, string | undefined>,
): ResolvedTheme {
  const d = templateConfig.defaults

  // Helper: pick first non-null/undefined/empty value
  const pick = (...values: (string | null | undefined)[]): string => {
    for (const v of values) {
      if (v != null && v !== '') return v
    }
    return ''
  }

  // -- Colors ---------------------------------------------------------------
  const accent = pick(
    searchOverrides?.accent_color,
    profile.accent_color as string | null,
    d.accent_color,
  )

  const bg = pick(
    searchOverrides?.bg_color,
    profile.bg_color as string | null,
    d.bg_color,
  )

  const textColor = pick(
    searchOverrides?.theme_text_color,
    profile.theme_text_color as string | null,
    d.text_color,
  )

  const headingColorRaw = pick(
    searchOverrides?.theme_heading_color,
    profile.theme_heading_color as string | null,
    d.heading_color,
  )
  const headingColor = headingColorRaw || textColor

  const linkColorRaw = pick(
    searchOverrides?.theme_link_color,
    profile.theme_link_color as string | null,
    d.link_color,
  )
  const linkColor = linkColorRaw || accent

  const cardBg = pick(
    searchOverrides?.theme_card_bg,
    profile.theme_card_bg as string | null,
    d.card_bg,
  )

  const borderColor = pick(
    searchOverrides?.theme_border_color,
    profile.theme_border_color as string | null,
    d.border_color,
  )

  // -- Typography: display --------------------------------------------------
  const displayFont = pick(
    searchOverrides?.theme_display_font,
    profile.theme_display_font as string | null,
    profile.font_family as string | null,
    d.display.font,
  )
  const displaySize = pick(
    searchOverrides?.theme_display_size,
    profile.theme_display_size as string | null,
    d.display.size,
  )
  const displayWeight = pick(
    searchOverrides?.theme_display_weight,
    profile.theme_display_weight as string | null,
    d.display.weight,
  )

  // -- Typography: heading --------------------------------------------------
  const headingFont = pick(
    searchOverrides?.theme_heading_font,
    profile.theme_heading_font as string | null,
    profile.font_family as string | null,
    d.heading.font,
  )
  const headingSize = pick(
    searchOverrides?.theme_heading_size,
    profile.theme_heading_size as string | null,
    d.heading.size,
  )
  const headingWeight = pick(
    searchOverrides?.theme_heading_weight,
    profile.theme_heading_weight as string | null,
    d.heading.weight,
  )

  // -- Typography: subheading -----------------------------------------------
  const subheadingFont = pick(
    searchOverrides?.theme_subheading_font,
    profile.theme_subheading_font as string | null,
    profile.font_family as string | null,
    d.subheading.font,
  )
  const subheadingSize = pick(
    searchOverrides?.theme_subheading_size,
    profile.theme_subheading_size as string | null,
    d.subheading.size,
  )
  const subheadingWeight = pick(
    searchOverrides?.theme_subheading_weight,
    profile.theme_subheading_weight as string | null,
    d.subheading.weight,
  )

  // -- Typography: body -----------------------------------------------------
  const bodyFont = pick(
    searchOverrides?.theme_body_font,
    profile.theme_body_font as string | null,
    profile.font_family as string | null,
    d.body.font,
  )
  const bodySize = pick(
    searchOverrides?.theme_body_size,
    profile.theme_body_size as string | null,
    d.body.size,
  )
  const bodyWeight = pick(
    searchOverrides?.theme_body_weight,
    profile.theme_body_weight as string | null,
    d.body.weight,
  )

  // -- Layout enums ---------------------------------------------------------
  const sectionPadding = pick(
    searchOverrides?.theme_section_padding,
    profile.theme_section_padding as string | null,
    d.section_padding,
  )
  const contentWidth = pick(
    searchOverrides?.theme_content_width,
    profile.theme_content_width as string | null,
    d.content_width,
  )
  const cardRadius = pick(
    searchOverrides?.theme_card_radius,
    profile.theme_card_radius as string | null,
    d.card_radius,
  )
  const elementGap = pick(
    searchOverrides?.theme_element_gap,
    profile.theme_element_gap as string | null,
    d.element_gap,
  )
  const buttonStyle = pick(
    searchOverrides?.theme_button_style,
    profile.theme_button_style as string | null,
    d.button_style,
  )
  const linkStyle = pick(
    searchOverrides?.theme_link_style,
    profile.theme_link_style as string | null,
    d.link_style,
  )
  const cardBorder = pick(
    searchOverrides?.theme_card_border,
    profile.theme_card_border as string | null,
    d.card_border,
  )
  const shadow = pick(
    searchOverrides?.theme_shadow,
    profile.theme_shadow as string | null,
    d.shadow,
  )
  const dividerStyle = pick(
    searchOverrides?.theme_divider_style,
    profile.theme_divider_style as string | null,
    d.divider_style,
  )

  // -- Resolve CSS values from maps -----------------------------------------
  const sectionPaddingCss = SECTION_PADDING_MAP[sectionPadding] || SECTION_PADDING_MAP.default
  const contentWidthCss = CONTENT_WIDTH_MAP[contentWidth] || CONTENT_WIDTH_MAP.default
  const cardRadiusCss = CARD_RADIUS_MAP[cardRadius] || CARD_RADIUS_MAP.sm
  const elementGapCss = ELEMENT_GAP_MAP[elementGap] || ELEMENT_GAP_MAP.default
  const buttonRadiusCss = BUTTON_RADIUS_MAP[buttonStyle] || BUTTON_RADIUS_MAP.rounded
  const shadowCss = SHADOW_MAP[shadow] || SHADOW_MAP.none
  const borderWidthCss = BORDER_WIDTH_MAP[cardBorder] || BORDER_WIDTH_MAP.none

  return {
    // Colors
    accent,
    bg,
    textColor,
    headingColor,
    linkColor,
    cardBg: cardBg,
    borderColor,

    // Typography - display
    displayFont,
    displaySize,
    displayWeight,

    // Typography - heading
    headingFont,
    headingSize,
    headingWeight,

    // Typography - subheading
    subheadingFont,
    subheadingSize,
    subheadingWeight,

    // Typography - body
    bodyFont,
    bodySize,
    bodyWeight,

    // Layout enums (raw)
    sectionPadding,
    contentWidth,
    cardRadius,
    elementGap,
    buttonStyle,
    linkStyle,
    cardBorder,
    shadow,
    dividerStyle,

    // Layout CSS values (resolved)
    sectionPaddingCss,
    contentWidthCss,
    cardRadiusCss,
    elementGapCss,
    buttonRadiusCss,
    shadowCss,
    borderWidthCss,

    // Layout
    heroStyle: templateConfig.heroStyle,
    bioLayout: templateConfig.bioLayout,
  }
}
