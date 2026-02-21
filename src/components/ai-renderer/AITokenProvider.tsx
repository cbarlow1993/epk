import { createContext, useContext, useMemo } from 'react'
import type { AIDesignTokens } from '~/schemas/ai-design-tokens'

const AITokenContext = createContext<AIDesignTokens | null>(null)

export function useAITokens(): AIDesignTokens {
  const ctx = useContext(AITokenContext)
  if (!ctx) throw new Error('useAITokens must be used within AITokenProvider')
  return ctx
}

function tokensToCSSVars(tokens: AIDesignTokens): React.CSSProperties {
  const vars: Record<string, string> = {}

  // Colors
  for (const [key, value] of Object.entries(tokens.colors)) {
    vars[`--ai-color-${key}`] = value
  }

  // Typography — font families and sizes for each tier
  for (const [tier, config] of Object.entries(tokens.typography)) {
    vars[`--ai-font-${tier}`] = `'${config.fontFamily}', sans-serif`
    vars[`--ai-size-${tier}`] = config.fontSize
    vars[`--ai-weight-${tier}`] = config.fontWeight
    if (config.lineHeight) vars[`--ai-leading-${tier}`] = config.lineHeight
    if (config.letterSpacing) vars[`--ai-tracking-${tier}`] = config.letterSpacing
    if (config.textTransform) vars[`--ai-transform-${tier}`] = config.textTransform
  }

  // Spacing
  for (const [key, value] of Object.entries(tokens.spacing)) {
    vars[`--ai-spacing-${key}`] = value
  }

  // Radii
  for (const [key, value] of Object.entries(tokens.radii)) {
    vars[`--ai-radius-${key}`] = value
  }

  // Shadows
  for (const [key, value] of Object.entries(tokens.shadows)) {
    vars[`--ai-shadow-${key}`] = value
  }

  // Animation
  if (tokens.animation.duration) vars['--ai-animation-duration'] = tokens.animation.duration
  if (tokens.animation.easing) vars['--ai-animation-easing'] = tokens.animation.easing

  // Layout
  vars['--ai-content-width'] = tokens.layout.contentWidth
  vars['--ai-section-padding'] = tokens.layout.sectionPadding

  return vars as React.CSSProperties
}

function buildGoogleFontsUrl(fontImports: string[]): string | null {
  if (fontImports.length === 0) return null
  const families = fontImports
    .map((f) => `family=${f.replace(/ /g, '+')}:wght@300;400;500;600;700;800;900`)
    .join('&')
  return `https://fonts.googleapis.com/css2?${families}&display=swap`
}

export function AITokenProvider({
  tokens,
  children,
}: {
  tokens: AIDesignTokens
  children: React.ReactNode
}) {
  const cssVars = useMemo(() => tokensToCSSVars(tokens), [tokens])
  const fontUrl = useMemo(() => buildGoogleFontsUrl(tokens.fontImports), [tokens.fontImports])

  return (
    <AITokenContext.Provider value={tokens}>
      {fontUrl && <link rel="stylesheet" href={fontUrl} />}
      <div style={cssVars}>{children}</div>
    </AITokenContext.Provider>
  )
}
