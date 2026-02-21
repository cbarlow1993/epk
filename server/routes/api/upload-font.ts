import { createServerClient } from '@supabase/ssr'
import { defineHandler, readMultipartFormData, createError, parseCookies, setCookie } from 'h3'

const MAX_FONT_SIZE = 500 * 1024 // 500KB

const ALLOWED_FONT_TYPES = new Set([
  'font/woff2',
  'font/woff',
  'font/ttf',
  'font/otf',
  'application/font-woff',
  'application/font-woff2',
  'application/x-font-ttf',
  'application/vnd.ms-opentype',
])

const ALLOWED_FONT_EXTENSIONS = new Set(['.woff2', '.woff', '.ttf', '.otf'])

// Magic byte signatures for font type verification
const FONT_MAGIC_BYTES: number[][] = [
  [0x77, 0x4F, 0x46, 0x46], // wOFF (WOFF)
  [0x77, 0x4F, 0x46, 0x32], // wOF2 (WOFF2)
  [0x00, 0x01, 0x00, 0x00], // TrueType/TTF
  [0x4F, 0x54, 0x54, 0x4F], // OpenType/OTF "OTTO"
]

function verifyFontMagicBytes(buffer: Buffer): boolean {
  return FONT_MAGIC_BYTES.some((sig) =>
    sig.every((byte, i) => buffer[i] === byte)
  )
}

function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.')
  if (lastDot === -1) return ''
  return filename.slice(lastDot).toLowerCase()
}

export default defineHandler(async (event) => {
  // Parse multipart form data
  const formData = await readMultipartFormData(event)
  if (!formData) {
    return { success: 0, message: 'No form data provided' }
  }

  const fileField = formData.find((f) => f.name === 'file')

  if (!fileField || !fileField.data || !fileField.filename) {
    return { success: 0, message: 'No file provided' }
  }

  const contentType = fileField.type || 'application/octet-stream'
  const fileBuffer = fileField.data
  const fileName = fileField.filename
  const fileExtension = getFileExtension(fileName)

  // Validate file type by MIME type or file extension (browsers are inconsistent with font MIME types)
  if (!ALLOWED_FONT_TYPES.has(contentType) && !ALLOWED_FONT_EXTENSIONS.has(fileExtension)) {
    return { success: 0, message: 'File type not allowed. Use WOFF2, WOFF, TTF, or OTF.' }
  }

  // Validate file size
  if (fileBuffer.byteLength > MAX_FONT_SIZE) {
    return { success: 0, message: 'Font file exceeds maximum size of 500KB' }
  }

  // Verify file content via magic bytes (accept any valid font format regardless of declared MIME type)
  if (!verifyFontMagicBytes(fileBuffer)) {
    return { success: 0, message: 'File content does not match a valid font format' }
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

  // Check Pro tier requirement
  const { data: profile } = await supabase
    .from('profiles')
    .select('tier')
    .eq('id', user.id)
    .single()

  if (profile?.tier !== 'pro') {
    return { success: 0, message: 'Font uploads require a Pro subscription' }
  }

  // Sanitize filename and build storage path
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_')
  const path = `${user.id}/fonts/${Date.now()}-${safeName}`

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
