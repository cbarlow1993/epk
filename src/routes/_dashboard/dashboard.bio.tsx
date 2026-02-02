import { createFileRoute } from '@tanstack/react-router'
import { useState, useCallback } from 'react'
import { getProfile, updateProfile } from '~/server/profile'

export const Route = createFileRoute('/_dashboard/dashboard/bio')({
  loader: () => getProfile(),
  component: BioEditor,
})

function BioEditor() {
  const initialProfile = Route.useLoaderData()
  const [bioLeft, setBioLeft] = useState(initialProfile?.bio_left || '')
  const [bioRight, setBioRight] = useState(initialProfile?.bio_right || '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const [timer, setTimer] = useState<ReturnType<typeof setTimeout> | null>(null)
  const autoSave = useCallback((field: string, value: string) => {
    if (timer) clearTimeout(timer)
    const t = setTimeout(async () => {
      setSaving(true)
      setSaved(false)
      await updateProfile({ data: { [field]: value } })
      setSaving(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }, 800)
    setTimer(t)
  }, [timer])

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-black uppercase tracking-wider">Bio</h1>
        <span className="text-xs text-text-secondary">
          {saving ? 'Saving...' : saved ? 'Saved' : ''}
        </span>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm uppercase tracking-widest font-bold mb-2">Left Column</label>
          <textarea
            value={bioLeft}
            onChange={(e) => { setBioLeft(e.target.value); autoSave('bio_left', e.target.value) }}
            rows={15}
            className="w-full bg-dark-card border border-white/10 rounded-lg px-4 py-3 text-white placeholder-text-secondary/50 focus:border-accent focus:outline-none transition-colors resize-none text-sm leading-relaxed"
            placeholder="First half of your bio..."
          />
        </div>
        <div>
          <label className="block text-sm uppercase tracking-widest font-bold mb-2">Right Column</label>
          <textarea
            value={bioRight}
            onChange={(e) => { setBioRight(e.target.value); autoSave('bio_right', e.target.value) }}
            rows={15}
            className="w-full bg-dark-card border border-white/10 rounded-lg px-4 py-3 text-white placeholder-text-secondary/50 focus:border-accent focus:outline-none transition-colors resize-none text-sm leading-relaxed"
            placeholder="Second half of your bio..."
          />
        </div>
      </div>
    </div>
  )
}
