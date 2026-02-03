import { createServerFn } from '@tanstack/react-start'
import { socialLinkUpsertSchema } from '~/schemas/social-link'
import { getListItems, upsertListItem, deleteListItem, reorderListItems, deleteIdSchema, reorderSchema } from './list-helpers'

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
