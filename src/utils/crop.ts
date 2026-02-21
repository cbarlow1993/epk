import type { PixelCrop } from 'react-image-crop'

export const CROP_ASPECTS = {
  square: 1,
  hero: 16 / 9,
  og: 1200 / 630,
} as const

export type CropAspectKey = keyof typeof CROP_ASPECTS

export function cropImageToFile(
  image: HTMLImageElement,
  crop: PixelCrop,
  fileName: string,
): Promise<File> {
  const canvas = document.createElement('canvas')
  const scaleX = image.naturalWidth / image.width
  const scaleY = image.naturalHeight / image.height

  canvas.width = Math.floor(crop.width * scaleX)
  canvas.height = Math.floor(crop.height * scaleY)

  const ctx = canvas.getContext('2d')!
  ctx.drawImage(
    image,
    crop.x * scaleX,
    crop.y * scaleY,
    crop.width * scaleX,
    crop.height * scaleY,
    0,
    0,
    canvas.width,
    canvas.height,
  )

  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => {
        resolve(new File([blob!], fileName.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' }))
      },
      'image/jpeg',
      0.92,
    )
  })
}
