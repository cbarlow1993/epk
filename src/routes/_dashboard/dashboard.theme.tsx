import { createFileRoute } from '@tanstack/react-router'
import { useForm, type UseFormSetValue, type UseFormWatch, type UseFormRegister, type FieldErrors } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { z } from 'zod'
import { getProfile, updateProfile } from '~/server/profile'
import { profileUpdateSchema, type ProfileUpdate } from '~/schemas/profile'
import { FormColorInput, FontPicker, FORM_LABEL, FORM_INPUT, FORM_FILE_INPUT, BTN_PRIMARY } from '~/components/forms'
import { useDashboardSave } from '~/hooks/useDashboardSave'
import { DashboardHeader } from '~/components/DashboardHeader'
import { Accordion } from '~/components/Accordion'
import { ProGate } from '~/components/ProGate'
import { TEMPLATES, getTemplate } from '~/utils/templates'
import { FONT_SIZE_RANGES, FONT_WEIGHTS, type TypographyTierName } from '~/utils/theme-options'

// ---------------------------------------------------------------------------
// Schema — pick all theme-related fields from profileUpdateSchema
// ---------------------------------------------------------------------------

const themeSchema = profileUpdateSchema
  .pick({
    // Legacy
    accent_color: true,
    bg_color: true,
    font_family: true,
    template: true,
    animate_sections: true,
    // Layout
    hero_style: true,
    bio_layout: true,
    events_layout: true,
    music_layout: true,
    // Typography
    theme_display_font: true,
    theme_display_size: true,
    theme_display_weight: true,
    theme_heading_font: true,
    theme_heading_size: true,
    theme_heading_weight: true,
    theme_subheading_font: true,
    theme_subheading_size: true,
    theme_subheading_weight: true,
    theme_body_font: true,
    theme_body_size: true,
    theme_body_weight: true,
    // Colors
    theme_text_color: true,
    theme_heading_color: true,
    theme_link_color: true,
    theme_card_bg: true,
    theme_border_color: true,
    // Spacing & Layout
    theme_section_padding: true,
    theme_content_width: true,
    theme_card_radius: true,
    theme_element_gap: true,
    // Buttons & Links
    theme_button_style: true,
    theme_link_style: true,
    // Effects
    theme_card_border: true,
    theme_shadow: true,
    theme_divider_style: true,
    // Custom Fonts
    theme_custom_fonts: true,
  })
  .partial()

type ThemeFormValues = z.infer<typeof themeSchema>

// ---------------------------------------------------------------------------
// Route
// ---------------------------------------------------------------------------

export const Route = createFileRoute('/_dashboard/dashboard/theme')({
  loader: () => getProfile(),
  component: ThemeEditor,
})

// ---------------------------------------------------------------------------
// Inline helper components
// ---------------------------------------------------------------------------

function OptionPicker({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string | null | undefined
  options: Array<{ value: string; label: string }>
  onChange: (v: string) => void
}) {
  return (
    <div>
      <label className={FORM_LABEL}>{label}</label>
      <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={value === opt.value}
            onClick={() => onChange(opt.value)}
            className={`px-3 py-1.5 text-xs border transition-colors ${
              value === opt.value
                ? 'border-accent bg-accent/10 text-accent'
                : 'border-border text-text-secondary hover:border-text-primary'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Typography tier controls — extracted as standalone component
// ---------------------------------------------------------------------------

function TypographyTierControls({
  tier,
  label,
  selectedTemplate,
  watch: formWatch,
  setValue: formSetValue,
  customFonts,
}: {
  tier: TypographyTierName
  label: string
  selectedTemplate: string
  watch: UseFormWatch<ThemeFormValues>
  setValue: UseFormSetValue<ThemeFormValues>
  customFonts: Array<{ name: string; url: string; weight: string }>
}) {
  const fontField = `theme_${tier}_font` as const
  const sizeField = `theme_${tier}_size` as const
  const weightField = `theme_${tier}_weight` as const

  const tplDefaults = getTemplate(selectedTemplate).defaults
  const tierDefaults = tplDefaults[tier]

  const currentFont = formWatch(fontField) || tierDefaults.font
  const currentSize = formWatch(sizeField) || tierDefaults.size
  const currentWeight = formWatch(weightField) || tierDefaults.weight

  const range = FONT_SIZE_RANGES[tier]
  const sizeNum = parseFloat(currentSize) || range.min

  return (
    <div className="space-y-4">
      <p className="text-sm font-semibold text-text-primary">{label}</p>

      <FontPicker
        label="Font"
        value={currentFont}
        onChange={(font) => formSetValue(fontField, font, { shouldDirty: true })}
        customFonts={customFonts || undefined}
      />

      <div>
        <label className={FORM_LABEL}>
          Size <span className="text-text-secondary/60 font-normal normal-case">({currentSize})</span>
        </label>
        <input
          type="range"
          min={range.min}
          max={range.max}
          step={range.step}
          value={sizeNum}
          onChange={(e) => formSetValue(sizeField, `${e.target.value}${range.unit}`, { shouldDirty: true })}
          className="w-full accent-accent"
        />
        <div className="flex justify-between text-[10px] text-text-secondary mt-1">
          <span>{range.min}{range.unit}</span>
          <span>{range.max}{range.unit}</span>
        </div>
      </div>

      <div>
        <label className={FORM_LABEL}>Weight</label>
        <div role="radiogroup" aria-label={`${label} weight`} className="flex flex-wrap gap-1.5">
          {FONT_WEIGHTS.map((w) => (
            <button
              key={w.value}
              type="button"
              role="radio"
              aria-checked={currentWeight === w.value}
              onClick={() => formSetValue(weightField, w.value, { shouldDirty: true })}
              className={`px-2.5 py-1 text-[11px] border transition-colors ${
                currentWeight === w.value
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-border text-text-secondary hover:border-text-primary'
              }`}
            >
              {w.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Color field with reset button — extracted as standalone component
// ---------------------------------------------------------------------------

type ThemeColorField = 'theme_text_color' | 'theme_heading_color' | 'theme_link_color' | 'theme_card_bg' | 'theme_border_color'

function ColorField({
  label: fieldLabel,
  field,
  watch: formWatch,
  setValue: formSetValue,
  register: formRegister,
  errors,
}: {
  label: string
  field: ThemeColorField
  watch: UseFormWatch<ThemeFormValues>
  setValue: UseFormSetValue<ThemeFormValues>
  register: UseFormRegister<ThemeFormValues>
  errors: FieldErrors<ThemeFormValues>
}) {
  const value = formWatch(field)
  const hasValue = value != null && value !== ''

  return (
    <div>
      {hasValue ? (
        <FormColorInput
          label={fieldLabel}
          value={value}
          registration={formRegister(field)}
          onChange={(v) => formSetValue(field, v, { shouldDirty: true })}
          error={errors[field] as { message?: string } | undefined}
        />
      ) : (
        <div>
          <label className={FORM_LABEL}>{fieldLabel}</label>
          <button
            type="button"
            onClick={() => formSetValue(field, '#000000', { shouldDirty: true })}
            className="w-full border border-dashed border-border px-4 py-2.5 text-xs text-text-secondary hover:border-text-primary transition-colors text-left"
          >
            Set custom colour...
          </button>
        </div>
      )}
      {hasValue && (
        <button
          type="button"
          onClick={() => formSetValue(field, null, { shouldDirty: true })}
          className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-text-secondary hover:text-accent transition-colors"
        >
          Reset to default
        </button>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Font upload section — extracted as standalone component
// ---------------------------------------------------------------------------

type CustomFont = { name: string; url: string; weight: string }

function FontUploadSection({
  customFonts,
  onAddFont,
  onRemoveFont,
}: {
  customFonts: CustomFont[]
  onAddFont: (font: CustomFont) => void
  onRemoveFont: (index: number) => void
}) {
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (customFonts.length >= 4) {
      setUploadError('Maximum 4 custom fonts allowed')
      return
    }

    setUploading(true)
    setUploadError('')

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/upload-font', { method: 'POST', body: formData })
      const result = await res.json()

      if (!result.success) {
        setUploadError(result.message || 'Upload failed')
      } else {
        const fontName = file.name.replace(/\.[^.]+$/, '').replace(/[_-]/g, ' ')
        onAddFont({ name: fontName, url: result.file.url, weight: '400' })
      }
    } catch {
      setUploadError('Upload failed. Please try again.')
    }

    setUploading(false)
    e.target.value = ''
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className={FORM_LABEL}>Upload Font</label>
        <span className="text-[10px] text-text-secondary">
          {customFonts.length} of 4 slots used
        </span>
      </div>

      <input
        type="file"
        accept=".woff2,.woff,.ttf,.otf"
        onChange={handleUpload}
        disabled={uploading || customFonts.length >= 4}
        className={FORM_FILE_INPUT}
      />

      {uploading && (
        <p className="text-xs text-text-secondary">Uploading...</p>
      )}
      {uploadError && (
        <p className="text-xs text-red-500">{uploadError}</p>
      )}

      {customFonts.length > 0 && (
        <div className="space-y-2 mt-3">
          {customFonts.map((font, i) => (
            <div key={i} className="flex items-center justify-between border border-border p-3">
              <div className="flex items-center gap-3">
                <span
                  className="text-lg font-medium"
                  style={{ fontFamily: `'${font.name.replace(/['"\\}{;()<>]/g, '')}', sans-serif` }}
                >
                  Aa
                </span>
                <div>
                  <p className="text-sm font-medium text-text-primary">{font.name}</p>
                  <p className="text-[10px] text-text-secondary">Weight: {font.weight}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onRemoveFont(i)}
                className="text-xs text-red-500 hover:text-red-700 font-semibold uppercase tracking-wider"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Template dropdown — shows selected template as trigger, opens card list
// ---------------------------------------------------------------------------

function TemplateCard({ tpl, isSelected, onClick }: {
  tpl: (typeof TEMPLATES)[number]
  isSelected: boolean
  onClick?: () => void
}) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`relative border p-3 text-left transition-all w-full ${
        isSelected
          ? 'border-accent bg-accent/10 ring-1 ring-accent'
          : 'border-border hover:border-text-primary bg-surface'
      }`}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <div
          className="w-4 h-4 rounded-full border border-border shrink-0"
          style={{ backgroundColor: tpl.defaults.accent_color }}
        />
        <span className="font-bold text-xs">{tpl.name}</span>
      </div>
      <p className="text-[10px] text-text-secondary leading-tight">{tpl.description}</p>
      <div className="mt-2 flex items-center gap-2">
        <div
          className="w-6 h-3 rounded shrink-0"
          style={{
            backgroundColor: tpl.defaults.bg_color,
            border: '1px solid rgba(128,128,128,0.2)',
          }}
        />
        <span
          className="text-[9px] text-text-secondary"
          style={{ fontFamily: tpl.defaults.font_family }}
        >
          {tpl.defaults.font_family}
        </span>
      </div>
    </Tag>
  )
}

function TemplateDropdown({ selectedTemplate, onSelect }: {
  selectedTemplate: string
  onSelect: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const currentTpl = useMemo(() => getTemplate(selectedTemplate), [selectedTemplate])

  // Close on click outside
  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open])

  return (
    <div className="mb-6 relative" ref={containerRef}>
      <label className={FORM_LABEL}>Template</label>

      {/* Trigger — shows current template */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full text-left"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <div className="relative">
          <TemplateCard tpl={currentTpl} isSelected={false} />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary">
            <svg className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-surface border border-border shadow-lg max-h-80 overflow-y-auto">
          <div className="grid grid-cols-2 gap-2 p-2">
            {TEMPLATES.map((tpl) => (
              <TemplateCard
                key={tpl.id}
                tpl={tpl}
                isSelected={selectedTemplate === tpl.id}
                onClick={() => {
                  onSelect(tpl.id)
                  setOpen(false)
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Branding section — standalone save (not part of the theme form)
// ---------------------------------------------------------------------------

function BrandingSection({ profile }: { profile: { tier?: string | null; favicon_url?: string | null; hide_platform_branding?: boolean | null } | null }) {
  const [faviconUrl, setFaviconUrl] = useState(profile?.favicon_url || '')
  const [hideBranding, setHideBranding] = useState(profile?.hide_platform_branding || false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  if (profile?.tier !== 'pro') {
    return <p className="text-text-secondary text-sm">Upgrade to Pro to customise branding.</p>
  }

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    setError('')
    const result = await updateProfile({
      data: {
        favicon_url: faviconUrl || undefined,
        hide_platform_branding: hideBranding,
      },
    })
    setSaving(false)
    if (result && 'error' in result && result.error) {
      setError(result.error as string)
    } else {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className={FORM_LABEL}>Favicon URL</label>
        <input
          type="text"
          value={faviconUrl}
          onChange={(e) => setFaviconUrl(e.target.value)}
          placeholder="https://example.com/favicon.ico"
          className={FORM_INPUT}
        />
      </div>
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="hide-branding"
          checked={hideBranding}
          onChange={(e) => setHideBranding(e.target.checked)}
          className="accent-accent w-4 h-4"
        />
        <label htmlFor="hide-branding" className="text-sm text-text-secondary cursor-pointer">
          Hide &ldquo;Built with myEPK&rdquo; footer
        </label>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className={BTN_PRIMARY}
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
        {saved && <span className="text-xs text-green-400">Saved!</span>}
        {error && <span className="text-xs text-red-500">{error}</span>}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

function ThemeEditor() {
  const initial = Route.useLoaderData()
  const { saving, saved, error, onSave: save } = useDashboardSave(updateProfile)
  const isPro = initial?.tier === 'pro'

  const currentTemplate = getTemplate(initial?.template || 'default')

  const {
    register,
    handleSubmit,
    watch,
    getValues,
    formState: { errors, isDirty },
    setValue,
  } = useForm<ThemeFormValues>({
    resolver: zodResolver(themeSchema),
    defaultValues: {
      // Legacy
      accent_color: initial?.accent_color || currentTemplate.defaults.accent_color,
      bg_color: initial?.bg_color || currentTemplate.defaults.bg_color,
      font_family: initial?.font_family || currentTemplate.defaults.font_family,
      template: (initial?.template as ProfileUpdate['template']) || 'default',
      animate_sections: initial?.animate_sections !== false,
      // Layout
      hero_style: initial?.hero_style ?? undefined,
      bio_layout: initial?.bio_layout ?? undefined,
      events_layout: initial?.events_layout ?? null,
      music_layout: initial?.music_layout ?? null,
      // Typography
      theme_display_font: initial?.theme_display_font ?? null,
      theme_display_size: initial?.theme_display_size ?? null,
      theme_display_weight: initial?.theme_display_weight ?? null,
      theme_heading_font: initial?.theme_heading_font ?? null,
      theme_heading_size: initial?.theme_heading_size ?? null,
      theme_heading_weight: initial?.theme_heading_weight ?? null,
      theme_subheading_font: initial?.theme_subheading_font ?? null,
      theme_subheading_size: initial?.theme_subheading_size ?? null,
      theme_subheading_weight: initial?.theme_subheading_weight ?? null,
      theme_body_font: initial?.theme_body_font ?? null,
      theme_body_size: initial?.theme_body_size ?? null,
      theme_body_weight: initial?.theme_body_weight ?? null,
      // Colors
      theme_text_color: initial?.theme_text_color ?? null,
      theme_heading_color: initial?.theme_heading_color ?? null,
      theme_link_color: initial?.theme_link_color ?? null,
      theme_card_bg: initial?.theme_card_bg ?? null,
      theme_border_color: initial?.theme_border_color ?? null,
      // Spacing & Layout
      theme_section_padding: initial?.theme_section_padding ?? null,
      theme_content_width: initial?.theme_content_width ?? null,
      theme_card_radius: initial?.theme_card_radius ?? null,
      theme_element_gap: initial?.theme_element_gap ?? null,
      // Buttons & Links
      theme_button_style: initial?.theme_button_style ?? null,
      theme_link_style: initial?.theme_link_style ?? null,
      // Effects
      theme_card_border: initial?.theme_card_border ?? null,
      theme_shadow: initial?.theme_shadow ?? null,
      theme_divider_style: initial?.theme_divider_style ?? null,
      // Custom Fonts
      theme_custom_fonts: initial?.theme_custom_fonts ?? null,
    },
  })

  const onSave = handleSubmit(save)

  // Watched values
  const selectedTemplate = watch('template') || 'default'
  const accentColor = watch('accent_color') || '#3b82f6'
  const bgColor = watch('bg_color') || '#0a0a0f'
  const animateSections = watch('animate_sections') !== false
  const customFonts = watch('theme_custom_fonts') ?? []

  // -------------------------------------------------------------------------
  // Template card click — reset ALL fields to template defaults
  // -------------------------------------------------------------------------
  function applyTemplate(templateId: string) {
    if (!window.confirm('Reset all theme settings to template defaults?')) return
    const tpl = getTemplate(templateId)
    const d = tpl.defaults

    // Legacy + template
    setValue('template', templateId as ProfileUpdate['template'], { shouldDirty: true })
    setValue('accent_color', d.accent_color, { shouldDirty: true })
    setValue('bg_color', d.bg_color, { shouldDirty: true })
    setValue('font_family', d.font_family, { shouldDirty: true })

    // Layout
    setValue('hero_style', tpl.heroStyle, { shouldDirty: true })
    setValue('bio_layout', tpl.bioLayout, { shouldDirty: true })
    setValue('events_layout', tpl.eventsLayout, { shouldDirty: true })
    setValue('music_layout', tpl.musicLayout, { shouldDirty: true })

    // Typography
    setValue('theme_display_font', d.display.font, { shouldDirty: true })
    setValue('theme_display_size', d.display.size, { shouldDirty: true })
    setValue('theme_display_weight', d.display.weight, { shouldDirty: true })
    setValue('theme_heading_font', d.heading.font, { shouldDirty: true })
    setValue('theme_heading_size', d.heading.size, { shouldDirty: true })
    setValue('theme_heading_weight', d.heading.weight, { shouldDirty: true })
    setValue('theme_subheading_font', d.subheading.font, { shouldDirty: true })
    setValue('theme_subheading_size', d.subheading.size, { shouldDirty: true })
    setValue('theme_subheading_weight', d.subheading.weight, { shouldDirty: true })
    setValue('theme_body_font', d.body.font, { shouldDirty: true })
    setValue('theme_body_size', d.body.size, { shouldDirty: true })
    setValue('theme_body_weight', d.body.weight, { shouldDirty: true })

    // Colors — set to null so resolveTheme() picks up template defaults
    // (template defaults may use rgba/8-char hex that the color picker can't handle)
    setValue('theme_text_color', null, { shouldDirty: true })
    setValue('theme_heading_color', null, { shouldDirty: true })
    setValue('theme_link_color', null, { shouldDirty: true })
    setValue('theme_card_bg', null, { shouldDirty: true })
    setValue('theme_border_color', null, { shouldDirty: true })

    // Spacing
    setValue('theme_section_padding', d.section_padding, { shouldDirty: true })
    setValue('theme_content_width', d.content_width, { shouldDirty: true })
    setValue('theme_card_radius', d.card_radius, { shouldDirty: true })
    setValue('theme_element_gap', d.element_gap, { shouldDirty: true })

    // Buttons & Links
    setValue('theme_button_style', d.button_style, { shouldDirty: true })
    setValue('theme_link_style', d.link_style, { shouldDirty: true })

    // Effects
    setValue('theme_card_border', d.card_border, { shouldDirty: true })
    setValue('theme_shadow', d.shadow, { shouldDirty: true })
    setValue('theme_divider_style', d.divider_style, { shouldDirty: true })

    // Animation
    setValue('animate_sections', true, { shouldDirty: true })

    // Custom Fonts — preserve (don't reset uploaded fonts when switching templates)
  }

  // -------------------------------------------------------------------------
  // Iframe preview — debounced URL reload on any form change
  // -------------------------------------------------------------------------
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [previewSrc, setPreviewSrc] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  const buildPreviewUrl = useCallback(() => {
    if (!initial?.slug) return ''
    const values = getValues()
    const params = new URLSearchParams()
    params.set('preview', 'true')
    for (const [key, value] of Object.entries(values)) {
      if (value != null && value !== '' && key !== 'theme_custom_fonts') {
        params.set(key, String(value))
      }
    }
    return `/${initial.slug}?${params.toString()}`
  }, [initial?.slug, getValues])

  // Initial iframe load
  useEffect(() => {
    if (!initial?.slug) return
    setPreviewSrc(buildPreviewUrl())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial?.slug])

  // Live preview: debounced iframe URL update on any form change
  useEffect(() => {
    const subscription = watch(() => {
      clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        const url = buildPreviewUrl()
        if (url && iframeRef.current) {
          iframeRef.current.src = url
        }
      }, 150)
    })
    return () => subscription.unsubscribe()
  }, [watch, buildPreviewUrl])

  // -------------------------------------------------------------------------
  // Accordion sections
  // -------------------------------------------------------------------------
  const proBadge = !isPro ? <span className="text-[9px] uppercase tracking-wider font-semibold text-text-secondary bg-text-secondary/10 px-1.5 py-0.5 rounded">Pro</span> : undefined

  const typoProps = { selectedTemplate, watch, setValue, customFonts: customFonts || [] }
  const colorProps = { watch, setValue, register, errors }

  const accordionSections = [
    {
      id: 'typography',
      title: 'Typography',
      badge: proBadge,
      children: (
        <ProGate isPro={isPro} feature="Advanced Typography">
          <div className="space-y-8">
            <TypographyTierControls tier="display" label="Display" {...typoProps} />
            <hr className="border-border" />
            <TypographyTierControls tier="heading" label="Heading" {...typoProps} />
            <hr className="border-border" />
            <TypographyTierControls tier="subheading" label="Subheading" {...typoProps} />
            <hr className="border-border" />
            <TypographyTierControls tier="body" label="Body" {...typoProps} />
          </div>
        </ProGate>
      ),
    },
    {
      id: 'colors',
      title: 'Colours',
      children: (
        <div className="space-y-5">
          {/* Accent + BG always visible */}
          <FormColorInput
            label="Accent Colour"
            value={accentColor}
            registration={register('accent_color')}
            onChange={(v) => setValue('accent_color', v, { shouldDirty: true })}
            error={errors.accent_color}
          />
          <FormColorInput
            label="Background Colour"
            value={bgColor}
            registration={register('bg_color')}
            onChange={(v) => setValue('bg_color', v, { shouldDirty: true })}
            error={errors.bg_color}
          />

          {/* Pro-only colours */}
          <ProGate isPro={isPro} feature="Advanced Colours">
            <div className="space-y-5 pt-2">
              <ColorField label="Text Colour" field="theme_text_color" {...colorProps} />
              <ColorField label="Heading Colour" field="theme_heading_color" {...colorProps} />
              <ColorField label="Link Colour" field="theme_link_color" {...colorProps} />
              <ColorField label="Card Background" field="theme_card_bg" {...colorProps} />
              <ColorField label="Border Colour" field="theme_border_color" {...colorProps} />
            </div>
          </ProGate>
        </div>
      ),
    },
    {
      id: 'layout',
      title: 'Layout',
      badge: proBadge,
      children: (
        <ProGate isPro={isPro} feature="Layout Controls">
          <div className="space-y-5">
            <OptionPicker
              label="Hero Style"
              value={watch('hero_style')}
              options={[
                { value: 'fullbleed', label: 'Full Bleed' },
                { value: 'contained', label: 'Contained' },
                { value: 'minimal', label: 'Minimal' },
              ]}
              onChange={(v) => setValue('hero_style', v as ProfileUpdate['hero_style'], { shouldDirty: true })}
            />
            <OptionPicker
              label="Bio Layout"
              value={watch('bio_layout')}
              options={[
                { value: 'two-column', label: 'Two Column' },
                { value: 'single-column', label: 'Single Column' },
              ]}
              onChange={(v) => setValue('bio_layout', v as ProfileUpdate['bio_layout'], { shouldDirty: true })}
            />
            <OptionPicker
              label="Events Layout"
              value={watch('events_layout')}
              options={[
                { value: 'grid', label: 'Grid' },
                { value: 'marquee', label: 'Marquee' },
                { value: 'carousel', label: 'Carousel' },
                { value: 'timeline', label: 'Timeline' },
              ]}
              onChange={(v) => setValue('events_layout', v as ProfileUpdate['events_layout'], { shouldDirty: true })}
            />
            <OptionPicker
              label="Music Layout"
              value={watch('music_layout')}
              options={[
                { value: 'grid', label: 'Grid' },
                { value: 'featured', label: 'Featured' },
                { value: 'showcase', label: 'Showcase' },
                { value: 'compact', label: 'Compact' },
              ]}
              onChange={(v) => setValue('music_layout', v as ProfileUpdate['music_layout'], { shouldDirty: true })}
            />
            <OptionPicker
              label="Section Padding"
              value={watch('theme_section_padding')}
              options={[
                { value: 'compact', label: 'Compact' },
                { value: 'default', label: 'Default' },
                { value: 'spacious', label: 'Spacious' },
              ]}
              onChange={(v) => setValue('theme_section_padding', v as ProfileUpdate['theme_section_padding'], { shouldDirty: true })}
            />
            <OptionPicker
              label="Content Width"
              value={watch('theme_content_width')}
              options={[
                { value: 'narrow', label: 'Narrow' },
                { value: 'default', label: 'Default' },
                { value: 'wide', label: 'Wide' },
              ]}
              onChange={(v) => setValue('theme_content_width', v as ProfileUpdate['theme_content_width'], { shouldDirty: true })}
            />
            <OptionPicker
              label="Card Radius"
              value={watch('theme_card_radius')}
              options={[
                { value: 'none', label: 'None' },
                { value: 'sm', label: 'Small' },
                { value: 'md', label: 'Medium' },
                { value: 'lg', label: 'Large' },
                { value: 'full', label: 'Full' },
              ]}
              onChange={(v) => setValue('theme_card_radius', v as ProfileUpdate['theme_card_radius'], { shouldDirty: true })}
            />
            <OptionPicker
              label="Element Gap"
              value={watch('theme_element_gap')}
              options={[
                { value: 'tight', label: 'Tight' },
                { value: 'default', label: 'Default' },
                { value: 'relaxed', label: 'Relaxed' },
              ]}
              onChange={(v) => setValue('theme_element_gap', v as ProfileUpdate['theme_element_gap'], { shouldDirty: true })}
            />
          </div>
        </ProGate>
      ),
    },
    {
      id: 'buttons',
      title: 'Buttons & Links',
      badge: proBadge,
      children: (
        <ProGate isPro={isPro} feature="Button & Link Styles">
          <div className="space-y-5">
            {/* Button Style — visual preview */}
            <div>
              <label className={FORM_LABEL}>Button Style</label>
              <div className="flex flex-wrap gap-3">
                {([
                  { value: 'rounded', label: 'Rounded', radius: '0.375rem' },
                  { value: 'square', label: 'Square', radius: '0' },
                  { value: 'pill', label: 'Pill', radius: '9999px' },
                ] as const).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setValue('theme_button_style', opt.value, { shouldDirty: true })}
                    className={`flex flex-col items-center gap-2 p-3 border transition-colors ${
                      watch('theme_button_style') === opt.value
                        ? 'border-accent bg-accent/10'
                        : 'border-border hover:border-text-primary'
                    }`}
                  >
                    <span
                      className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider bg-text-primary text-white"
                      style={{ borderRadius: opt.radius }}
                    >
                      Button
                    </span>
                    <span className="text-[10px] text-text-secondary">{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <OptionPicker
              label="Link Style"
              value={watch('theme_link_style')}
              options={[
                { value: 'underline', label: 'Underline' },
                { value: 'none', label: 'None' },
                { value: 'hover-underline', label: 'Hover Underline' },
              ]}
              onChange={(v) => setValue('theme_link_style', v as ProfileUpdate['theme_link_style'], { shouldDirty: true })}
            />
          </div>
        </ProGate>
      ),
    },
    {
      id: 'effects',
      title: 'Effects',
      badge: proBadge,
      children: (
        <ProGate isPro={isPro} feature="Visual Effects">
          <div className="space-y-5">
            <OptionPicker
              label="Card Border"
              value={watch('theme_card_border')}
              options={[
                { value: 'none', label: 'None' },
                { value: 'subtle', label: 'Subtle' },
                { value: 'solid', label: 'Solid' },
              ]}
              onChange={(v) => setValue('theme_card_border', v as ProfileUpdate['theme_card_border'], { shouldDirty: true })}
            />
            <OptionPicker
              label="Shadow"
              value={watch('theme_shadow')}
              options={[
                { value: 'none', label: 'None' },
                { value: 'sm', label: 'Small' },
                { value: 'md', label: 'Medium' },
                { value: 'lg', label: 'Large' },
              ]}
              onChange={(v) => setValue('theme_shadow', v as ProfileUpdate['theme_shadow'], { shouldDirty: true })}
            />
            <OptionPicker
              label="Divider Style"
              value={watch('theme_divider_style')}
              options={[
                { value: 'none', label: 'None' },
                { value: 'line', label: 'Line' },
                { value: 'accent', label: 'Accent' },
                { value: 'gradient', label: 'Gradient' },
              ]}
              onChange={(v) => setValue('theme_divider_style', v as ProfileUpdate['theme_divider_style'], { shouldDirty: true })}
            />
          </div>
        </ProGate>
      ),
    },
    {
      id: 'fonts',
      title: 'Custom Fonts',
      badge: proBadge,
      children: (
        <ProGate isPro={isPro} feature="Custom Font Uploads">
          <FontUploadSection
            customFonts={customFonts || []}
            onAddFont={(font) => {
              const current = customFonts || []
              setValue('theme_custom_fonts', [...current, font], { shouldDirty: true })
            }}
            onRemoveFont={(index) => {
              const current = customFonts || []
              setValue('theme_custom_fonts', current.filter((_, i) => i !== index), { shouldDirty: true })
            }}
          />
        </ProGate>
      ),
    },
    {
      id: 'animation',
      title: 'Animation',
      children: (
        <div className="flex items-center justify-between bg-surface border border-border p-4">
          <div>
            <p className="text-sm font-medium">Animate sections on scroll</p>
            <p className="text-xs text-text-secondary mt-0.5">Sections fade in as visitors scroll down your EPK</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={animateSections}
            aria-label="Animate sections on scroll"
            onClick={() => setValue('animate_sections', !animateSections, { shouldDirty: true })}
            className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
              animateSections ? 'bg-accent' : 'bg-text-secondary/30'
            }`}
          >
            <span
              className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
                animateSections ? 'translate-x-[18px]' : 'translate-x-[3px]'
              }`}
            />
          </button>
        </div>
      ),
    },
    {
      id: 'branding',
      title: 'Branding',
      badge: proBadge,
      children: <BrandingSection profile={initial} />,
    },
  ]

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <form onSubmit={onSave}>
      <DashboardHeader title="Theme" saving={saving} saved={saved} error={error} isDirty={isDirty} />

      <div className="grid lg:grid-cols-[400px_1fr] gap-8">
        {/* ---- Left panel: controls ---- */}
        <div className="lg:max-h-[calc(100vh-10rem)] lg:overflow-y-auto lg:pr-2">
          {/* Template Dropdown */}
          <TemplateDropdown
            selectedTemplate={selectedTemplate}
            onSelect={applyTemplate}
          />

          {/* Accordion sections */}
          <Accordion defaultOpen="colors" sections={accordionSections} />
        </div>

        {/* ---- Right panel: iframe preview ---- */}
        <div className="hidden lg:block">
          <label className={FORM_LABEL}>Live Preview</label>
          {initial?.slug ? (
            <div className="border border-border overflow-hidden bg-white h-[calc(100vh-12rem)] sticky top-4">
              {previewSrc && (
                <iframe
                  ref={iframeRef}
                  src={previewSrc}
                  className="w-full h-full"
                  title="EPK Preview"
                />
              )}
            </div>
          ) : (
            <div className="border border-border p-8 text-center text-text-secondary text-sm">
              Set a URL slug on the Profile page to enable live preview.
            </div>
          )}
        </div>
      </div>
    </form>
  )
}
