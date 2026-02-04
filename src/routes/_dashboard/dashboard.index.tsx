import { createFileRoute } from '@tanstack/react-router'
import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { getProfile, updateProfile } from '~/server/profile'
import { uploadFileFromInput } from '~/utils/upload'
import { profileUpdateSchema, type ProfileUpdate } from '~/schemas/profile'
import { FormInput, FORM_LABEL, FORM_INPUT, FORM_ERROR_MSG, FORM_FILE_INPUT } from '~/components/forms'
import { PREDEFINED_GENRES } from '~/utils/genres'
import { useDashboardSave } from '~/hooks/useDashboardSave'
import { DashboardHeader } from '~/components/DashboardHeader'

export const Route = createFileRoute('/_dashboard/dashboard/')({
  loader: () => getProfile(),
  component: ProfileEditor,
})

function ProfileEditor() {
  const initialProfile = Route.useLoaderData()
  const { saving, saved, error, onSave: save } = useDashboardSave(updateProfile)
  const [uploadingProfile, setUploadingProfile] = useState(false)
  const [uploadingHero, setUploadingHero] = useState(false)
  const profileInputRef = useRef<HTMLInputElement>(null)
  const heroInputRef = useRef<HTMLInputElement>(null)

  const { register, handleSubmit, watch, formState: { errors, isDirty }, setValue, getValues } = useForm<ProfileUpdate>({
    resolver: zodResolver(profileUpdateSchema.partial()),
    defaultValues: {
      display_name: initialProfile?.display_name || '',
      slug: initialProfile?.slug || '',
      tagline: initialProfile?.tagline || '',
      genres: initialProfile?.genres || [],
      profile_image_url: initialProfile?.profile_image_url || '',
      hero_image_url: initialProfile?.hero_image_url || '',
      published: initialProfile?.published || false,
      bpm_min: initialProfile?.bpm_min ?? null,
      bpm_max: initialProfile?.bpm_max ?? null,
    },
  })

  const onSave = handleSubmit(save)

  const handleProfileImage = async (file: File) => {
    setUploadingProfile(true)
    const url = await uploadFileFromInput(file, 'profile')
    setUploadingProfile(false)
    if (url) setValue('profile_image_url', url, { shouldDirty: true })
  }

  const handleHeroImage = async (file: File) => {
    setUploadingHero(true)
    const url = await uploadFileFromInput(file, 'hero')
    setUploadingHero(false)
    if (url) setValue('hero_image_url', url, { shouldDirty: true })
  }

  const profileImageUrl = watch('profile_image_url')
  const heroImageUrl = watch('hero_image_url')
  const published = watch('published')
  const genres = watch('genres')

  return (
    <form onSubmit={onSave}>
      <DashboardHeader title="Profile" saving={saving} saved={saved} error={error} isDirty={isDirty} />

      <div className="space-y-6 max-w-2xl">
        <FormInput
          label="Display Name"
          registration={register('display_name')}
          error={errors.display_name}
          placeholder="Your artist name"
        />

        <div>
          <label className={FORM_LABEL}>URL Slug</label>
          <div className="flex items-center gap-2">
            <span className="text-text-secondary text-sm">yourdomain.com/</span>
            <input
              type="text"
              {...register('slug', {
                onChange: (e) => {
                  const cleaned = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')
                  setValue('slug', cleaned, { shouldDirty: true })
                },
              })}
              className={`flex-1 bg-dark-card border rounded-lg px-4 py-3 text-white focus:border-accent focus:outline-none transition-colors ${
                errors.slug ? 'border-red-500' : 'border-white/10'
              }`}
            />
          </div>
          {errors.slug && <p className={FORM_ERROR_MSG}>{errors.slug.message}</p>}
        </div>

        <FormInput
          label="Tagline"
          registration={register('tagline')}
          error={errors.tagline}
          placeholder="e.g. Presskit / EPK"
        />

        {/* Genres */}
        <div>
          <label className={FORM_LABEL}>Genres</label>
          <div className="flex flex-wrap gap-2 mb-2">
            {PREDEFINED_GENRES.map((genre) => {
              const current = watch('genres') || []
              const isSelected = current.includes(genre)
              return (
                <button
                  key={genre}
                  type="button"
                  onClick={() => {
                    const updated = isSelected
                      ? current.filter((g: string) => g !== genre)
                      : [...current, genre]
                    setValue('genres', updated, { shouldDirty: true })
                  }}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
                    isSelected
                      ? 'bg-accent text-black'
                      : 'bg-dark-card border border-white/10 text-text-secondary hover:border-accent/30'
                  }`}
                >
                  {genre}
                </button>
              )
            })}
          </div>
          {/* Custom genres (non-predefined) shown as removable pills */}
          {(genres || []).filter((g: string) => !(PREDEFINED_GENRES as readonly string[]).includes(g)).length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {(genres || []).filter((g: string) => !(PREDEFINED_GENRES as readonly string[]).includes(g)).map((genre: string) => (
                <button
                  key={genre}
                  type="button"
                  onClick={() => {
                    const current = watch('genres') || []
                    setValue('genres', current.filter((g: string) => g !== genre), { shouldDirty: true })
                  }}
                  className="px-3 py-1.5 rounded-full text-xs font-bold bg-accent text-black transition-colors"
                >
                  {genre} &times;
                </button>
              ))}
            </div>
          )}
          <div className="flex gap-2 mt-2">
            <input
              type="text"
              placeholder="Add custom genre..."
              className={FORM_INPUT}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  const input = e.currentTarget
                  const value = input.value.trim()
                  if (value) {
                    const current = watch('genres') || []
                    if (!current.includes(value)) {
                      setValue('genres', [...current, value], { shouldDirty: true })
                    }
                    input.value = ''
                  }
                }
              }}
            />
          </div>
          {errors.genres && <p className={FORM_ERROR_MSG}>{errors.genres.message}</p>}
        </div>

        {/* BPM Range */}
        <div>
          <label className={FORM_LABEL}>BPM Range</label>
          <div className="flex items-center gap-3">
            <input
              type="number"
              placeholder="Min"
              min={60}
              max={200}
              {...register('bpm_min', { valueAsNumber: true })}
              className={`${FORM_INPUT} w-24`}
            />
            <span className="text-text-secondary">&mdash;</span>
            <input
              type="number"
              placeholder="Max"
              min={60}
              max={200}
              {...register('bpm_max', { valueAsNumber: true })}
              className={`${FORM_INPUT} w-24`}
            />
            <span className="text-text-secondary text-sm">BPM</span>
          </div>
        </div>

        <div>
          <label className={FORM_LABEL}>Profile Photo</label>
          <div className="flex items-center gap-4">
            {profileImageUrl && (
              <img src={profileImageUrl} alt="Profile" className="w-24 h-24 rounded-full object-cover border border-white/10" />
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
                className={FORM_FILE_INPUT}
              />
              {uploadingProfile && <p className="text-xs text-accent mt-1">Uploading...</p>}
            </div>
          </div>
        </div>

        <div>
          <label className={FORM_LABEL}>Hero Image</label>
          {heroImageUrl && (
            <img src={heroImageUrl} alt="Hero" className="w-full h-32 rounded-lg object-cover border border-white/10 mb-3" />
          )}
          <input
            ref={heroInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleHeroImage(file)
            }}
            className={FORM_FILE_INPUT}
          />
          {uploadingHero && <p className="text-xs text-accent mt-1">Uploading...</p>}
        </div>

        <div className="flex items-center gap-3">
          <label className="text-sm uppercase tracking-widest font-bold">Published</label>
          <button
            type="button"
            role="switch"
            aria-checked={published}
            aria-label="Toggle published status"
            onClick={() => {
              setValue('published', !published, { shouldDirty: true })
            }}
            className={`w-12 h-6 rounded-full transition-colors relative ${published ? 'bg-accent' : 'bg-white/10'}`}
          >
            <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${published ? 'translate-x-6' : 'translate-x-0.5'}`} />
          </button>
          <span className="text-xs text-text-secondary">{published ? 'Live' : 'Hidden'}</span>
        </div>
      </div>
    </form>
  )
}
