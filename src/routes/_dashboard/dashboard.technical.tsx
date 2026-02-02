import { createFileRoute } from '@tanstack/react-router'
import { useState, useCallback } from 'react'
import { getTechnicalRider, updateTechnicalRider } from '~/server/technical-rider'

export const Route = createFileRoute('/_dashboard/dashboard/technical')({
  loader: () => getTechnicalRider(),
  component: TechnicalRiderEditor,
})

function TechnicalRiderEditor() {
  const initialData = Route.useLoaderData()
  const [preferredSetup, setPreferredSetup] = useState(initialData?.preferred_setup || '')
  const [alternativeSetup, setAlternativeSetup] = useState(initialData?.alternative_setup || '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const [timer, setTimer] = useState<ReturnType<typeof setTimeout> | null>(null)
  const autoSave = useCallback((field: string, value: string) => {
    if (timer) clearTimeout(timer)
    const t = setTimeout(async () => {
      setSaving(true)
      setSaved(false)
      await updateTechnicalRider({ data: { [field]: value } })
      setSaving(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }, 800)
    setTimer(t)
  }, [timer])

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-black uppercase tracking-wider">Technical Rider</h1>
        <span className="text-xs text-text-secondary">
          {saving ? 'Saving...' : saved ? 'Saved' : ''}
        </span>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm uppercase tracking-widest font-bold mb-2">Preferred Setup</label>
          <textarea
            value={preferredSetup}
            onChange={(e) => { setPreferredSetup(e.target.value); autoSave('preferred_setup', e.target.value) }}
            rows={8}
            className="w-full bg-dark-card border border-white/10 rounded-lg px-4 py-3 text-white placeholder-text-secondary/50 focus:border-accent focus:outline-none transition-colors resize-none text-sm leading-relaxed"
            placeholder="e.g. 2 x CDJ-3000, 1 x DJM-900NXS2..."
          />
        </div>
        <div>
          <label className="block text-sm uppercase tracking-widest font-bold mb-2">Alternative Setup</label>
          <textarea
            value={alternativeSetup}
            onChange={(e) => { setAlternativeSetup(e.target.value); autoSave('alternative_setup', e.target.value) }}
            rows={8}
            className="w-full bg-dark-card border border-white/10 rounded-lg px-4 py-3 text-white placeholder-text-secondary/50 focus:border-accent focus:outline-none transition-colors resize-none text-sm leading-relaxed"
            placeholder="e.g. 2 x CDJ-2000NXS2..."
          />
        </div>
      </div>
    </div>
  )
}
