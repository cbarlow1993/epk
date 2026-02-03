import { createFileRoute } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { getProfile, updateProfile } from '~/server/profile'
import { profileUpdateSchema, type ProfileUpdate } from '~/schemas/profile'
import { useDashboardSave } from '~/hooks/useDashboardSave'
import { DashboardHeader } from '~/components/DashboardHeader'

export const Route = createFileRoute('/_dashboard/dashboard/theme')({
  loader: () => getProfile(),
  component: ThemeEditor,
})

const FONT_OPTIONS = [
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

  const { register, handleSubmit, watch, formState: { errors, isDirty }, setValue } = useForm<Pick<ProfileUpdate, 'accent_color' | 'bg_color' | 'font_family'>>({
    resolver: zodResolver(profileUpdateSchema.pick({ accent_color: true, bg_color: true, font_family: true }).partial()),
    defaultValues: {
      accent_color: initial?.accent_color || '#3b82f6',
      bg_color: initial?.bg_color || '#0a0a0f',
      font_family: initial?.font_family || 'Inter',
    },
  })

  const onSave = handleSubmit(save)

  const accentColor = watch('accent_color') || '#3b82f6'
  const bgColor = watch('bg_color') || '#0a0a0f'
  const fontFamily = watch('font_family') || 'Inter'

  const previewUrl = initial?.slug ? `/${initial.slug}` : null

  return (
    <form onSubmit={onSave}>
      <DashboardHeader title="Theme" saving={saving} saved={saved} error={error} isDirty={isDirty} />

      <div className="grid lg:grid-cols-[320px_1fr] gap-8">
        {/* Controls */}
        <div className="space-y-6">
          <div>
            <label className="block text-sm uppercase tracking-widest font-bold mb-2">Accent Colour</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={accentColor}
                onChange={(e) => setValue('accent_color', e.target.value, { shouldDirty: true })}
                className="w-12 h-10 rounded border border-white/10 bg-transparent cursor-pointer"
              />
              <input
                type="text"
                {...register('accent_color')}
                className={`flex-1 bg-dark-card border rounded-lg px-3 py-2 text-white text-sm font-mono focus:border-accent focus:outline-none ${
                  errors.accent_color ? 'border-red-500' : 'border-white/10'
                }`}
              />
            </div>
            {errors.accent_color && <p className="text-xs text-red-400 mt-1">{errors.accent_color.message}</p>}
          </div>

          <div>
            <label className="block text-sm uppercase tracking-widest font-bold mb-2">Background Colour</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={bgColor}
                onChange={(e) => setValue('bg_color', e.target.value, { shouldDirty: true })}
                className="w-12 h-10 rounded border border-white/10 bg-transparent cursor-pointer"
              />
              <input
                type="text"
                {...register('bg_color')}
                className={`flex-1 bg-dark-card border rounded-lg px-3 py-2 text-white text-sm font-mono focus:border-accent focus:outline-none ${
                  errors.bg_color ? 'border-red-500' : 'border-white/10'
                }`}
              />
            </div>
            {errors.bg_color && <p className="text-xs text-red-400 mt-1">{errors.bg_color.message}</p>}
          </div>

          <div>
            <label className="block text-sm uppercase tracking-widest font-bold mb-2">Font</label>
            <select
              {...register('font_family')}
              className="w-full bg-dark-card border border-white/10 rounded-lg px-4 py-3 text-white focus:border-accent focus:outline-none"
            >
              {FONT_OPTIONS.map((font) => (
                <option key={font} value={font} style={{ fontFamily: font }}>{font}</option>
              ))}
            </select>
          </div>

          {/* Preview swatch */}
          <div className="rounded-lg border border-white/10 overflow-hidden">
            <div className="p-4" style={{ backgroundColor: bgColor }}>
              <p className="font-bold text-sm" style={{ fontFamily, color: '#fff' }}>Preview Swatch</p>
              <p className="text-xs mt-1" style={{ color: accentColor }}>Accent colour</p>
              <div className="mt-3 h-1 rounded" style={{ backgroundColor: accentColor }} />
            </div>
          </div>
        </div>

        {/* Live preview iframe */}
        <div className="hidden lg:block">
          <label className="block text-sm uppercase tracking-widest font-bold mb-2">Live Preview</label>
          {previewUrl ? (
            <div className="border border-white/10 rounded-lg overflow-hidden bg-dark-surface" style={{ height: '70vh' }}>
              <iframe
                src={`${previewUrl}?preview=true&accent=${encodeURIComponent(accentColor)}&bg=${encodeURIComponent(bgColor)}&font=${encodeURIComponent(fontFamily)}`}
                className="w-full h-full"
                title="EPK Preview"
              />
            </div>
          ) : (
            <div className="border border-white/10 rounded-lg p-8 text-center text-text-secondary text-sm">
              Set a URL slug on the Profile page to enable live preview.
            </div>
          )}
        </div>
      </div>
    </form>
  )
}
