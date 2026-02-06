import { useRef, useState } from 'react'
import { z } from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { getProfile, updateProfile } from '~/server/profile'
import { profileUpdateSchema, type ProfileUpdate } from '~/schemas/profile'
import { FormInput, FORM_LABEL, FORM_FILE_INPUT } from '~/components/forms'
import { useDashboardSave } from '~/hooks/useDashboardSave'
import { DashboardHeader } from '~/components/DashboardHeader'
import { uploadFileFromInput } from '~/utils/upload'

const heroFormSchema = profileUpdateSchema.pick({ hero_image_url: true, hero_video_url: true, hero_style: true, tagline: true }).partial()
type HeroFormValues = z.infer<typeof heroFormSchema>

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
  const [heroMediaType, setHeroMediaType] = useState<'image' | 'video'>(
    initialProfile?.hero_video_url ? 'video' : 'image'
  )
  const [videoError, setVideoError] = useState('')
  const videoInputRef = useRef<HTMLInputElement>(null)

  const { register, handleSubmit, watch, formState: { errors, isDirty }, setValue } = useForm<HeroFormValues>({
    resolver: zodResolver(heroFormSchema),
    defaultValues: {
      hero_image_url: initialProfile?.hero_image_url || '',
      hero_video_url: initialProfile?.hero_video_url || '',
      hero_style: (initialProfile?.hero_style as HeroFormValues['hero_style']) || 'fullbleed',
      tagline: initialProfile?.tagline || '',
    },
  })

  const onSave = handleSubmit(save)

  const heroStyle = watch('hero_style') || 'fullbleed'
  const heroImageUrl = watch('hero_image_url')
  const heroVideoUrl = watch('hero_video_url')
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

  const validateVideo = (file: File): Promise<string | null> => {
    return new Promise((resolve) => {
      if (!['video/mp4', 'video/webm'].includes(file.type)) {
        return resolve('Only MP4 and WebM files are supported.')
      }
      if (file.size > 50 * 1024 * 1024) {
        return resolve(`File is ${Math.round(file.size / 1024 / 1024)}MB — must be under 50MB.`)
      }
      const video = document.createElement('video')
      video.preload = 'metadata'
      video.onloadedmetadata = () => {
        URL.revokeObjectURL(video.src)
        if (video.duration > 30) {
          return resolve(`Video is ${Math.round(video.duration)} seconds — trim it to 30 seconds or under.`)
        }
        resolve(null)
      }
      video.onerror = () => {
        URL.revokeObjectURL(video.src)
        resolve('Could not read video file. Try a different format.')
      }
      video.src = URL.createObjectURL(file)
    })
  }

  const handleVideoUpload = async (file: File) => {
    setVideoError('')
    const validationError = await validateVideo(file)
    if (validationError) {
      setVideoError(validationError)
      return
    }
    setUploading(true)
    setUploadError('')
    const result = await uploadFileFromInput(file, 'hero')
    setUploading(false)
    if (result) {
      setValue('hero_video_url', result.url, { shouldDirty: true })
    } else {
      setVideoError('Upload failed. Please try again.')
    }
  }

  const handleRemoveVideo = () => {
    setValue('hero_video_url', '', { shouldDirty: true })
    if (videoInputRef.current) videoInputRef.current.value = ''
  }

  const handleMediaTypeChange = (type: 'image' | 'video') => {
    setHeroMediaType(type)
    if (type === 'image') {
      setValue('hero_video_url', '', { shouldDirty: true })
    } else {
      setValue('hero_image_url', '', { shouldDirty: true })
    }
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

        {/* Hero Media Type Toggle */}
        {heroStyle !== 'minimal' && (
          <div>
            <label className={FORM_LABEL}>Hero Media</label>
            <div className="grid grid-cols-2 gap-3">
              {(['image', 'video'] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleMediaTypeChange(type)}
                  className={`border p-3 text-left transition-all ${
                    heroMediaType === type
                      ? 'border-accent bg-accent/5 ring-1 ring-accent'
                      : 'border-border hover:border-text-secondary'
                  }`}
                >
                  <p className="text-sm font-medium capitalize">{type}</p>
                  <p className="text-xs text-text-secondary mt-0.5">
                    {type === 'image' ? 'Static image background' : 'Looping video background'}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Image Upload + Remove */}
        {heroStyle !== 'minimal' && heroMediaType === 'image' && (
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

        {/* Video Upload + Remove */}
        {heroStyle !== 'minimal' && heroMediaType === 'video' && (
          <div>
            <label className={FORM_LABEL}>Hero Video</label>
            <input
              ref={videoInputRef}
              type="file"
              accept="video/mp4,video/webm"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleVideoUpload(file)
              }}
              className={FORM_FILE_INPUT}
            />
            <p className="text-xs text-text-secondary mt-2">
              Best results: 10–30 seconds, 1080p landscape, under 50MB. Subtle or slow-moving footage works best (crowd panning, DJ booth shots, abstract visuals). Avoid fast cuts — they compete with the text overlay.
            </p>
            <p className="text-xs text-text-secondary mt-1 italic">
              Tip: Use your phone's built-in editor to trim before uploading.
            </p>
            {uploading && <p className="text-xs text-accent mt-1">Uploading video...</p>}
            {videoError && <p className="text-xs text-red-500 mt-1">{videoError}</p>}
            {heroVideoUrl && (
              <button
                type="button"
                onClick={handleRemoveVideo}
                className="text-xs text-red-500 hover:text-red-600 mt-2 font-medium uppercase tracking-wider"
              >
                Remove Video
              </button>
            )}
          </div>
        )}

        {/* Preview */}
        <div>
          <label className={FORM_LABEL}>Preview</label>
          {heroStyle === 'minimal' ? (
            <p className="text-sm text-text-secondary italic">
              Minimal style does not display hero media.
            </p>
          ) : heroMediaType === 'video' && heroVideoUrl ? (
            <div className="relative aspect-video overflow-hidden border border-border">
              <video
                src={heroVideoUrl}
                autoPlay
                muted
                loop
                playsInline
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div
                className="absolute inset-0"
                style={{ background: `linear-gradient(to top, ${bgColor}e6, transparent, ${bgColor}99)` }}
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white text-center px-6">
                <p className="text-xl font-bold font-display tracking-wide">
                  {initialProfile?.display_name || 'Artist Name'}
                </p>
                {tagline && (
                  <p className="text-sm mt-1 opacity-80 uppercase tracking-widest">{tagline}</p>
                )}
              </div>
            </div>
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
              No hero {heroMediaType} uploaded
            </div>
          )}
        </div>
      </div>
    </form>
  )
}
