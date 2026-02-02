import { createFileRoute } from '@tanstack/react-router'
import { useState, useCallback, useRef } from 'react'
import { getProfile, updateProfile } from '~/server/profile'
import { uploadFileFromInput } from '~/utils/upload'

export const Route = createFileRoute('/_dashboard/dashboard')({
  loader: () => getProfile(),
  component: ProfileEditor,
})

function ProfileEditor() {
  const initialProfile = Route.useLoaderData()
  const [profile, setProfile] = useState(initialProfile)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [uploadingProfile, setUploadingProfile] = useState(false)
  const [uploadingHero, setUploadingHero] = useState(false)
  const profileInputRef = useRef<HTMLInputElement>(null)
  const heroInputRef = useRef<HTMLInputElement>(null)

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

  const handleProfileImage = async (file: File) => {
    setUploadingProfile(true)
    const url = await uploadFileFromInput(file, 'profile')
    setUploadingProfile(false)
    if (url) handleChange('profile_image_url', url)
  }

  const handleHeroImage = async (file: File) => {
    setUploadingHero(true)
    const url = await uploadFileFromInput(file, 'hero')
    setUploadingHero(false)
    if (url) handleChange('hero_image_url', url)
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

        <div>
          <label className="block text-sm uppercase tracking-widest font-bold mb-2">Profile Photo</label>
          <div className="flex items-center gap-4">
            {profile.profile_image_url && (
              <img src={profile.profile_image_url} alt="Profile" className="w-24 h-24 rounded-full object-cover border border-white/10" />
            )}
            <div>
              <input
                ref={profileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleProfileImage(file)
                }}
                className="text-sm text-text-secondary file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-dark-card file:text-white file:cursor-pointer hover:file:bg-white/10"
              />
              {uploadingProfile && <p className="text-xs text-accent mt-1">Uploading...</p>}
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm uppercase tracking-widest font-bold mb-2">Hero Image</label>
          {profile.hero_image_url && (
            <img src={profile.hero_image_url} alt="Hero" className="w-full h-32 rounded-lg object-cover border border-white/10 mb-3" />
          )}
          <input
            ref={heroInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleHeroImage(file)
            }}
            className="text-sm text-text-secondary file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-dark-card file:text-white file:cursor-pointer hover:file:bg-white/10"
          />
          {uploadingHero && <p className="text-xs text-accent mt-1">Uploading...</p>}
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
