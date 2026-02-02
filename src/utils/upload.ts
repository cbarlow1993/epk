import { uploadFile } from '~/server/upload'

export async function uploadFileFromInput(file: File, folder: string): Promise<string | null> {
  const base64 = await fileToBase64(file)
  const result = await uploadFile({
    data: {
      base64,
      fileName: file.name,
      contentType: file.type,
      folder,
    },
  })
  if ('error' in result) {
    console.error('Upload failed:', result.error)
    return null
  }
  return result.url
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
