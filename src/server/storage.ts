import type { SupabaseClient } from '@supabase/supabase-js'

export const STORAGE_LIMIT_FREE = 5 * 1024 * 1024 * 1024   // 5GB
export const STORAGE_LIMIT_PRO = 100 * 1024 * 1024 * 1024   // 100GB

export async function checkStorageQuota(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ allowed: boolean; error?: string; used: number; limit: number }> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('tier')
    .eq('id', userId)
    .single()

  const limit = profile?.tier === 'pro' ? STORAGE_LIMIT_PRO : STORAGE_LIMIT_FREE

  const { data: files } = await supabase
    .from('files')
    .select('file_size')
    .eq('profile_id', userId)

  const used = files?.reduce((sum: number, f: { file_size: number }) => sum + f.file_size, 0) || 0

  return { allowed: true, used, limit }
}
