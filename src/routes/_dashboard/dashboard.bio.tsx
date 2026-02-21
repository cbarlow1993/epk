import { useRef, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { getProfile, updateProfile } from '~/server/profile'
import { BlockEditor, type BlockEditorHandle, FORM_LABEL, FORM_FILE_INPUT } from '~/components/forms'
import { useDashboardSave } from '~/hooks/useDashboardSave'
import { DashboardHeader } from '~/components/DashboardHeader'
import { useSectionToggle } from '~/hooks/useSectionToggle'
import { uploadFileFromInput } from '~/utils/upload'

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
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const sectionToggle = useSectionToggle('bio', initialProfile?.section_visibility as Record<string, boolean> | null)

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
    await Promise.all([
      onSave({ profile_image_url: formData.profile_image_url, bio_layout: formData.bio_layout, bio } as Record<string, unknown>),
      sectionToggle.save(),
    ])
  })

  const handleProfileImage = async (file: File) => {
    setUploadingPhoto(true)
    setUploadError('')
    const result = await uploadFileFromInput(file, 'profile')
    setUploadingPhoto(false)
    if (result.ok) {
      setValue('profile_image_url', result.url, { shouldDirty: true })
    } else {
      setUploadError(result.error)
    }
  }

  return (
    <form onSubmit={handleSave}>
      {/* Editor.js is uncontrolled so isDirty can't track its changes — always allow save */}
      <DashboardHeader title="Bio" saving={saving} saved={saved} error={error} isDirty sectionEnabled={sectionToggle.enabled} onToggleSection={sectionToggle.toggle} />

      <div className="space-y-6 max-w-2xl">
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
              <p className="text-xs text-text-secondary mt-0.5">Image beside bio text</p>
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
              <p className="text-xs text-text-secondary mt-0.5">Bio text only</p>
            </button>
          </div>
        </div>

        {/* Side Image — only shown when two-column layout selected */}
        {bioLayout === 'two-column' && (
          <div>
            <label className={FORM_LABEL}>Side Image</label>
            <div className="flex items-center gap-4">
              {profileImageUrl ? (
                <div className="relative group">
                  <img src={profileImageUrl} alt="Side" className="w-20 h-20 object-cover border border-border" />
                  <button
                    type="button"
                    onClick={() => setValue('profile_image_url', '', { shouldDirty: true })}
                    className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="Remove image"
                  >
                    &times;
                  </button>
                </div>
              ) : (
                <div className="w-20 h-20 bg-surface border border-border flex items-center justify-center text-text-secondary text-xs">
                  No image
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
            <p className="text-xs text-text-secondary mt-2">Displayed beside your bio text on the public page.</p>
          </div>
        )}

        {/* Full Bio Editor */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className={FORM_LABEL + ' mb-0'}>Full Bio</span>
            {wordCount > 0 && (
              <span className="text-xs text-text-secondary">{wordCount} word{wordCount !== 1 ? 's' : ''}</span>
            )}
          </div>
          <BlockEditor
            ref={editorRef}
            label=""
            defaultData={initialProfile?.bio || null}
            placeholder="Write your bio..."
            onWordCount={setWordCount}
          />
        </div>
      </div>
    </form>
  )
}
