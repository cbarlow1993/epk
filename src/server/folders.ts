import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { folderCreateSchema, folderRenameSchema } from '~/schemas/folder'
import { withAuth } from './utils'

export const getFolders = createServerFn({ method: 'GET' }).handler(async () => {
  const { supabase, user } = await withAuth()
  const { data } = await supabase
    .from('folders')
    .select('*')
    .eq('profile_id', user.id)
    .order('name')
  return data || []
})

export const createFolder = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => folderCreateSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabase, user } = await withAuth()

    const { data: profile } = await supabase.from('profiles').select('tier').eq('id', user.id).single()
    if (profile?.tier !== 'pro') return { error: 'Folders are a Premium feature' }

    const { data: folder, error } = await supabase
      .from('folders')
      .insert({ profile_id: user.id, name: data.name, parent_id: data.parent_id || null })
      .select()
      .single()

    if (error) return { error: error.message }
    return { folder }
  })

export const renameFolder = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => folderRenameSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabase, user } = await withAuth()
    const { error } = await supabase
      .from('folders')
      .update({ name: data.name })
      .eq('id', data.id)
      .eq('profile_id', user.id)
    if (error) return { error: error.message }
    return { success: true }
  })

export const deleteFolder = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data: { id } }) => {
    const { supabase, user } = await withAuth()
    const { error } = await supabase.from('folders').delete().eq('id', id).eq('profile_id', user.id)
    if (error) return { error: error.message }
    return { success: true }
  })
