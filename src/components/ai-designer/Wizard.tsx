import { useState, useCallback } from 'react'
import { VIBE_PRESETS, type VibePreset } from '~/utils/ai-vibe-presets'
import { BTN_PRIMARY, BTN_BASE } from '~/components/forms/styles'
import type { AIDesignTokens, TokenLockState } from '~/schemas/ai-design-tokens'

interface WizardProps {
  onComplete: (tokens: AIDesignTokens, lockState: TokenLockState) => void
  onCancel?: () => void
  profile: Record<string, unknown>
  initialStep?: number
}

// Font pairings organized by aesthetic — display font + body font
const FONT_PAIRINGS: Array<{
  id: string
  label: string
  display: string
  body: string
  vibes: string[]
}> = [
  { id: 'modern-clean', label: 'Modern Clean', display: 'Space Grotesk', body: 'DM Sans', vibes: ['clean-minimal', 'neon-electric', 'bold-graphic'] },
  { id: 'elegant-serif', label: 'Elegant Serif', display: 'Playfair Display', body: 'Lora', vibes: ['warm-organic', 'ethereal-ambient', 'retro-vintage'] },
  { id: 'bold-impact', label: 'Bold Impact', display: 'Bebas Neue', body: 'Inter', vibes: ['dark-moody', 'bold-graphic', 'raw-underground'] },
  { id: 'tech-mono', label: 'Tech Mono', display: 'Space Mono', body: 'IBM Plex Mono', vibes: ['raw-underground', 'neon-electric'] },
  { id: 'classic-modern', label: 'Classic Modern', display: 'Cormorant Garamond', body: 'Raleway', vibes: ['ethereal-ambient', 'warm-organic', 'clean-minimal'] },
  { id: 'display-heavy', label: 'Display Heavy', display: 'Anton', body: 'Barlow', vibes: ['bold-graphic', 'dark-moody', 'neon-electric'] },
  { id: 'vintage-feel', label: 'Vintage Feel', display: 'Oswald', body: 'Crimson Text', vibes: ['retro-vintage', 'warm-organic'] },
  { id: 'soft-readable', label: 'Soft & Readable', display: 'Outfit', body: 'Nunito', vibes: ['clean-minimal', 'ethereal-ambient'] },
]

const STEPS = [
  { label: 'Vibe', title: "What's your vibe?" },
  { label: 'Colors', title: 'Pick your colors' },
  { label: 'Typography', title: 'Choose your typography' },
  { label: 'Generate', title: 'Generate your EPK' },
]

export function Wizard({ onComplete, onCancel, initialStep = 0 }: WizardProps) {
  const [step, setStep] = useState(initialStep)
  const [selectedVibe, setSelectedVibe] = useState<VibePreset | null>(null)
  const [colorOverrides, setColorOverrides] = useState<{
    primary?: string
    accent?: string
    background?: string
  }>({})
  const [fontOverride, setFontOverride] = useState<{
    display?: string
    body?: string
  } | null>(null)
  const [lockState, setLockState] = useState<TokenLockState>({})

  const canGoNext = useCallback(() => {
    if (step === 0) return selectedVibe !== null
    return true
  }, [step, selectedVibe])

  const handleNext = useCallback(() => {
    if (step < STEPS.length - 1) {
      setStep(step + 1)
    }
  }, [step])

  const handleBack = useCallback(() => {
    if (step > 0) {
      setStep(step - 1)
    }
  }, [step])

  const handleVibeSelect = useCallback((vibe: VibePreset) => {
    setSelectedVibe(vibe)
    // Reset overrides when vibe changes
    setColorOverrides({})
    setFontOverride(null)
    setLockState({})
  }, [])

  const handleColorChange = useCallback((key: 'primary' | 'accent' | 'background', value: string) => {
    setColorOverrides((prev) => ({ ...prev, [key]: value }))
    setLockState((prev) => ({ ...prev, [`colors.${key}`]: 'locked' }))
  }, [])

  const handleFontSelect = useCallback((display: string, body: string) => {
    setFontOverride({ display, body })
    setLockState((prev) => ({
      ...prev,
      'typography.display.fontFamily': 'locked',
      'typography.body.fontFamily': 'locked',
    }))
  }, [])

  const handleSkipColors = useCallback(() => {
    setColorOverrides({})
    // Remove any color locks
    setLockState((prev) => {
      const next = { ...prev }
      delete next['colors.primary']
      delete next['colors.accent']
      delete next['colors.background']
      return next
    })
    setStep(2)
  }, [])

  const handleSkipFonts = useCallback(() => {
    setFontOverride(null)
    // Remove any font locks
    setLockState((prev) => {
      const next = { ...prev }
      delete next['typography.display.fontFamily']
      delete next['typography.body.fontFamily']
      return next
    })
    setStep(3)
  }, [])

  const handleGenerate = useCallback(() => {
    if (!selectedVibe) return

    // Build final tokens from vibe preset + overrides
    const tokens: AIDesignTokens = structuredClone(selectedVibe.tokens)

    // Apply color overrides
    if (colorOverrides.primary) tokens.colors.primary = colorOverrides.primary
    if (colorOverrides.accent) {
      tokens.colors.accent = colorOverrides.accent
      tokens.colors.link = colorOverrides.accent
    }
    if (colorOverrides.background) tokens.colors.background = colorOverrides.background

    // Apply font overrides
    if (fontOverride) {
      const fontImports = new Set(tokens.fontImports)
      if (fontOverride.display) {
        tokens.typography.display.fontFamily = fontOverride.display
        tokens.typography.h1.fontFamily = fontOverride.display
        tokens.typography.h2.fontFamily = fontOverride.display
        fontImports.add(fontOverride.display)
      }
      if (fontOverride.body) {
        tokens.typography.body.fontFamily = fontOverride.body
        tokens.typography.h3.fontFamily = fontOverride.body
        tokens.typography.h4.fontFamily = fontOverride.body
        tokens.typography.small.fontFamily = fontOverride.body
        fontImports.add(fontOverride.body)
      }
      tokens.fontImports = Array.from(fontImports)
    }

    onComplete(tokens, lockState)
  }, [selectedVibe, colorOverrides, fontOverride, lockState, onComplete])

  // Auto-generate on reaching step 3
  const handleStepChange = useCallback((newStep: number) => {
    setStep(newStep)
    if (newStep === 3) {
      // Small delay so the loading state renders
      setTimeout(handleGenerate, 400)
    }
  }, [handleGenerate])

  const goNext = useCallback(() => {
    const nextStep = step + 1
    handleStepChange(nextStep)
  }, [step, handleStepChange])

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Step indicator */}
      <div className="flex-none px-6 pt-6 pb-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-text-primary">
            {STEPS[step].title}
          </h2>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className={`${BTN_BASE} text-text-secondary hover:text-text-primary`}
            >
              Cancel
            </button>
          )}
        </div>

        {/* Progress bar */}
        <div className="flex gap-2">
          {STEPS.map((s, i) => (
            <div key={s.label} className="flex-1 flex flex-col items-center gap-1">
              <div
                className={`h-1 w-full rounded-full transition-colors ${
                  i <= step ? 'bg-accent' : 'bg-border'
                }`}
              />
              <span className={`text-xs ${i <= step ? 'text-text-primary' : 'text-text-secondary'}`}>
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Step content */}
      <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-4">
        {step === 0 && (
          <VibeStep
            selected={selectedVibe}
            onSelect={handleVibeSelect}
          />
        )}
        {step === 1 && selectedVibe && (
          <ColorStep
            vibe={selectedVibe}
            overrides={colorOverrides}
            onChange={handleColorChange}
            onSkip={handleSkipColors}
          />
        )}
        {step === 2 && selectedVibe && (
          <TypographyStep
            vibe={selectedVibe}
            selected={fontOverride}
            onSelect={handleFontSelect}
            onSkip={handleSkipFonts}
          />
        )}
        {step === 3 && (
          <GenerateStep />
        )}
      </div>

      {/* Navigation */}
      {step < 3 && (
        <div className="flex-none px-6 py-4 border-t border-border flex justify-between">
          <button
            type="button"
            onClick={handleBack}
            disabled={step === 0}
            className={`${BTN_BASE} text-text-secondary hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed`}
          >
            Back
          </button>
          <button
            type="button"
            onClick={goNext}
            disabled={!canGoNext()}
            className={BTN_PRIMARY}
          >
            {step === 2 ? 'Generate' : 'Next'}
          </button>
        </div>
      )}
    </div>
  )
}

// -- Step 1: Vibe Selection --

function VibeStep({
  selected,
  onSelect,
}: {
  selected: VibePreset | null
  onSelect: (vibe: VibePreset) => void
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {VIBE_PRESETS.map((vibe) => {
        const isSelected = selected?.id === vibe.id
        const colors = vibe.tokens.colors
        return (
          <button
            key={vibe.id}
            type="button"
            onClick={() => onSelect(vibe)}
            className={`text-left p-4 border rounded transition-all ${
              isSelected
                ? 'border-accent bg-accent/10 ring-1 ring-accent'
                : 'border-border bg-surface hover:border-text-secondary'
            }`}
          >
            <div className="font-semibold text-sm text-text-primary mb-1">
              {vibe.label}
            </div>
            <div className="text-xs text-text-secondary mb-3">
              {vibe.description}
            </div>
            {/* Color swatches */}
            <div className="flex gap-1">
              {[colors.background, colors.primary, colors.accent, colors.text, colors.surface].map(
                (color, i) => (
                  <div
                    key={i}
                    className="w-5 h-5 rounded-sm border border-white/10"
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ),
              )}
            </div>
          </button>
        )
      })}
    </div>
  )
}

// -- Step 2: Color Customization --

function ColorStep({
  vibe,
  overrides,
  onChange,
  onSkip,
}: {
  vibe: VibePreset
  overrides: { primary?: string; accent?: string; background?: string }
  onChange: (key: 'primary' | 'accent' | 'background', value: string) => void
  onSkip: () => void
}) {
  const colors = vibe.tokens.colors

  const colorFields: Array<{ key: 'primary' | 'accent' | 'background'; label: string }> = [
    { key: 'primary', label: 'Primary' },
    { key: 'accent', label: 'Accent' },
    { key: 'background', label: 'Background' },
  ]

  return (
    <div>
      <p className="text-sm text-text-secondary mb-6">
        Customize the core colors for your EPK, or let AI decide for you.
      </p>

      <div className="space-y-4 mb-6">
        {colorFields.map(({ key, label }) => {
          const currentValue = overrides[key] ?? colors[key]
          return (
            <div key={key} className="flex items-center gap-4">
              <label className="text-sm font-medium text-text-primary w-24">
                {label}
              </label>
              <div className="relative">
                <input
                  type="color"
                  value={currentValue}
                  onChange={(e) => onChange(key, e.target.value)}
                  className="w-10 h-10 rounded border border-border cursor-pointer bg-transparent"
                />
              </div>
              <span className="text-xs text-text-secondary font-mono">
                {currentValue}
              </span>
              {overrides[key] && (
                <span className="text-xs text-accent">locked</span>
              )}
            </div>
          )
        })}
      </div>

      {/* Preview swatch bar */}
      <div className="rounded border border-border overflow-hidden mb-6">
        <div className="flex h-12">
          <div className="flex-1" style={{ backgroundColor: overrides.background ?? colors.background }} />
          <div className="flex-1" style={{ backgroundColor: overrides.primary ?? colors.primary }} />
          <div className="flex-1" style={{ backgroundColor: overrides.accent ?? colors.accent }} />
          <div className="flex-1" style={{ backgroundColor: colors.surface }} />
          <div className="flex-1" style={{ backgroundColor: colors.text }} />
        </div>
      </div>

      <button
        type="button"
        onClick={onSkip}
        className={`${BTN_BASE} text-text-secondary hover:text-accent`}
      >
        Let AI decide &rarr;
      </button>
    </div>
  )
}

// -- Step 3: Typography --

function TypographyStep({
  vibe,
  selected,
  onSelect,
  onSkip,
}: {
  vibe: VibePreset
  selected: { display?: string; body?: string } | null
  onSelect: (display: string, body: string) => void
  onSkip: () => void
}) {
  // Filter pairings relevant to this vibe, plus always show a few universals
  const relevantPairings = FONT_PAIRINGS.filter(
    (p) => p.vibes.includes(vibe.id),
  )
  // Add the current vibe's font pairing as the first option if not already there
  const vibeDisplayFont = vibe.tokens.typography.display.fontFamily
  const vibeBodyFont = vibe.tokens.typography.body.fontFamily
  const hasVibePairing = relevantPairings.some(
    (p) => p.display === vibeDisplayFont && p.body === vibeBodyFont,
  )

  const pairings = hasVibePairing
    ? relevantPairings
    : [
        {
          id: 'vibe-default',
          label: `${vibe.label} Default`,
          display: vibeDisplayFont,
          body: vibeBodyFont,
          vibes: [vibe.id],
        },
        ...relevantPairings,
      ]

  // Ensure we have at least 4 options by padding with general pairings
  const allPairings = pairings.length >= 4
    ? pairings
    : [
        ...pairings,
        ...FONT_PAIRINGS.filter((p) => !pairings.some((rp) => rp.id === p.id)).slice(
          0,
          4 - pairings.length,
        ),
      ]

  // Build Google Fonts URL for previewing all pairing fonts
  const previewFonts = new Set<string>()
  for (const p of allPairings) {
    previewFonts.add(p.display)
    previewFonts.add(p.body)
  }
  const fontUrl = `https://fonts.googleapis.com/css2?${Array.from(previewFonts)
    .map((f) => `family=${encodeURIComponent(f)}:wght@300;400;600;700`)
    .join('&')}&display=swap`

  return (
    <div>
      <link rel="stylesheet" href={fontUrl} />
      <p className="text-sm text-text-secondary mb-6">
        Choose a font pairing for your EPK, or let AI decide.
      </p>

      <div className="grid grid-cols-2 gap-3 mb-6">
        {allPairings.map((pairing) => {
          const isSelected =
            selected?.display === pairing.display && selected?.body === pairing.body
          return (
            <button
              key={pairing.id}
              type="button"
              onClick={() => onSelect(pairing.display, pairing.body)}
              className={`text-left p-4 border rounded transition-all ${
                isSelected
                  ? 'border-accent bg-accent/10 ring-1 ring-accent'
                  : 'border-border bg-surface hover:border-text-secondary'
              }`}
            >
              <div
                className="text-2xl mb-2 text-text-primary leading-tight"
                style={{ fontFamily: `'${pairing.display}', sans-serif` }}
              >
                {pairing.label}
              </div>
              <div
                className="text-sm text-text-secondary leading-relaxed"
                style={{ fontFamily: `'${pairing.body}', sans-serif` }}
              >
                The quick brown fox jumps over the lazy dog.
              </div>
              <div className="mt-2 text-xs text-text-secondary">
                <span className="font-medium">{pairing.display}</span>
                {' + '}
                <span className="font-medium">{pairing.body}</span>
              </div>
            </button>
          )
        })}
      </div>

      <button
        type="button"
        onClick={onSkip}
        className={`${BTN_BASE} text-text-secondary hover:text-accent`}
      >
        Let AI decide &rarr;
      </button>
    </div>
  )
}

// -- Step 4: Generate --

function GenerateStep() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {/* Spinner */}
      <div className="w-12 h-12 border-4 border-border border-t-accent rounded-full animate-spin mb-6" />
      <h3 className="text-lg font-semibold text-text-primary mb-2">
        Generating your design...
      </h3>
      <p className="text-sm text-text-secondary max-w-sm">
        Building your EPK design tokens from the selected vibe and preferences.
      </p>
    </div>
  )
}
