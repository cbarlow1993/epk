import { createServerFn } from '@tanstack/react-start'
import { withAuth } from './utils'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_CONTENT_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
  'audio/mpeg',
  'audio/wav',
])
const ALLOWED_FOLDERS = new Set(['images', 'press', 'audio'])

export const uploadFile = createServerFn({ method: 'POST' })
  .inputValidator((data: { base64: string; fileName: string; contentType: string; folder: string }) => data)
  .handler(async ({ data }) => {
    const { supabase, user } = await withAuth()

    // Validate content type
    if (!ALLOWED_CONTENT_TYPES.has(data.contentType)) {
      return { error: 'File type not allowed' }
    }

    // Validate folder to prevent path traversal
    if (!ALLOWED_FOLDERS.has(data.folder)) {
      return { error: 'Invalid upload folder' }
    }

    const buffer = Buffer.from(data.base64, 'base64')

    // Validate file size
    if (buffer.byteLength > MAX_FILE_SIZE) {
      return { error: 'File exceeds 10MB limit' }
    }

    // Sanitize filename — strip path separators and use timestamp prefix
    const safeName = data.fileName.replace(/[^a-zA-Z0-9._-]/g, '_')
    const path = `${user.id}/${data.folder}/${Date.now()}-${safeName}`

    const { error } = await supabase.storage
      .from('uploads')
      .upload(path, buffer, { contentType: data.contentType, upsert: false })

    if (error) return { error: error.message }

    const { data: urlData } = supabase.storage.from('uploads').getPublicUrl(path)
    return { url: urlData.publicUrl }
  })
