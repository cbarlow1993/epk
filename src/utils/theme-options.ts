// Google Fonts list — organized by category
export const GOOGLE_FONTS = {
  'Sans Serif': [
    'Inter', 'DM Sans', 'Space Grotesk', 'Outfit', 'Poppins', 'Montserrat',
    'Instrument Sans', 'Bricolage Grotesque', 'Plus Jakarta Sans', 'Sora',
    'Manrope', 'Urbanist', 'Figtree', 'Nunito', 'Raleway', 'Rubik',
    'Work Sans', 'Lato', 'Open Sans', 'Source Sans 3', 'Barlow', 'Exo 2',
    'Jost', 'Albert Sans', 'Karla',
  ],
  'Serif': [
    'Playfair Display', 'Cormorant Garamond', 'Lora', 'Merriweather',
    'Crimson Text', 'Fraunces', 'DM Serif Display', 'Libre Baskerville',
    'Source Serif 4', 'EB Garamond', 'Bitter', 'Vollkorn', 'Noto Serif',
    'Spectral', 'Literata',
  ],
  'Display': [
    'Bebas Neue', 'Oswald', 'Anton', 'Archivo Black', 'Bungee',
    'Dela Gothic One', 'Righteous', 'Russo One', 'Squada One', 'Teko', 'Ultra',
  ],
  'Monospace': [
    'JetBrains Mono', 'Fira Code', 'Space Mono', 'IBM Plex Mono', 'Source Code Pro',
  ],
} as const

// Flat list of all font names
export const ALL_GOOGLE_FONTS: string[] = Object.values(GOOGLE_FONTS).flat()

// Font size ranges per typography tier
export const FONT_SIZE_RANGES = {
  display:    { min: 3,     max: 8,    step: 0.25,  unit: 'rem' },
  heading:    { min: 1.25,  max: 3,    step: 0.125, unit: 'rem' },
  subheading: { min: 0.875, max: 1.5,  step: 0.125, unit: 'rem' },
  body:       { min: 0.875, max: 1.25, step: 0.0625, unit: 'rem' },
} as const

export type TypographyTierName = keyof typeof FONT_SIZE_RANGES

// Font weight options
export const FONT_WEIGHTS = [
  { value: '300', label: 'Light' },
  { value: '400', label: 'Regular' },
  { value: '500', label: 'Medium' },
  { value: '600', label: 'SemiBold' },
  { value: '700', label: 'Bold' },
  { value: '800', label: 'ExtraBold' },
  { value: '900', label: 'Black' },
] as const
