import { getSupabaseServerClient } from '~/utils/supabase.server'

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

export async function withAuthForProfile(profileId?: string) {
  const supabase = getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // If a profileId is specified and it's different from user.id,
  // the RLS policies (via can_access_profile) will enforce authorization.
  // The server function just needs to use this profileId instead of user.id.
  const effectiveProfileId = profileId || user.id

  return { supabase, user, profileId: effectiveProfileId }
}
