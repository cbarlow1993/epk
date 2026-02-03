import { getSupabaseServerClient } from '~/utils/supabase'

export async function withAuth() {
  const supabase = getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  return { supabase, user }
}

export async function withAuthOrNull() {
  const supabase = getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  return { supabase, user }
}
