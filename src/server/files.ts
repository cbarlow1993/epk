import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { fileMoveSchema, fileTagsSchema } from '~/schemas/file'
import { withAuth } from './utils'

const STORAGE_LIMIT_FREE = 5 * 1024 * 1024 * 1024   // 5GB
const STORAGE_LIMIT_PRO = 100 * 1024 * 1024 * 1024   // 100GB

export const getFiles = createServerFn({ method: 'GET' })
  .inputValidator((data: unknown) => z.object({ folderId: z.string().uuid().nullable().optional() }).parse(data))
  .handler(async ({ data }) => {
    const { supabase, user } = await withAuth()

    let query = supabase.from('files').select('*').eq('profile_id', user.id)

    if (data.folderId) {
      query = query.eq('folder_id', data.folderId)
    } else if (data.folderId === null) {
      query = query.is('folder_id', null)
    }

    const { data: files } = await query.order('created_at', { ascending: false })

    if (files && files.length > 0) {
      const fileIds = files.map((f: { id: string }) => f.id)
      const { data: tags } = await supabase
        .from('file_tags')
        .select('file_id, tag')
        .in('file_id', fileIds)

      const tagsByFile: Record<string, string[]> = {}
      for (const t of tags || []) {
        if (!tagsByFile[t.file_id]) tagsByFile[t.file_id] = []
        tagsByFile[t.file_id].push(t.tag)
      }

      return files.map((f: { id: string }) => ({ ...f, tags: tagsByFile[f.id] || [] }))
    }

    return files || []
  })

export const getStorageUsage = createServerFn({ method: 'GET' }).handler(async () => {
  const { supabase, user } = await withAuth()

  const { data: profile } = await supabase.from('profiles').select('tier').eq('id', user.id).single()

  const { data: files } = await supabase
    .from('files')
    .select('file_size')
    .eq('profile_id', user.id)

  const used = files?.reduce((sum: number, f: { file_size: number }) => sum + f.file_size, 0) || 0
  const limit = profile?.tier === 'pro' ? STORAGE_LIMIT_PRO : STORAGE_LIMIT_FREE

  return { used, limit, tier: profile?.tier || 'free' }
})

export const uploadFileToRepo = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => z.object({
    base64: z.string().min(1),
    fileName: z.string().min(1).max(200),
    contentType: z.string().min(1),
    fileSize: z.number().int().positive(),
    folderId: z.string().uuid().nullable().optional(),
    tags: z.array(z.string().max(50)).max(20).optional(),
  }).parse(data))
  .handler(async ({ data }) => {
    const { supabase, user } = await withAuth()

    const { data: profile } = await supabase.from('profiles').select('tier').eq('id', user.id).single()
    const limit = profile?.tier === 'pro' ? STORAGE_LIMIT_PRO : STORAGE_LIMIT_FREE

    const { data: existingFiles } = await supabase
      .from('files')
      .select('file_size')
      .eq('profile_id', user.id)
    const currentUsage = existingFiles?.reduce((sum: number, f: { file_size: number }) => sum + f.file_size, 0) || 0

    const buffer = Buffer.from(data.base64, 'base64')
    const actualSize = buffer.length

    if (currentUsage + actualSize > limit) {
      return { error: 'Storage limit exceeded. Upgrade to Pro for 100GB storage.' }
    }

    const safeName = data.fileName.replace(/[^a-zA-Z0-9._-]/g, '_')
    const path = `${user.id}/files/${Date.now()}-${safeName}`

    const { error: uploadError } = await supabase.storage
      .from('uploads')
      .upload(path, buffer, { contentType: data.contentType, upsert: false })

    if (uploadError) return { error: uploadError.message }

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
        folder_id: data.folderId || null,
        name: data.fileName,
        file_url: urlData.publicUrl,
        file_type: fileType,
        file_size: actualSize,
        mime_type: data.contentType,
      })
      .select()
      .single()

    if (dbError) return { error: dbError.message }

    if (data.tags && data.tags.length > 0) {
      await supabase.from('file_tags').insert(
        data.tags.map((tag) => ({ file_id: file.id, tag }))
      )
    }

    return { file: { ...file, tags: data.tags || [] } }
  })

export const deleteFile = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data: { id } }) => {
    const { supabase, user } = await withAuth()

    const { data: file } = await supabase
      .from('files')
      .select('file_url')
      .eq('id', id)
      .eq('profile_id', user.id)
      .single()

    if (!file) return { error: 'File not found' }

    const { error } = await supabase.from('files').delete().eq('id', id).eq('profile_id', user.id)
    if (error) return { error: error.message }

    const url = new URL(file.file_url)
    const storagePath = url.pathname.split('/uploads/')[1]
    if (storagePath) {
      await supabase.storage.from('uploads').remove([decodeURIComponent(storagePath)])
    }

    return { success: true }
  })

export const moveFile = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => fileMoveSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabase, user } = await withAuth()
    const { error } = await supabase
      .from('files')
      .update({ folder_id: data.folder_id })
      .eq('id', data.id)
      .eq('profile_id', user.id)
    if (error) return { error: error.message }
    return { success: true }
  })

export const updateFileTags = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => fileTagsSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabase, user } = await withAuth()

    const { data: file } = await supabase
      .from('files')
      .select('id')
      .eq('id', data.id)
      .eq('profile_id', user.id)
      .single()
    if (!file) return { error: 'File not found' }

    await supabase.from('file_tags').delete().eq('file_id', data.id)
    if (data.tags.length > 0) {
      await supabase.from('file_tags').insert(
        data.tags.map((tag) => ({ file_id: data.id, tag }))
      )
    }

    return { success: true }
  })
