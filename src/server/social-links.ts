import { createServerFn } from '@tanstack/react-start'
import { socialLinkUpsertSchema, socialLinksBulkSchema } from '~/schemas/social-link'
import { getListItems, upsertListItem, deleteListItem, reorderListItems, deleteIdSchema, reorderSchema } from './list-helpers'
import { withAuth, withAuthOrNull } from './utils'

export const getSocialLinks = createServerFn({ method: 'GET' }).handler(() => getListItems('social_links'))

export const upsertSocialLink = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => socialLinkUpsertSchema.parse(data))
  .handler(({ data }) => upsertListItem('social_links', 'link', data as Record<string, unknown>))

export const deleteSocialLink = createServerFn({ method: 'POST' })
  .inputValidator((id: unknown) => deleteIdSchema.parse(id))
  .handler(({ data: id }) => deleteListItem('social_links', id))

export const reorderSocialLinks = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => reorderSchema.parse(data))
  .handler(({ data }) => reorderListItems('social_links', data.ids))

/** Bulk-save social links: upserts platforms with URLs, deletes platforms with empty URLs */
export const saveSocialLinksBulk = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => socialLinksBulkSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabase, user } = await withAuth()

    // Get existing links to determine inserts vs updates vs deletes
    const { data: existing } = await supabase
      .from('social_links')
      .select('*')
      .eq('profile_id', user.id)

    const existingByPlatform = new Map(
      (existing || []).map((link: { platform: string; id: string; url: string }) => [link.platform, link])
    )

    const ops: PromiseLike<unknown>[] = []
    let sortOrder = 0

    for (const [platform, url] of Object.entries(data)) {
      const existingLink = existingByPlatform.get(platform) as { id: string } | undefined

      if (url) {
        // Upsert
        if (existingLink) {
          ops.push(
            supabase.from('social_links')
              .update({ url, sort_order: sortOrder })
              .eq('id', existingLink.id)
              .eq('profile_id', user.id)
          )
        } else {
          ops.push(
            supabase.from('social_links')
              .insert({ profile_id: user.id, platform, url, handle: '', sort_order: sortOrder })
          )
        }
        sortOrder++
      } else if (existingLink) {
        // Delete if URL was cleared
        ops.push(
          supabase.from('social_links')
            .delete()
            .eq('id', existingLink.id)
            .eq('profile_id', user.id)
        )
      }
    }

    await Promise.all(ops)
    return { data: { success: true } }
  })
