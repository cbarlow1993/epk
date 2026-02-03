import { z } from 'zod'
import { withAuth, withAuthOrNull } from './utils'

// Shared schemas (replaces per-entity reorder/delete schemas)
export const reorderSchema = z.object({ ids: z.array(z.string().uuid()).min(1) })
export const deleteIdSchema = z.string().uuid()

export async function getListItems(table: string) {
  const { supabase, user } = await withAuthOrNull()
  if (!user) return []
  const { data } = await supabase.from(table).select('*').eq('profile_id', user.id).order('sort_order')
  return data || []
}

export async function upsertListItem(table: string, resourceKey: string, input: Record<string, unknown>) {
  const { supabase, user } = await withAuth()
  const { id, ...fields } = input

  if (id) {
    const { data, error } = await supabase
      .from(table)
      .update(fields)
      .eq('id', id as string)
      .eq('profile_id', user.id)
      .select()
      .single()
    if (error) return { error: error.message }
    return { [resourceKey]: data }
  }

  const { data, error } = await supabase
    .from(table)
    .insert({ profile_id: user.id, ...fields })
    .select()
    .single()
  if (error) return { error: error.message }
  return { [resourceKey]: data }
}

export async function deleteListItem(table: string, id: string) {
  const { supabase, user } = await withAuth()
  const { error } = await supabase.from(table).delete().eq('id', id).eq('profile_id', user.id)
  if (error) return { error: error.message }
  return { success: true }
}

export async function reorderListItems(table: string, ids: string[]) {
  const { supabase, user } = await withAuth()
  await Promise.all(
    ids.map((id, i) =>
      supabase.from(table).update({ sort_order: i }).eq('id', id).eq('profile_id', user.id)
    )
  )
  return { success: true }
}
