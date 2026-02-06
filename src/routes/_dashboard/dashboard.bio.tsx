import { useRef, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { getProfile, updateProfile } from '~/server/profile'
import { BlockEditor, type BlockEditorHandle, FORM_LABEL, FORM_INPUT, FORM_ERROR_MSG, FORM_FILE_INPUT } from '~/components/forms'
import { BlockRenderer } from '~/components/BlockRenderer'
import { useDashboardSave } from '~/hooks/useDashboardSave'
import { DashboardHeader } from '~/components/DashboardHeader'
import { uploadFileFromInput } from '~/utils/upload'
import type { OutputData } from '@editorjs/editorjs'

const bioFormSchema = z.object({
  short_bio: z.string().max(200, 'Max 200 characters').optional(),
  profile_image_url: z.string().url('Invalid URL').optional().or(z.literal('')),
  bio_layout: z.enum(['two-column', 'single-column']).optional(),
})

type BioFormValues = z.infer<typeof bioFormSchema>

export const Route = createFileRoute('/_dashboard/dashboard/bio')({
  loader: () => getProfile(),
  component: BioEditor,
})

function BioEditor() {
  const initialProfile = Route.useLoaderData()
  const { saving, saved, error, onSave } = useDashboardSave(updateProfile)
  const editorRef = useRef<BlockEditorHandle>(null)
  const [wordCount, setWordCount] = useState(0)
  const [previewing, setPreviewing] = useState(false)
  const [previewData, setPreviewData] = useState<OutputData | null>(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)

  const { register, handleSubmit, watch, formState: { errors, isDirty }, setValue } = useForm<BioFormValues>({
    resolver: zodResolver(bioFormSchema) as never,
    defaultValues: {
      short_bio: initialProfile?.short_bio || '',
      profile_image_url: initialProfile?.profile_image_url || '',
      bio_layout: (initialProfile?.bio_layout as BioFormValues['bio_layout']) || 'two-column',
    },
  })

  const shortBio = watch('short_bio') || ''
  const profileImageUrl = watch('profile_image_url')
  const bioLayout = watch('bio_layout') || 'two-column'

  const handleSave = handleSubmit(async (formData) => {
    if (!editorRef.current) return
    const bio = await editorRef.current.save()
    await onSave({ short_bio: formData.short_bio, profile_image_url: formData.profile_image_url, bio_layout: formData.bio_layout, bio } as Record<string, unknown>)
  })

  const handleProfileImage = async (file: File) => {
    setUploadingPhoto(true)
    const result = await uploadFileFromInput(file, 'profile')
    setUploadingPhoto(false)
    if (result) setValue('profile_image_url', result.url, { shouldDirty: true })
  }

  const handlePreviewToggle = async () => {
    if (!previewing && editorRef.current) {
      const data = await editorRef.current.save()
      setPreviewData(data)
    }
    setPreviewing(!previewing)
  }

  return (
    <form onSubmit={handleSave}>
      <DashboardHeader title="Bio" saving={saving} saved={saved} error={error} isDirty={isDirty || true} />

      <div className="space-y-6 max-w-2xl">
        {/* Profile Photo */}
        <div>
          <label className={FORM_LABEL}>Profile Photo</label>
          <div className="flex items-center gap-4">
            {profileImageUrl ? (
              <img src={profileImageUrl} alt="Profile" className="w-20 h-20 rounded-full object-cover border border-border" />
            ) : (
              <div className="w-20 h-20 rounded-full bg-surface border border-border flex items-center justify-center text-text-secondary text-xs">
                No photo
              </div>
            )}
            <div>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleProfileImage(file)
                }}
                className={FORM_FILE_INPUT}
              />
              {uploadingPhoto && <p className="text-xs text-accent mt-1">Uploading...</p>}
            </div>
          </div>
        </div>

        {/* Bio Layout */}
        <div>
          <label className={FORM_LABEL}>Bio Layout</label>
          <p className="text-xs text-text-secondary mb-3">How the bio section appears on your public page</p>
          <div className="flex gap-4">
            {(['two-column', 'single-column'] as const).map((layout) => (
              <label key={layout} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value={layout}
                  checked={bioLayout === layout}
                  onChange={() => setValue('bio_layout', layout, { shouldDirty: true })}
                  className="w-4 h-4 accent-accent"
                />
                <span className="text-sm">{layout === 'two-column' ? 'Two Column (photo + text)' : 'Single Column'}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Short Bio */}
        <div>
          <label className={FORM_LABEL}>Short Bio</label>
          <textarea
            rows={3}
            placeholder="A brief introduction (max 200 characters)"
            {...register('short_bio')}
            className={`${errors.short_bio ? FORM_INPUT + ' border-red-500' : FORM_INPUT} resize-none leading-relaxed`}
            maxLength={200}
          />
          <div className="flex justify-between mt-1">
            {errors.short_bio && <p className={FORM_ERROR_MSG}>{errors.short_bio.message}</p>}
            <p className={`text-xs ml-auto ${shortBio.length > 180 ? 'text-red-500' : 'text-text-secondary'}`}>
              {shortBio.length}/200
            </p>
          </div>
        </div>

        {/* Full Bio Editor */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className={FORM_LABEL + ' mb-0'}>Full Bio</span>
            <div className="flex items-center gap-3">
              {wordCount > 0 && (
                <span className="text-xs text-text-secondary">{wordCount} word{wordCount !== 1 ? 's' : ''}</span>
              )}
              <button
                type="button"
                onClick={handlePreviewToggle}
                className="text-xs font-semibold uppercase tracking-wider text-accent hover:underline"
              >
                {previewing ? 'Edit' : 'Preview'}
              </button>
            </div>
          </div>

          {previewing ? (
            <div className="border border-text-primary/20 bg-white min-h-[200px] px-6 py-4 prose prose-sm max-w-none">
              <BlockRenderer data={previewData} />
            </div>
          ) : (
            <BlockEditor
              ref={editorRef}
              label=""
              defaultData={initialProfile?.bio || null}
              placeholder="Write your bio..."
              onWordCount={setWordCount}
            />
          )}
        </div>
      </div>
    </form>
  )
}
