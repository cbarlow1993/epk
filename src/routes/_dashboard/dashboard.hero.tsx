import { useRef, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { getProfile, updateProfile } from '~/server/profile'
import { profileUpdateSchema, type ProfileUpdate } from '~/schemas/profile'
import { FormInput, FORM_LABEL, FORM_FILE_INPUT } from '~/components/forms'
import { useDashboardSave } from '~/hooks/useDashboardSave'
import { DashboardHeader } from '~/components/DashboardHeader'
import { uploadFileFromInput } from '~/utils/upload'

const heroFormSchema = profileUpdateSchema.pick({ hero_image_url: true, hero_style: true, tagline: true })
type HeroFormValues = Pick<ProfileUpdate, 'hero_image_url' | 'hero_style' | 'tagline'>

export const Route = createFileRoute('/_dashboard/dashboard/hero')({
  loader: () => getProfile(),
  component: HeroEditor,
})

const HERO_STYLES = [
  {
    value: 'fullbleed' as const,
    label: 'Fullbleed',
    description: 'Full-screen height hero',
  },
  {
    value: 'contained' as const,
    label: 'Contained',
    description: '60vh height hero',
  },
  {
    value: 'minimal' as const,
    label: 'Minimal',
    description: 'Text only, no image',
  },
]

function HeroEditor() {
  const initialProfile = Route.useLoaderData()
  const { saving, saved, error, onSave: save } = useDashboardSave(updateProfile)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { register, handleSubmit, watch, formState: { errors, isDirty }, setValue } = useForm<HeroFormValues>({
    resolver: zodResolver(heroFormSchema.partial()) as never,
    defaultValues: {
      hero_image_url: initialProfile?.hero_image_url || '',
      hero_style: (initialProfile?.hero_style as HeroFormValues['hero_style']) || 'fullbleed',
      tagline: initialProfile?.tagline || '',
    },
  })

  const onSave = handleSubmit(save)

  const heroStyle = watch('hero_style') || 'fullbleed'
  const heroImageUrl = watch('hero_image_url')
  const tagline = watch('tagline')

  const handleUpload = async (file: File) => {
    setUploading(true)
    setUploadError('')
    const result = await uploadFileFromInput(file, 'hero')
    setUploading(false)
    if (result) {
      setValue('hero_image_url', result.url, { shouldDirty: true })
    } else {
      setUploadError('Upload failed. Please try again.')
    }
  }

  const handleRemoveImage = () => {
    setValue('hero_image_url', '', { shouldDirty: true })
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const bgColor = initialProfile?.bg_color || '#0a0a0f'

  return (
    <form onSubmit={onSave}>
      <DashboardHeader title="Hero" saving={saving} saved={saved} error={error} isDirty={isDirty} />

      <div className="space-y-8 max-w-2xl">
        {/* Hero Style Cards */}
        <div>
          <label className={FORM_LABEL}>Hero Style</label>
          <div className="grid grid-cols-3 gap-3">
            {HERO_STYLES.map((style) => (
              <button
                key={style.value}
                type="button"
                onClick={() => setValue('hero_style', style.value, { shouldDirty: true })}
                className={`border p-4 text-left transition-all ${
                  heroStyle === style.value
                    ? 'border-accent bg-accent/5 ring-1 ring-accent'
                    : 'border-border hover:border-text-secondary'
                }`}
              >
                {/* Wireframe */}
                <div className="mb-3">
                  {style.value === 'fullbleed' && (
                    <div className="space-y-1.5">
                      <div className="h-12 rounded bg-text-secondary/20 w-full" />
                      <div className="flex justify-center gap-1 pt-1">
                        <div className="h-1.5 rounded-full bg-text-secondary/20 w-3/5" />
                      </div>
                      <div className="flex justify-center">
                        <div className="h-1 rounded-full bg-text-secondary/15 w-2/5" />
                      </div>
                    </div>
                  )}
                  {style.value === 'contained' && (
                    <div className="space-y-1.5">
                      <div className="h-8 rounded bg-text-secondary/20 w-full" />
                      <div className="flex justify-center gap-1 pt-1">
                        <div className="h-1.5 rounded-full bg-text-secondary/20 w-3/5" />
                      </div>
                      <div className="flex justify-center">
                        <div className="h-1 rounded-full bg-text-secondary/15 w-2/5" />
                      </div>
                    </div>
                  )}
                  {style.value === 'minimal' && (
                    <div className="space-y-1.5 pt-4">
                      <div className="flex justify-center">
                        <div className="h-2 rounded-full bg-text-secondary/20 w-4/5" />
                      </div>
                      <div className="flex justify-center">
                        <div className="h-1 rounded-full bg-text-secondary/15 w-3/5" />
                      </div>
                      <div className="pt-2" />
                    </div>
                  )}
                </div>
                <p className="text-sm font-medium">{style.label}</p>
                <p className="text-xs text-text-secondary mt-0.5">{style.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Tagline */}
        <FormInput
          label="Tagline"
          registration={register('tagline')}
          error={errors.tagline}
          placeholder="e.g. Presskit / EPK"
        />

        {/* Image Upload + Remove */}
        {heroStyle !== 'minimal' && (
          <div>
            <label className={FORM_LABEL}>Hero Image</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleUpload(file)
              }}
              className={FORM_FILE_INPUT}
            />
            <p className="text-xs text-text-secondary mt-2">
              Recommended: 1920x1080px or larger, landscape. JPG or PNG.
            </p>
            {uploading && <p className="text-xs text-accent mt-1">Uploading...</p>}
            {uploadError && <p className="text-xs text-red-500 mt-1">{uploadError}</p>}
            {heroImageUrl && (
              <button
                type="button"
                onClick={handleRemoveImage}
                className="text-xs text-red-500 hover:text-red-600 mt-2 font-medium uppercase tracking-wider"
              >
                Remove Image
              </button>
            )}
          </div>
        )}

        {/* Image Preview */}
        <div>
          <label className={FORM_LABEL}>Preview</label>
          {heroStyle === 'minimal' ? (
            <p className="text-sm text-text-secondary italic">
              Minimal style does not display a hero image.
            </p>
          ) : heroImageUrl ? (
            <div className="relative aspect-video overflow-hidden border border-border">
              <img
                src={heroImageUrl}
                alt="Hero preview"
                className="absolute inset-0 w-full h-full object-cover"
              />
              {/* Gradient overlay matching public page */}
              <div
                className="absolute inset-0"
                style={{
                  background: `linear-gradient(to top, ${bgColor}e6, transparent, ${bgColor}99)`,
                }}
              />
              {/* Sample overlay text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white text-center px-6">
                <p className="text-xl font-bold font-display tracking-wide">
                  {initialProfile?.display_name || 'Artist Name'}
                </p>
                {tagline && (
                  <p className="text-sm mt-1 opacity-80 uppercase tracking-widest">
                    {tagline}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="aspect-video border border-dashed border-border flex items-center justify-center text-sm text-text-secondary">
              No hero image uploaded
            </div>
          )}
        </div>
      </div>
    </form>
  )
}
