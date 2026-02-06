import { useRef, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { getProfile, updateProfile } from '~/server/profile'
import { BlockEditor, type BlockEditorHandle, FORM_LABEL, FORM_FILE_INPUT } from '~/components/forms'
import { BlockRenderer } from '~/components/BlockRenderer'
import { useDashboardSave } from '~/hooks/useDashboardSave'
import { DashboardHeader } from '~/components/DashboardHeader'
import { uploadFileFromInput } from '~/utils/upload'
import type { OutputData } from '@editorjs/editorjs'

const bioFormSchema = z.object({
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
  const [uploadError, setUploadError] = useState('')

  const { register, handleSubmit, watch, formState: { errors, isDirty }, setValue } = useForm<BioFormValues>({
    resolver: zodResolver(bioFormSchema) as never,
    defaultValues: {
      profile_image_url: initialProfile?.profile_image_url || '',
      bio_layout: (initialProfile?.bio_layout as BioFormValues['bio_layout']) || 'two-column',
    },
  })

  const profileImageUrl = watch('profile_image_url')
  const bioLayout = watch('bio_layout') || 'two-column'

  const handleSave = handleSubmit(async (formData) => {
    if (!editorRef.current) return
    const bio = await editorRef.current.save()
    await onSave({ profile_image_url: formData.profile_image_url, bio_layout: formData.bio_layout, bio } as Record<string, unknown>)
  })

  const handleProfileImage = async (file: File) => {
    setUploadingPhoto(true)
    setUploadError('')
    const result = await uploadFileFromInput(file, 'profile')
    setUploadingPhoto(false)
    if (result) {
      setValue('profile_image_url', result.url, { shouldDirty: true })
    } else {
      setUploadError('Upload failed. Please try again.')
    }
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
              {uploadError && <p className="text-xs text-red-500 mt-1">{uploadError}</p>}
            </div>
          </div>
        </div>

        {/* Bio Layout */}
        <div>
          <label className={FORM_LABEL}>Bio Layout</label>
          <div className="grid grid-cols-2 gap-3">
            {/* Two Column Card */}
            <button
              type="button"
              onClick={() => setValue('bio_layout', 'two-column', { shouldDirty: true })}
              className={`border p-4 text-left transition-all ${
                bioLayout === 'two-column'
                  ? 'border-accent bg-accent/5 ring-1 ring-accent'
                  : 'border-border hover:border-text-secondary'
              }`}
            >
              {/* Wireframe */}
              <div className="flex gap-2 mb-3">
                <div className="w-10 h-10 rounded bg-text-secondary/20 shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-1.5 rounded-full bg-text-secondary/20 w-full" />
                  <div className="h-1.5 rounded-full bg-text-secondary/20 w-4/5" />
                  <div className="h-1.5 rounded-full bg-text-secondary/20 w-3/5" />
                </div>
              </div>
              <p className="text-sm font-medium">Two Column</p>
              <p className="text-xs text-text-secondary mt-0.5">Photo beside bio text</p>
            </button>

            {/* Single Column Card */}
            <button
              type="button"
              onClick={() => setValue('bio_layout', 'single-column', { shouldDirty: true })}
              className={`border p-4 text-left transition-all ${
                bioLayout === 'single-column'
                  ? 'border-accent bg-accent/5 ring-1 ring-accent'
                  : 'border-border hover:border-text-secondary'
              }`}
            >
              {/* Wireframe */}
              <div className="space-y-1.5 mb-3">
                <div className="h-1.5 rounded-full bg-text-secondary/20 w-full" />
                <div className="h-1.5 rounded-full bg-text-secondary/20 w-4/5" />
                <div className="h-1.5 rounded-full bg-text-secondary/20 w-full" />
                <div className="h-1.5 rounded-full bg-text-secondary/20 w-3/5" />
              </div>
              <p className="text-sm font-medium">Single Column</p>
              <p className="text-xs text-text-secondary mt-0.5">Stacked bio text only</p>
            </button>
          </div>

          {/* Nudge: two-column selected but no photo */}
          {bioLayout === 'two-column' && !profileImageUrl && (
            <p className="text-xs text-amber-600 mt-2">
              Upload a profile photo above to use the two-column layout.
            </p>
          )}
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
