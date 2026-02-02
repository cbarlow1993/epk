import { createServerFn } from '@tanstack/react-start'
import { getSupabaseServerClient } from '~/utils/supabase'
import { getRequest } from '@tanstack/react-start/server'

export const uploadFile = createServerFn({ method: 'POST' })
  .inputValidator((data: { base64: string; fileName: string; contentType: string; folder: string }) => data)
  .handler(async ({ data }) => {
    const request = getRequest()
    const { supabase } = getSupabaseServerClient(request)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    const buffer = Buffer.from(data.base64, 'base64')
    const path = `${user.id}/${data.folder}/${Date.now()}-${data.fileName}`

    const { error } = await supabase.storage
      .from('uploads')
      .upload(path, buffer, { contentType: data.contentType, upsert: false })

    if (error) return { error: error.message }

    const { data: urlData } = supabase.storage.from('uploads').getPublicUrl(path)
    return { url: urlData.publicUrl }
  })
