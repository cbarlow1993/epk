import { useState, useRef } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { getPhotos, upsertPhoto, deletePhoto, reorderPhotos } from '~/server/photos'
import { photoUpsertSchema, type PhotoUpsert } from '~/schemas/photo'
import { DashboardHeader } from '~/components/DashboardHeader'
import { FormInput, FORM_LABEL, FORM_FILE_INPUT } from '~/components/forms'
import { Modal } from '~/components/Modal'
import { ReorderButtons } from '~/components/ReorderButtons'
import { useListEditor } from '~/hooks/useListEditor'
import { useSectionToggle } from '~/hooks/useSectionToggle'
import { uploadFileFromInput } from '~/utils/upload'
import { BTN_PRIMARY } from '~/components/forms/styles'

type PhotoRow = { id: string; image_url: string; caption: string | null; sort_order: number }

export const Route = createFileRoute('/_dashboard/dashboard/photos')({
  loader: () => getPhotos(),
  component: PhotosEditor,
})

function PhotosEditor() {
  const initialPhotos = Route.useLoaderData() as PhotoRow[]
  const { items: photos, handleDelete, handleReorder, addItem, setItems: setPhotos } = useListEditor(
    initialPhotos || [],
    { deleteFn: deletePhoto, reorderFn: reorderPhotos }
  )

  const sectionToggle = useSectionToggle('photos')
  const [sectionSaving, setSectionSaving] = useState(false)
  const [sectionSaved, setSectionSaved] = useState(false)

  const [modalItem, setModalItem] = useState<'add' | PhotoRow | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { register, handleSubmit, formState: { errors }, setValue, watch, reset } = useForm<PhotoUpsert>({
    resolver: zodResolver(photoUpsertSchema),
  })

  const imageUrl = watch('image_url')

  const handleSectionSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSectionSaving(true)
    await sectionToggle.save()
    setSectionSaving(false)
    setSectionSaved(true)
    setTimeout(() => setSectionSaved(false), 3000)
  }

  const openModal = (item: 'add' | PhotoRow) => {
    if (item === 'add') {
      reset({ image_url: '', caption: '' })
    } else {
      reset({ id: item.id, image_url: item.image_url, caption: item.caption || '' })
    }
    setUploadError('')
    setModalItem(item)
  }

  const handleUpload = async (file: File) => {
    setUploading(true)
    setUploadError('')
    const result = await uploadFileFromInput(file, 'photos')
    setUploading(false)
    if (result) {
      setValue('image_url', result.url, { shouldDirty: true })
    } else {
      setUploadError('Upload failed. Please try again.')
    }
  }

  const onSubmit = handleSubmit(async (data) => {
    setSaving(true)
    const result = await upsertPhoto({ data })
    setSaving(false)
    if ('error' in result && typeof result.error === 'string') {
      setUploadError(result.error)
      return
    }
    if ('photo' in result && result.photo) {
      const photo = result.photo as PhotoRow
      if (modalItem === 'add') {
        addItem(photo)
      } else {
        setPhotos((prev) => prev.map((p) => (p.id === photo.id ? photo : p)))
      }
    }
    setModalItem(null)
  })

  return (
    <>
      <form onSubmit={handleSectionSave}>
        <DashboardHeader
          title="Photos"
          saving={sectionSaving}
          saved={sectionSaved}
          error=""
          isDirty={sectionToggle.isDirty}
          sectionEnabled={sectionToggle.enabled}
          onToggleSection={sectionToggle.toggle}
        />
      </form>

      <div className="mb-6 flex items-center justify-between">
        <p className="text-sm text-text-secondary">
          {photos.length} of 20 photos
        </p>
        <button
          type="button"
          onClick={() => openModal('add')}
          disabled={photos.length >= 20}
          className={BTN_PRIMARY}
        >
          Add Photo
        </button>
      </div>

      {photos.length === 0 ? (
        <div className="border border-dashed border-border p-12 text-center text-sm text-text-secondary">
          No photos yet. Add your first photo to create a gallery on your EPK.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {photos.map((photo, index) => (
            <div key={photo.id} className="group relative border border-border overflow-hidden">
              <img
                src={photo.image_url}
                alt={photo.caption || ''}
                className="w-full aspect-square object-cover"
              />
              {photo.caption && (
                <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1">
                  <p className="text-xs text-white truncate">{photo.caption}</p>
                </div>
              )}
              <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
{handleReorder && (
                <ReorderButtons
                  index={index}
                  total={photos.length}
                  onReorder={handleReorder}
                />
              )}
                <button
                  type="button"
                  onClick={() => openModal(photo)}
                  className="bg-white/90 text-text-primary px-2 py-1 text-xs font-medium"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(photo.id)}
                  className="bg-red-500/90 text-white px-2 py-1 text-xs font-medium"
                >
                  &#10005;
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal open={modalItem !== null} onClose={() => setModalItem(null)} title={modalItem === 'add' ? 'Add Photo' : 'Edit Photo'}>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className={FORM_LABEL}>Image</label>
            {imageUrl ? (
              <div className="mb-3">
                <img src={imageUrl} alt="Preview" className="w-full max-h-48 object-contain border border-border" />
                <button
                  type="button"
                  onClick={() => {
                    setValue('image_url', '', { shouldDirty: true })
                    if (fileInputRef.current) fileInputRef.current.value = ''
                  }}
                  className="text-xs text-red-500 hover:text-red-600 mt-1 font-medium uppercase tracking-wider"
                >
                  Remove
                </button>
              </div>
            ) : null}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleUpload(file)
              }}
              className={FORM_FILE_INPUT}
            />
            <p className="text-xs text-text-secondary mt-1">JPG, PNG, or WebP. Max 10MB.</p>
            {uploading && <p className="text-xs text-accent mt-1">Uploading...</p>}
            {uploadError && <p className="text-xs text-red-500 mt-1">{uploadError}</p>}
            {errors.image_url && <p className="text-xs text-red-500 mt-1">{errors.image_url.message}</p>}
          </div>

          <FormInput
            label="Caption"
            registration={register('caption')}
            error={errors.caption}
            placeholder="Optional caption"
          />

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving || uploading || !imageUrl} className={BTN_PRIMARY}>
              {saving ? 'Saving...' : modalItem === 'add' ? 'Add Photo' : 'Update Photo'}
            </button>
            <button type="button" onClick={() => setModalItem(null)} className="text-sm text-text-secondary hover:text-text-primary">
              Cancel
            </button>
          </div>
        </form>
      </Modal>
    </>
  )
}
