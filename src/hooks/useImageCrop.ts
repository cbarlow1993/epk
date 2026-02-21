import { useState, useCallback, useEffect, useRef } from 'react'
import { createElement } from 'react'
import { ImageCropModal } from '~/components/ImageCropModal'

interface UseImageCropOptions {
  aspect?: number
  onCropped: (file: File) => void
}

export function useImageCrop({ aspect, onCropped }: UseImageCropOptions) {
  const [file, setFile] = useState<File | null>(null)
  const [objectUrl, setObjectUrl] = useState('')
  const onCroppedRef = useRef(onCropped)
  onCroppedRef.current = onCropped

  // Clean up object URL when file changes
  useEffect(() => {
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [objectUrl])

  const openCrop = useCallback((f: File) => {
    setFile(f)
    setObjectUrl(URL.createObjectURL(f))
  }, [])

  const close = useCallback(() => {
    setFile(null)
    setObjectUrl('')
  }, [])

  const handleApply = useCallback((cropped: File) => {
    onCroppedRef.current(cropped)
    close()
  }, [close])

  const handleSkip = useCallback(() => {
    if (file) onCroppedRef.current(file)
    close()
  }, [file, close])

  const cropModal = file
    ? createElement(ImageCropModal, {
        open: true,
        src: objectUrl,
        aspect,
        onApply: handleApply,
        onSkip: handleSkip,
        onCancel: close,
      })
    : null

  return { openCrop, cropModal }
}
