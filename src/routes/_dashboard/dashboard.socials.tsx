import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { getSocialLinks, upsertSocialLink, deleteSocialLink, reorderSocialLinks } from '~/server/social-links'
import { socialLinkUpsertSchema, SOCIAL_PLATFORMS, type SocialLinkUpsert } from '~/schemas/social-link'
import { FORM_INPUT, FORM_INPUT_ERROR, FORM_ERROR_MSG, BTN_PRIMARY, BTN_DELETE, CARD_SECTION, toSelectOptions, getLabelForValue } from '~/components/forms'
import { useListEditor } from '~/hooks/useListEditor'
import { ReorderButtons } from '~/components/ReorderButtons'

export const Route = createFileRoute('/_dashboard/dashboard/socials')({
  loader: () => getSocialLinks(),
  component: SocialsEditor,
})

const PLATFORM_OPTIONS = toSelectOptions(SOCIAL_PLATFORMS)

function SocialsEditor() {
  const initialLinks = Route.useLoaderData()
  const { items: links, handleDelete, handleReorder, addItem } = useListEditor(
    initialLinks || [],
    { deleteFn: deleteSocialLink, reorderFn: reorderSocialLinks }
  )

  const { register, handleSubmit, formState: { errors }, reset } = useForm<SocialLinkUpsert>({
    resolver: zodResolver(socialLinkUpsertSchema.omit({ id: true, sort_order: true })),
    defaultValues: { platform: 'instagram', url: '', handle: '' },
  })
  const [adding, setAdding] = useState(false)

  const onAdd = handleSubmit(async (data) => {
    setAdding(true)
    const result = await upsertSocialLink({
      data: { ...data, sort_order: links.length },
    })
    if ('link' in result && result.link) {
      addItem(result.link)
      reset()
    }
    setAdding(false)
  })

  return (
    <div>
      <h1 className="text-2xl font-display font-extrabold tracking-tight uppercase mb-8">Social Links</h1>

      {/* Add Form */}
      <form onSubmit={onAdd} className={CARD_SECTION}>
        <h2 className="font-medium text-text-secondary text-sm mb-4">Add Social Link</h2>
        <div className="grid md:grid-cols-3 gap-4 mb-2">
          <div>
            <select {...register('platform')} className={FORM_INPUT}>
              {PLATFORM_OPTIONS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>
          <div>
            <input
              type="url"
              placeholder="URL (e.g. https://instagram.com/...)"
              {...register('url')}
              className={errors.url ? FORM_INPUT_ERROR : FORM_INPUT}
            />
            {errors.url && <p className={FORM_ERROR_MSG}>{errors.url.message}</p>}
          </div>
          <div>
            <input
              type="text"
              placeholder="@username"
              {...register('handle')}
              className={errors.handle ? FORM_INPUT_ERROR : FORM_INPUT}
            />
            {errors.handle && <p className={FORM_ERROR_MSG}>{errors.handle.message}</p>}
          </div>
        </div>
        <button
          type="submit"
          disabled={adding}
          className={`${BTN_PRIMARY} mt-2`}
        >
          {adding ? 'Adding...' : 'Add'}
        </button>
      </form>

      {/* Links List */}
      {links.length === 0 ? (
        <p className="text-text-secondary text-sm">No social links yet. Add one above.</p>
      ) : (
        <div className="space-y-3">
          {links.map((link, index) => (
            <div
              key={link.id}
              className="bg-white border border-border p-4 flex items-center gap-4"
            >
              {/* Reorder Buttons */}
              {handleReorder && <ReorderButtons index={index} total={links.length} onReorder={handleReorder} />}

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="font-bold text-text-primary truncate">{getLabelForValue(PLATFORM_OPTIONS, link.platform)}</p>
                <p className="text-xs text-text-secondary truncate">
                  {link.handle && <span className="mr-2">{link.handle}</span>}
                  {link.url}
                </p>
              </div>

              {/* Delete */}
              <button
                type="button"
                onClick={() => handleDelete(link.id)}
                className={BTN_DELETE}
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
