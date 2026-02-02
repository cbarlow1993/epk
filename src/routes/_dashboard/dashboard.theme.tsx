import { createFileRoute } from '@tanstack/react-router'
import { useState, useCallback } from 'react'
import { getProfile, updateProfile } from '~/server/profile'

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
  const [accentColor, setAccentColor] = useState(initial?.accent_color || '#3b82f6')
  const [bgColor, setBgColor] = useState(initial?.bg_color || '#0a0a0f')
  const [fontFamily, setFontFamily] = useState(initial?.font_family || 'Inter')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const [timer, setTimer] = useState<ReturnType<typeof setTimeout> | null>(null)
  const autoSave = useCallback((field: string, value: string) => {
    if (timer) clearTimeout(timer)
    const t = setTimeout(async () => {
      setSaving(true)
      setSaved(false)
      await updateProfile({ data: { [field]: value } as any })
      setSaving(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }, 500)
    setTimer(t)
  }, [timer])

  const previewUrl = initial?.slug ? `/${initial.slug}` : null

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-black uppercase tracking-wider">Theme</h1>
        <span className="text-xs text-text-secondary">
          {saving ? 'Saving...' : saved ? 'Saved' : ''}
        </span>
      </div>

      <div className="grid lg:grid-cols-[320px_1fr] gap-8">
        {/* Controls */}
        <div className="space-y-6">
          <div>
            <label className="block text-sm uppercase tracking-widest font-bold mb-2">Accent Colour</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={accentColor}
                onChange={(e) => { setAccentColor(e.target.value); autoSave('accent_color', e.target.value) }}
                className="w-12 h-10 rounded border border-white/10 bg-transparent cursor-pointer"
              />
              <input
                type="text"
                value={accentColor}
                onChange={(e) => { setAccentColor(e.target.value); autoSave('accent_color', e.target.value) }}
                className="flex-1 bg-dark-card border border-white/10 rounded-lg px-3 py-2 text-white text-sm font-mono focus:border-accent focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm uppercase tracking-widest font-bold mb-2">Background Colour</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={bgColor}
                onChange={(e) => { setBgColor(e.target.value); autoSave('bg_color', e.target.value) }}
                className="w-12 h-10 rounded border border-white/10 bg-transparent cursor-pointer"
              />
              <input
                type="text"
                value={bgColor}
                onChange={(e) => { setBgColor(e.target.value); autoSave('bg_color', e.target.value) }}
                className="flex-1 bg-dark-card border border-white/10 rounded-lg px-3 py-2 text-white text-sm font-mono focus:border-accent focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm uppercase tracking-widest font-bold mb-2">Font</label>
            <select
              value={fontFamily}
              onChange={(e) => { setFontFamily(e.target.value); autoSave('font_family', e.target.value) }}
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
    </div>
  )
}
