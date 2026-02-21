import { useEffect, useRef, useState, useCallback } from 'react'
import ReactCrop, { centerCrop, makeAspectCrop, convertToPixelCrop, type Crop, type PixelCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
import { cropImageToFile } from '~/utils/crop'
import { BTN_PRIMARY, BTN_BASE } from '~/components/forms/styles'

interface ImageCropModalProps {
  open: boolean
  src: string
  aspect?: number
  onApply: (file: File) => void
  onSkip: () => void
  onCancel: () => void
}

export function ImageCropModal({ open, src, aspect, onApply, onSkip, onCancel }: ImageCropModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  const [crop, setCrop] = useState<Crop>()
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>()

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) {
      dialog.showModal()
    } else if (!open && dialog.open) {
      dialog.close()
    }
  }, [open])

  const onImageLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const { width, height } = e.currentTarget
      const initial = aspect
        ? centerCrop(
            makeAspectCrop({ unit: '%', width: 90 }, aspect, width, height),
            width,
            height,
          )
        : centerCrop({ unit: '%', width: 90, height: 90, x: 5, y: 5 }, width, height)
      setCrop(initial)
      setCompletedCrop(convertToPixelCrop(initial, width, height))
    },
    [aspect],
  )

  const handleApply = async () => {
    if (!imgRef.current || !completedCrop) return
    const file = await cropImageToFile(imgRef.current, completedCrop, 'cropped.jpg')
    onApply(file)
  }

  return (
    <dialog
      ref={dialogRef}
      onClose={onCancel}
      onClick={(e) => {
        if (e.target === dialogRef.current) onCancel()
      }}
      className="backdrop:bg-black/50 bg-transparent p-0 m-auto max-w-2xl w-full"
    >
      <div className="bg-surface border border-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-text-primary">Crop Image</h2>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close"
            className="text-text-secondary hover:text-text-primary transition-colors text-lg leading-none"
          >
            &#10005;
          </button>
        </div>

        <div className="flex justify-center mb-4">
          <ReactCrop
            crop={crop}
            onChange={(c) => setCrop(c)}
            onComplete={(c) => setCompletedCrop(c)}
            aspect={aspect}
          >
            <img
              ref={imgRef}
              src={src}
              alt="Crop preview"
              onLoad={onImageLoad}
              className="max-h-[60vh]"
            />
          </ReactCrop>
        </div>

        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onSkip}
            className="text-sm text-text-secondary hover:text-text-primary transition-colors"
          >
            Skip &mdash; use original
          </button>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              className={`${BTN_BASE} bg-bg text-text-primary hover:bg-border`}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              disabled={!completedCrop}
              className={BTN_PRIMARY}
            >
              Apply Crop
            </button>
          </div>
        </div>
      </div>
    </dialog>
  )
}
