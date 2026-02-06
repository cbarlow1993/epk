import { createFileRoute } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { getProfile, updateProfile } from '~/server/profile'
import { profileUpdateSchema, type ProfileUpdate } from '~/schemas/profile'
import { FormColorInput, FORM_LABEL } from '~/components/forms'
import { useDashboardSave } from '~/hooks/useDashboardSave'
import { DashboardHeader } from '~/components/DashboardHeader'
import { TEMPLATES } from '~/utils/templates'
import { SortableSectionList } from '~/components/SortableSectionList'

export const Route = createFileRoute('/_dashboard/dashboard/theme')({
  loader: () => getProfile(),
  component: ThemeEditor,
})

const FONT_OPTIONS = [
  'Instrument Sans',
  'Bricolage Grotesque',
  'Inter',
  'Poppins',
  'Montserrat',
  'Space Grotesk',
  'DM Sans',
  'Outfit',
  'Playfair Display',
  'Bebas Neue',
]

function ThemeEditor() {
  const initial = Route.useLoaderData()
  const { saving, saved, error, onSave: save } = useDashboardSave(updateProfile)

  const { register, handleSubmit, watch, formState: { errors, isDirty }, setValue } = useForm<Pick<ProfileUpdate, 'accent_color' | 'bg_color' | 'font_family' | 'template' | 'hero_style' | 'bio_layout' | 'section_order' | 'section_visibility'>>({
    resolver: zodResolver(profileUpdateSchema.pick({ accent_color: true, bg_color: true, font_family: true, template: true, hero_style: true, bio_layout: true, section_order: true, section_visibility: true }).partial()),
    defaultValues: {
      accent_color: initial?.accent_color || '#3b82f6',
      bg_color: initial?.bg_color || '#0a0a0f',
      font_family: initial?.font_family || 'Inter',
      template: (initial?.template as ProfileUpdate['template']) || 'default',
      hero_style: (initial?.hero_style as ProfileUpdate['hero_style']) || 'fullbleed',
      bio_layout: (initial?.bio_layout as ProfileUpdate['bio_layout']) || 'two-column',
      section_order: initial?.section_order || ['bio', 'music', 'events', 'technical', 'press', 'contact'],
      section_visibility: (initial?.section_visibility as Record<string, boolean>) || {},
    },
  })

  const onSave = handleSubmit(save)

  const selectedTemplate = watch('template') || 'default'
  const accentColor = watch('accent_color') || '#3b82f6'
  const bgColor = watch('bg_color') || '#0a0a0f'
  const fontFamily = watch('font_family') || 'Inter'
  const heroStyle = watch('hero_style') || 'fullbleed'
  const bioLayout = watch('bio_layout') || 'two-column'
  const sectionOrder = watch('section_order') || ['bio', 'music', 'events', 'technical', 'press', 'contact']
  const sectionVisibility = watch('section_visibility') || {}

  const previewUrl = initial?.slug ? `/${initial.slug}` : null

  return (
    <form onSubmit={onSave}>
      <DashboardHeader title="Theme" saving={saving} saved={saved} error={error} isDirty={isDirty} />

      {/* Template Cards */}
      <div className="mb-8">
        <label className={FORM_LABEL}>Template</label>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {TEMPLATES.map((tpl) => (
            <button
              key={tpl.id}
              type="button"
              onClick={() => {
                setValue('template', tpl.id as ProfileUpdate['template'], { shouldDirty: true })
                setValue('accent_color', tpl.defaults.accent_color, { shouldDirty: true })
                setValue('bg_color', tpl.defaults.bg_color, { shouldDirty: true })
                setValue('font_family', tpl.defaults.font_family, { shouldDirty: true })
                setValue('hero_style', tpl.heroStyle, { shouldDirty: true })
                setValue('bio_layout', tpl.bioLayout, { shouldDirty: true })
                setValue('section_order', tpl.sectionOrder, { shouldDirty: true })
                setValue('section_visibility', {}, { shouldDirty: true })
              }}
              className={`relative border p-4 text-left transition-all ${
                selectedTemplate === tpl.id
                  ? 'border-accent bg-accent/10 ring-1 ring-accent'
                  : 'border-border hover:border-border bg-white'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: tpl.defaults.accent_color }} />
                <span className="font-bold text-sm">{tpl.name}</span>
              </div>
              <p className="text-xs text-text-secondary">{tpl.description}</p>
              <div className="mt-3 flex items-center gap-2">
                <div className="w-6 h-3 rounded" style={{ backgroundColor: tpl.defaults.bg_color, border: '1px solid rgba(255,255,255,0.1)' }} />
                <span className="text-[10px] text-text-secondary" style={{ fontFamily: tpl.defaults.font_family }}>{tpl.defaults.font_family}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-[320px_1fr] gap-8">
        {/* Controls */}
        <div className="space-y-6">
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

          <div>
            <label className={FORM_LABEL}>Font</label>
            <select
              {...register('font_family')}
              className="w-full bg-white border border-border  px-4 py-3 text-text-primary focus:border-accent focus:outline-none"
            >
              {FONT_OPTIONS.map((font) => (
                <option key={font} value={font} style={{ fontFamily: font }}>{font}</option>
              ))}
            </select>
          </div>

          {/* Preview swatch */}
          <div className="border border-border overflow-hidden">
            <div className="p-4" style={{ backgroundColor: bgColor }}>
              <p className="font-bold text-sm" style={{ fontFamily, color: '#fff' }}>Preview Swatch</p>
              <p className="text-xs mt-1" style={{ color: accentColor }}>Accent colour</p>
              <div className="mt-3 h-1 rounded" style={{ backgroundColor: accentColor }} />
            </div>
          </div>
        </div>

        {/* Live preview iframe */}
        <div className="hidden lg:block">
          <label className={FORM_LABEL}>Live Preview</label>
          {previewUrl ? (
            <div className="border border-border overflow-hidden bg-white h-[70vh]">
              <iframe
                src={`${previewUrl}?preview=true&accent=${encodeURIComponent(accentColor)}&bg=${encodeURIComponent(bgColor)}&font=${encodeURIComponent(fontFamily)}`}
                className="w-full h-full"
                title="EPK Preview"
              />
            </div>
          ) : (
            <div className="border border-border p-8 text-center text-text-secondary text-sm">
              Set a URL slug on the Profile page to enable live preview.
            </div>
          )}
        </div>
      </div>

      {/* Layout Section */}
      <div className="mt-8 border-t border-border pt-8">
        <h2 className="text-sm uppercase tracking-widest font-bold mb-6">Layout</h2>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Hero Style */}
          <div>
            <label className={FORM_LABEL}>Hero Style</label>
            <div className="space-y-2">
              {(['fullbleed', 'contained', 'minimal'] as const).map((style) => (
                <label key={style} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    value={style}
                    checked={heroStyle === style}
                    onChange={() => setValue('hero_style', style, { shouldDirty: true })}
                    className="w-4 h-4 accent-accent"
                  />
                  <span className="text-sm capitalize">{style}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Bio Layout */}
          <div>
            <label className={FORM_LABEL}>Bio Layout</label>
            <div className="space-y-2">
              {(['two-column', 'single-column'] as const).map((layout) => (
                <label key={layout} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    value={layout}
                    checked={bioLayout === layout}
                    onChange={() => setValue('bio_layout', layout, { shouldDirty: true })}
                    className="w-4 h-4 accent-accent"
                  />
                  <span className="text-sm">{layout === 'two-column' ? 'Two Column' : 'Single Column'}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Section Order */}
          <div className="md:col-span-2 lg:col-span-1">
            <label className={FORM_LABEL}>Section Order</label>
            <SortableSectionList
              order={sectionOrder}
              visibility={sectionVisibility}
              onOrderChange={(newOrder) => setValue('section_order', newOrder, { shouldDirty: true })}
              onVisibilityChange={(newVis) => setValue('section_visibility', newVis, { shouldDirty: true })}
            />
          </div>
        </div>
      </div>
    </form>
  )
}
