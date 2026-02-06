import { createFileRoute } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { getProfile, updateProfile } from '~/server/profile'
import { profileUpdateSchema, type ProfileUpdate } from '~/schemas/profile'
import { FORM_LABEL } from '~/components/forms'
import { useDashboardSave } from '~/hooks/useDashboardSave'
import { DashboardHeader } from '~/components/DashboardHeader'
import { SortableSectionList } from '~/components/SortableSectionList'

export const Route = createFileRoute('/_dashboard/dashboard/pages')({
  loader: () => getProfile(),
  component: PagesEditor,
})

function PagesEditor() {
  const initial = Route.useLoaderData()
  const { saving, saved, error, onSave: save } = useDashboardSave(updateProfile)

  const { handleSubmit, watch, formState: { isDirty }, setValue } = useForm<Pick<ProfileUpdate, 'hero_style' | 'section_order' | 'section_visibility'>>({
    resolver: zodResolver(profileUpdateSchema.pick({ hero_style: true, section_order: true, section_visibility: true }).partial()),
    defaultValues: {
      hero_style: (initial?.hero_style as ProfileUpdate['hero_style']) || 'fullbleed',
      section_order: initial?.section_order || ['bio', 'music', 'events', 'technical', 'press', 'contact'],
      section_visibility: (initial?.section_visibility as Record<string, boolean>) || {},
    },
  })

  const onSave = handleSubmit(save)

  const heroStyle = watch('hero_style') || 'fullbleed'
  const sectionOrder = watch('section_order') || ['bio', 'music', 'events', 'technical', 'press', 'contact']
  const sectionVisibility = watch('section_visibility') || {}

  return (
    <form onSubmit={onSave}>
      <DashboardHeader title="Pages" saving={saving} saved={saved} error={error} isDirty={isDirty} />

      <div className="grid md:grid-cols-2 gap-8 max-w-2xl">
        {/* Hero Style */}
        <div>
          <label className={FORM_LABEL}>Hero Style</label>
          <div className="space-y-2">
            {(['fullbleed', 'contained', 'minimal'] as const).map((style) => (
              <label key={style} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  value={style}
                  checked={heroStyle === style}
                  onChange={() => setValue('hero_style', style, { shouldDirty: true })}
                  className="w-4 h-4 accent-accent"
                />
                <span className="text-sm capitalize">{style}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Section Order */}
        <div>
          <label className={FORM_LABEL}>Section Order</label>
          <SortableSectionList
            order={sectionOrder}
            visibility={sectionVisibility}
            onOrderChange={(newOrder) => setValue('section_order', newOrder, { shouldDirty: true })}
            onVisibilityChange={(newVis) => setValue('section_visibility', newVis, { shouldDirty: true })}
          />
        </div>
      </div>
    </form>
  )
}
