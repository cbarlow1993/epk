import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { withAuth } from './utils'
import { checkStorageQuota } from './storage'

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
const ALLOWED_FOLDERS = new Set(['images', 'press', 'audio', 'profile', 'hero', 'events'])

export const uploadFile = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => z.object({
    base64: z.string().min(1),
    fileName: z.string().min(1).max(200),
    contentType: z.string().min(1),
    folder: z.string().min(1),
  }).parse(data))
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

    // Check storage quota
    const quota = await checkStorageQuota(supabase, user.id)
    if (quota.used + buffer.byteLength > quota.limit) {
      return { error: 'Storage limit exceeded. Upgrade to Pro for 100GB storage.' }
    }

    // Sanitize filename — strip path separators and use timestamp prefix
    const safeName = data.fileName.replace(/[^a-zA-Z0-9._-]/g, '_')
    const path = `${user.id}/${data.folder}/${Date.now()}-${safeName}`

    const { error } = await supabase.storage
      .from('uploads')
      .upload(path, buffer, { contentType: data.contentType, upsert: false })

    if (error) return { error: error.message }

    const { data: urlData } = supabase.storage.from('uploads').getPublicUrl(path)

    const fileType = data.contentType.startsWith('image/') ? 'image'
      : data.contentType.startsWith('audio/') ? 'audio'
      : data.contentType.startsWith('video/') ? 'video'
      : data.contentType === 'application/pdf' ? 'document'
      : 'other'

    const { data: file, error: dbError } = await supabase
      .from('files')
      .insert({
        profile_id: user.id,
        name: data.fileName,
        file_url: urlData.publicUrl,
        file_type: fileType,
        file_size: buffer.byteLength,
        mime_type: data.contentType,
        source: data.folder,
      })
      .select()
      .single()

    if (dbError) return { error: dbError.message }

    return { url: urlData.publicUrl, fileId: file.id }
  })
