import { uploadFile } from '~/server/upload'

const MAX_IMAGE_SIZE = 10 * 1024 * 1024 // 10MB
const MAX_VIDEO_SIZE = 50 * 1024 * 1024 // 50MB

function formatMB(bytes: number): string {
  return `${Math.round(bytes / 1024 / 1024)}MB`
}

export type UploadResult =
  | { ok: true; url: string; fileId: string }
  | { ok: false; error: string }

export async function uploadFileFromInput(file: File, folder: string): Promise<UploadResult> {
  const isVideo = file.type.startsWith('video/')
  const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE
  if (file.size > maxSize) {
    return { ok: false, error: `File is ${formatMB(file.size)} — must be under ${formatMB(maxSize)}.` }
  }

  const base64 = await fileToBase64(file)
  const result = await uploadFile({
    data: {
      base64,
      fileName: file.name,
      contentType: file.type,
      folder,
    },
  })
  if ('error' in result && result.error) {
    return { ok: false, error: result.error }
  }
  if (!('url' in result) || !result.url) {
    return { ok: false, error: 'Upload failed. Please try again.' }
  }
  return { ok: true, url: result.url, fileId: result.fileId as string }
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      resolve(dataUrl.split(',')[1])
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
