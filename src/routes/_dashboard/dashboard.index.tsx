import { createFileRoute } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { getProfile, updateProfile } from '~/server/profile'
import { profileUpdateSchema, type ProfileUpdate } from '~/schemas/profile'
import { FormInput, FORM_LABEL, FORM_INPUT, FORM_ERROR_MSG } from '~/components/forms'
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
  const { register, handleSubmit, watch, formState: { errors, isDirty }, setValue } = useForm<ProfileUpdate>({
    resolver: zodResolver(profileUpdateSchema.partial()) as never,
    defaultValues: {
      display_name: initialProfile?.display_name || '',
      slug: initialProfile?.slug || '',
      genres: initialProfile?.genres || [],
      bpm_min: initialProfile?.bpm_min ?? null,
      bpm_max: initialProfile?.bpm_max ?? null,
    },
  })

  const onSave = handleSubmit(save)

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
              className={`flex-1 bg-white border  px-4 py-3 text-text-primary focus:border-accent focus:outline-none transition-colors ${
                errors.slug ? 'border-red-500' : 'border-border'
              }`}
            />
          </div>
          {errors.slug && <p className={FORM_ERROR_MSG}>{errors.slug.message}</p>}
        </div>

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
                      ? 'bg-accent text-white'
                      : 'bg-white border border-border text-text-secondary hover:border-accent/30'
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
                  className="px-3 py-1.5 rounded-full text-xs font-bold bg-accent text-white transition-colors"
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
              {...register('bpm_min', { setValueAs: (v: string) => v === '' || v === undefined ? null : Number(v) })}
              className={`${FORM_INPUT} w-24`}
            />
            <span className="text-text-secondary">&mdash;</span>
            <input
              type="number"
              placeholder="Max"
              min={60}
              max={200}
              {...register('bpm_max', { setValueAs: (v: string) => v === '' || v === undefined ? null : Number(v) })}
              className={`${FORM_INPUT} w-24`}
            />
            <span className="text-text-secondary text-sm">BPM</span>
          </div>
        </div>

      </div>
    </form>
  )
}
