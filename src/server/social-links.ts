import { createServerFn } from '@tanstack/react-start'
import { getSupabaseServerClient } from '~/utils/supabase'
import { socialLinkUpsertSchema, socialLinkReorderSchema } from '~/schemas/social-link'

export const getSocialLinks = createServerFn({ method: 'GET' }).handler(async () => {
  const supabase = getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  const { data } = await supabase.from('social_links').select('*').eq('profile_id', user.id).order('sort_order')
  return data || []
})

export const upsertSocialLink = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => socialLinkUpsertSchema.parse(data))
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    if (data.id) {
      const { data: link, error } = await supabase.from('social_links')
        .update({ platform: data.platform, url: data.url, handle: data.handle, sort_order: data.sort_order })
        .eq('id', data.id).eq('profile_id', user.id).select().single()
      if (error) return { error: error.message }
      return { link }
    }

    const { data: link, error } = await supabase.from('social_links')
      .insert({ profile_id: user.id, platform: data.platform, url: data.url, handle: data.handle, sort_order: data.sort_order ?? 0 })
      .select().single()
    if (error) return { error: error.message }
    return { link }
  })

export const deleteSocialLink = createServerFn({ method: 'POST' })
  .inputValidator((id: string) => id)
  .handler(async ({ data: id }) => {
    const supabase = getSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }
    const { error } = await supabase.from('social_links').delete().eq('id', id).eq('profile_id', user.id)
    if (error) return { error: error.message }
    return { success: true }
  })

export const reorderSocialLinks = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => socialLinkReorderSchema.parse(data))
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }
    for (let i = 0; i < data.ids.length; i++) {
      await supabase.from('social_links').update({ sort_order: i }).eq('id', data.ids[i]).eq('profile_id', user.id)
    }
    return { success: true }
  })
