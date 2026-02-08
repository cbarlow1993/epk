import { createFileRoute } from '@tanstack/react-router'
import { useState, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { getPressAssets, upsertPressAsset, deletePressAsset, reorderPressAssets } from '~/server/press-assets'
import { getProfile, updateProfile } from '~/server/profile'
import { ASSET_TYPES } from '~/schemas/press-asset'
import { uploadFileFromInput } from '~/utils/upload'
import { FORM_INPUT, FORM_LABEL, BTN_PRIMARY, CARD_SECTION, toSelectOptions } from '~/components/forms'
import { GridItemOverlay } from '~/components/GridItemOverlay'
import { useListEditor } from '~/hooks/useListEditor'
import { DashboardHeader } from '~/components/DashboardHeader'
import { useSectionToggle } from '~/hooks/useSectionToggle'
import type { FileRow, ProfileRow } from '~/types/database'

export const Route = createFileRoute('/_dashboard/dashboard/press')({
  loader: async () => {
    const [assets, profile] = await Promise.all([getPressAssets(), getProfile()])
    return { assets, profile }
  },
  component: PressEditor,
})

const ASSET_TYPE_OPTIONS = toSelectOptions(ASSET_TYPES)

const uploadFormSchema = z.object({
  press_title: z.string().max(200).optional(),
  press_type: z.enum(ASSET_TYPES),
})

type UploadFormValues = z.infer<typeof uploadFormSchema>

function PressEditor() {
  const { assets: initialAssets, profile } = Route.useLoaderData()
  const { items: assets, handleDelete, handleReorder, addItem } = useListEditor(
    (initialAssets || []) as FileRow[],
    { deleteFn: deletePressAsset, reorderFn: reorderPressAssets }
  )
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const sectionToggle = useSectionToggle('press', (profile as ProfileRow | null)?.section_visibility as Record<string, boolean> | null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const savedPressKitUrl = useRef((profile as ProfileRow | null)?.press_kit_url || '')
  const [pressKitUrl, setPressKitUrl] = useState(savedPressKitUrl.current)
  const linkDirty = pressKitUrl !== savedPressKitUrl.current
  const isDirty = linkDirty || sectionToggle.isDirty

  const { register, getValues, reset } = useForm<UploadFormValues>({
    resolver: zodResolver(uploadFormSchema),
    defaultValues: { press_title: '', press_type: 'photo' },
  })

  const handleUpload = async () => {
    const file = fileInputRef.current?.files?.[0]
    if (!file) return
    setUploading(true)

    const uploadResult = await uploadFileFromInput(file, 'press')
    if (!uploadResult) {
      setUploading(false)
      return
    }

    const formValues = getValues()
    const title = formValues.press_title?.trim() || file.name
    const result = await upsertPressAsset({
      data: {
        id: uploadResult.fileId,
        press_title: title,
        press_type: formValues.press_type || 'photo',
        sort_order: assets.length,
      },
    })
    if ('asset' in result && result.asset) {
      addItem(result.asset as FileRow)
      reset()
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
    setUploading(false)
  }


  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    if (sectionToggle.isDirty) {
      await sectionToggle.save()
    }

    if (linkDirty) {
      const trimmed = pressKitUrl.trim()
      const result = await updateProfile({ data: { press_kit_url: trimmed || '' } })
      if (result && 'error' in result && result.error) {
        setError(result.error as string)
        setSaving(false)
        return
      }
      savedPressKitUrl.current = trimmed
      setPressKitUrl(trimmed)
    }

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div>
      <form onSubmit={handleSave}>
        <DashboardHeader title="Press Assets" saving={saving} saved={saved} error={error} isDirty={isDirty} sectionEnabled={sectionToggle.enabled} onToggleSection={sectionToggle.toggle} />

        {/* External Assets Link */}
        <div className={CARD_SECTION}>
          <h2 className="font-medium text-text-secondary mb-4">External Assets Link</h2>
          <p className="text-xs text-text-secondary mb-3">
            Share a link to your assets (e.g. Dropbox, Google Drive, WeTransfer).
            Visitors can access all your assets in one click.
          </p>
          <div>
            <label className={FORM_LABEL}>URL</label>
            <input
              type="url"
              placeholder="https://dropbox.com/sh/your-press-kit"
              value={pressKitUrl}
              onChange={(e) => setPressKitUrl(e.target.value)}
              className={FORM_INPUT}
            />
          </div>
        </div>
      </form>

      {/* Upload Form */}
      <div className={CARD_SECTION}>
        <h2 className="font-medium text-text-secondary mb-4">Upload Asset</h2>
        <div className="grid md:grid-cols-3 gap-4 mb-4">
          <input
            type="text"
            placeholder="Title (optional, defaults to filename)"
            {...register('press_title')}
            className={FORM_INPUT}
          />
          <select {...register('press_type')} className={FORM_INPUT}>
            {ASSET_TYPE_OPTIONS.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          <input
            type="file"
            accept="image/*,video/*"
            ref={fileInputRef}
            className={FORM_INPUT}
          />
        </div>
        <button
          type="button"
          onClick={handleUpload}
          disabled={uploading}
          className={BTN_PRIMARY}
        >
          {uploading ? 'Uploading...' : 'Upload'}
        </button>
      </div>

      {/* Assets Grid */}
      {assets.length === 0 ? (
        <p className="text-text-secondary text-sm">No press assets yet. Upload one above.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {assets.map((asset, index) => (
            <div
              key={asset.id}
              className="group relative aspect-square bg-white border border-border overflow-hidden"
            >
              {asset.press_type === 'video' ? (
                <div className="w-full h-full flex flex-col items-center justify-center text-text-secondary">
                  <span className="text-3xl mb-2">&#9654;</span>
                  <span className="text-xs font-medium px-2 text-center truncate w-full">
                    {asset.press_title || asset.name}
                  </span>
                </div>
              ) : (
                <img
                  src={asset.file_url}
                  alt={asset.press_title || asset.name}
                  className="w-full h-full object-cover"
                />
              )}

              <GridItemOverlay
                label={asset.press_title || asset.name}
                index={index}
                total={assets.length}
                onReorder={handleReorder ?? (() => {})}
                onDelete={() => handleDelete(asset.id)}
              >
                <span className="inline-block bg-bg rounded px-2 py-0.5 text-[10px] text-text-secondary uppercase tracking-wider">
                  {asset.press_type}
                </span>
              </GridItemOverlay>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
