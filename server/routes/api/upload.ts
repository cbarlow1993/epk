import { createServerClient } from '@supabase/ssr'
import { defineHandler, readMultipartFormData, createError, parseCookies, setCookie } from 'h3'

const MAX_IMAGE_SIZE = 5 * 1024 * 1024 // 5MB
const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024 // 10MB

const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const ALLOWED_ATTACHMENT_TYPES = new Set(['application/pdf'])

// Magic byte signatures for file type verification
const MAGIC_BYTES: Record<string, number[][]> = {
  'image/jpeg': [[0xFF, 0xD8, 0xFF]],
  'image/png': [[0x89, 0x50, 0x4E, 0x47]],
  'image/webp': [[0x52, 0x49, 0x46, 0x46]], // RIFF header (WebP starts with RIFF....WEBP)
  'application/pdf': [[0x25, 0x50, 0x44, 0x46]], // %PDF
}

function verifyMagicBytes(buffer: Buffer, contentType: string): boolean {
  const signatures = MAGIC_BYTES[contentType]
  if (!signatures) return false
  return signatures.some((sig) =>
    sig.every((byte, i) => buffer[i] === byte)
  )
}

export default defineHandler(async (event) => {
  // Parse multipart form data
  const formData = await readMultipartFormData(event)
  if (!formData) {
    return { success: 0, message: 'No form data provided' }
  }

  const fileField = formData.find((f) => f.name === 'file')
  const typeField = formData.find((f) => f.name === 'type')

  if (!fileField || !fileField.data || !fileField.filename) {
    return { success: 0, message: 'No file provided' }
  }

  const uploadType = typeField?.data?.toString() || 'image'
  const contentType = fileField.type || 'application/octet-stream'
  const fileBuffer = fileField.data
  const fileName = fileField.filename

  // Validate file type and size
  if (uploadType === 'image') {
    if (!ALLOWED_IMAGE_TYPES.has(contentType)) {
      return { success: 0, message: 'File type not allowed. Use JPEG, PNG, or WebP.' }
    }
    if (fileBuffer.byteLength > MAX_IMAGE_SIZE) {
      return { success: 0, message: 'Image exceeds maximum size of 5MB' }
    }
  } else {
    if (!ALLOWED_ATTACHMENT_TYPES.has(contentType)) {
      return { success: 0, message: 'File type not allowed. Use PDF.' }
    }
    if (fileBuffer.byteLength > MAX_ATTACHMENT_SIZE) {
      return { success: 0, message: 'File exceeds maximum size of 10MB' }
    }
  }

  // Verify file content matches claimed Content-Type via magic bytes
  if (!verifyMagicBytes(fileBuffer, contentType)) {
    return { success: 0, message: 'File content does not match declared type' }
  }

  // Authenticate user via cookies
  const cookies = parseCookies(event)
  const supabase = createServerClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return Object.entries(cookies).map(([name, value]) => ({
            name,
            value: decodeURIComponent(value),
          }))
        },
        setAll(cookiesToSet) {
          for (const cookie of cookiesToSet) {
            setCookie(event, cookie.name, cookie.value, cookie.options)
          }
        },
      },
    },
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw createError({ statusCode: 401, message: 'Not authenticated' })
  }

  // Sanitize filename and build storage path
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_')
  const folder = uploadType === 'image' ? 'editor' : 'editor-attachments'
  const path = `${user.id}/${folder}/${Date.now()}-${safeName}`

  const { error } = await supabase.storage
    .from('uploads')
    .upload(path, fileBuffer, { contentType, upsert: false })

  if (error) {
    return { success: 0, message: 'Upload failed. Please try again.' }
  }

  const { data: urlData } = supabase.storage.from('uploads').getPublicUrl(path)

  return {
    success: 1,
    file: {
      url: urlData.publicUrl,
      name: fileName,
      size: fileBuffer.byteLength,
    },
  }
})
