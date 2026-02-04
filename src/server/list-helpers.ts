import { z } from 'zod'
import { withAuth, withAuthOrNull } from './utils'

// Shared schemas (replaces per-entity reorder/delete schemas)
export const reorderSchema = z.object({ ids: z.array(z.string().uuid()).min(1) })
export const deleteIdSchema = z.string().uuid()

export async function getListItems(table: string, profileId?: string) {
  const { supabase, user } = await withAuthOrNull()
  if (!user) return []
  const id = profileId || user.id
  const { data } = await supabase.from(table).select('*').eq('profile_id', id).order('sort_order')
  return data || []
}

export async function upsertListItem(table: string, resourceKey: string, input: Record<string, unknown>, profileId?: string) {
  const { supabase, user } = await withAuth()
  const { id, ...fields } = input
  const pid = profileId || user.id

  if (id) {
    const { data, error } = await supabase
      .from(table)
      .update(fields)
      .eq('id', id as string)
      .eq('profile_id', pid)
      .select()
      .single()
    if (error) return { error: error.message }
    return { [resourceKey]: data }
  }

  const { data, error } = await supabase
    .from(table)
    .insert({ profile_id: pid, ...fields })
    .select()
    .single()
  if (error) return { error: error.message }
  return { [resourceKey]: data }
}

export async function deleteListItem(table: string, id: string, profileId?: string) {
  const { supabase, user } = await withAuth()
  const pid = profileId || user.id
  const { error } = await supabase.from(table).delete().eq('id', id).eq('profile_id', pid)
  if (error) return { error: error.message }
  return { success: true }
}

export async function reorderListItems(table: string, ids: string[], profileId?: string) {
  const { supabase, user } = await withAuth()
  const pid = profileId || user.id
  await Promise.all(
    ids.map((id, i) =>
      supabase.from(table).update({ sort_order: i }).eq('id', id).eq('profile_id', pid)
    )
  )
  return { success: true }
}
