import { createFileRoute } from '@tanstack/react-router'
import { useState, useCallback } from 'react'
import { getProfile, updateProfile } from '~/server/profile'

export const Route = createFileRoute('/_dashboard/dashboard')({
  loader: () => getProfile(),
  component: ProfileEditor,
})

function ProfileEditor() {
  const initialProfile = Route.useLoaderData()
  const [profile, setProfile] = useState(initialProfile)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const save = useCallback(async (updates: Record<string, unknown>) => {
    setSaving(true)
    setSaved(false)
    await updateProfile({ data: updates as any })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }, [])

  // Debounced auto-save
  const [timer, setTimer] = useState<ReturnType<typeof setTimeout> | null>(null)
  const autoSave = useCallback((field: string, value: unknown) => {
    if (timer) clearTimeout(timer)
    const t = setTimeout(() => save({ [field]: value }), 800)
    setTimer(t)
  }, [timer, save])

  const handleChange = (field: string, value: string | string[] | boolean) => {
    setProfile((p: any) => ({ ...p, [field]: value }))
    autoSave(field, value)
  }

  if (!profile) return <p className="text-text-secondary">Loading...</p>

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-black uppercase tracking-wider">Profile</h1>
        <span className="text-xs text-text-secondary">
          {saving ? 'Saving...' : saved ? 'Saved' : ''}
        </span>
      </div>

      <div className="space-y-6 max-w-2xl">
        <div>
          <label className="block text-sm uppercase tracking-widest font-bold mb-2">Display Name</label>
          <input
            type="text"
            value={profile.display_name}
            onChange={(e) => handleChange('display_name', e.target.value)}
            className="w-full bg-dark-card border border-white/10 rounded-lg px-4 py-3 text-white focus:border-accent focus:outline-none transition-colors"
          />
        </div>

        <div>
          <label className="block text-sm uppercase tracking-widest font-bold mb-2">URL Slug</label>
          <div className="flex items-center gap-2">
            <span className="text-text-secondary text-sm">yourdomain.com/</span>
            <input
              type="text"
              value={profile.slug}
              onChange={(e) => handleChange('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
              className="flex-1 bg-dark-card border border-white/10 rounded-lg px-4 py-3 text-white focus:border-accent focus:outline-none transition-colors"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm uppercase tracking-widest font-bold mb-2">Tagline</label>
          <input
            type="text"
            value={profile.tagline}
            onChange={(e) => handleChange('tagline', e.target.value)}
            className="w-full bg-dark-card border border-white/10 rounded-lg px-4 py-3 text-white focus:border-accent focus:outline-none transition-colors"
            placeholder="e.g. Presskit / EPK"
          />
        </div>

        <div>
          <label className="block text-sm uppercase tracking-widest font-bold mb-2">Genres</label>
          <input
            type="text"
            value={(profile.genres || []).join(', ')}
            onChange={(e) => handleChange('genres', e.target.value.split(',').map((g: string) => g.trim()).filter(Boolean))}
            className="w-full bg-dark-card border border-white/10 rounded-lg px-4 py-3 text-white focus:border-accent focus:outline-none transition-colors"
            placeholder="House, Tech House, Melodic House"
          />
          <p className="text-xs text-text-secondary mt-1">Comma-separated</p>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-sm uppercase tracking-widest font-bold">Published</label>
          <button
            onClick={() => handleChange('published', !profile.published)}
            className={`w-12 h-6 rounded-full transition-colors relative ${profile.published ? 'bg-accent' : 'bg-white/10'}`}
          >
            <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${profile.published ? 'translate-x-6' : 'translate-x-0.5'}`} />
          </button>
          <span className="text-xs text-text-secondary">{profile.published ? 'Live' : 'Hidden'}</span>
        </div>
      </div>
    </div>
  )
}
