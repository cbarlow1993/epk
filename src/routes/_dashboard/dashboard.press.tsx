import { createFileRoute } from '@tanstack/react-router'
import { useState, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { getPressAssets, upsertPressAsset, deletePressAsset } from '~/server/press-assets'
import { ASSET_TYPES, type PressAssetUpsert } from '~/schemas/press-asset'
import { uploadFileFromInput } from '~/utils/upload'
import { z } from 'zod'
import { FORM_INPUT, BTN_BASE } from '~/components/forms'
import { useListEditor } from '~/hooks/useListEditor'

export const Route = createFileRoute('/_dashboard/dashboard/press')({
  loader: () => getPressAssets(),
  component: PressEditor,
})

const ASSET_TYPE_OPTIONS = ASSET_TYPES.map((t) => ({
  value: t,
  label: t.charAt(0).toUpperCase() + t.slice(1),
}))

function PressEditor() {
  const initialAssets = Route.useLoaderData()
  const { items: assets, handleDelete, addItem } = useListEditor(
    initialAssets || [],
    { deleteFn: deletePressAsset }
  )
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const pressFormSchema = z.object({
    title: z.string().max(200).optional(),
    type: z.enum(ASSET_TYPES),
  })

  const { register, getValues, reset } = useForm<{ title?: string; type: PressAssetUpsert['type'] }>({
    resolver: zodResolver(pressFormSchema),
    defaultValues: { title: '', type: 'photo' },
  })

  const handleUpload = async () => {
    const file = fileInputRef.current?.files?.[0]
    if (!file) return
    setUploading(true)

    const fileUrl = await uploadFileFromInput(file, 'press')
    if (!fileUrl) {
      setUploading(false)
      return
    }

    const formValues = getValues()
    const assetTitle = formValues.title?.trim() || file.name
    const typeVal = formValues.type
    const result = await upsertPressAsset({
      data: { title: assetTitle, file_url: fileUrl, type: typeVal || 'photo', sort_order: assets.length },
    })
    if ('asset' in result && result.asset) {
      addItem(result.asset)
      reset()
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
    setUploading(false)
  }


  return (
    <div>
      <h1 className="text-2xl font-black uppercase tracking-wider mb-8">Press Assets</h1>

      {/* Upload Form */}
      <div className="bg-dark-card border border-white/10 rounded-xl p-6 mb-8">
        <h2 className="text-sm uppercase tracking-widest font-bold mb-4">Upload Asset</h2>
        <div className="grid md:grid-cols-3 gap-4 mb-4">
          <input
            type="text"
            placeholder="Title (optional, defaults to filename)"
            {...register('title')}
            className={FORM_INPUT}
          />
          <select {...register('type')} className={FORM_INPUT}>
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
          className={`${BTN_BASE} bg-accent text-black hover:bg-accent/80 disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {uploading ? 'Uploading...' : 'Upload'}
        </button>
      </div>

      {/* Assets Grid */}
      {assets.length === 0 ? (
        <p className="text-text-secondary text-sm">No press assets yet. Upload one above.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {assets.map((asset: any) => (
            <div
              key={asset.id}
              className="group relative aspect-square bg-dark-card border border-white/10 rounded-xl overflow-hidden"
            >
              {asset.type === 'video' ? (
                <div className="w-full h-full flex flex-col items-center justify-center text-text-secondary">
                  <span className="text-3xl mb-2">&#9654;</span>
                  <span className="text-xs uppercase tracking-wider px-2 text-center truncate w-full">
                    {asset.title}
                  </span>
                </div>
              ) : (
                <img
                  src={asset.file_url}
                  alt={asset.title}
                  className="w-full h-full object-cover"
                />
              )}

              {/* Hover Overlay */}
              <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                <p className="text-white text-xs font-bold uppercase tracking-wider text-center px-2 truncate w-full">
                  {asset.title}
                </p>
                <span className="inline-block bg-white/10 rounded px-2 py-0.5 text-[10px] text-text-secondary uppercase tracking-wider">
                  {asset.type}
                </span>
                <button
                  onClick={() => handleDelete(asset.id)}
                  className="w-8 h-8 flex items-center justify-center rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors text-xs"
                  title="Delete"
                >
                  &#10005;
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
