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

const ALL_SECTIONS = ['bio', 'music', 'events', 'photos', 'technical', 'press', 'contact']

function PagesEditor() {
  const initial = Route.useLoaderData()
  const { saving, saved, error, onSave: save } = useDashboardSave(updateProfile)

  const { handleSubmit, watch, formState: { isDirty }, setValue } = useForm<Pick<ProfileUpdate, 'section_order' | 'section_visibility'>>({
    resolver: zodResolver(profileUpdateSchema.pick({ section_order: true, section_visibility: true }).partial()),
    defaultValues: {
      section_order: initial?.section_order || ALL_SECTIONS,
      section_visibility: (initial?.section_visibility as Record<string, boolean>) || {},
    },
  })

  const onSave = handleSubmit(save)

  const sectionOrder = watch('section_order') || ALL_SECTIONS
  const sectionVisibility = watch('section_visibility') || {}

  const enabledCount = sectionOrder.filter((id) => sectionVisibility[id] !== false).length

  return (
    <form onSubmit={onSave}>
      <DashboardHeader title="Pages" saving={saving} saved={saved} error={error} isDirty={isDirty} />

      <p className="text-sm text-text-secondary mb-6">
        <span className="font-semibold text-text-primary">{enabledCount}</span> of {sectionOrder.length} sections enabled on your public EPK. Toggle sections on or off and drag to reorder.
      </p>

      <div className="max-w-2xl">
        <label className={FORM_LABEL}>Sections</label>
        <SortableSectionList
          order={sectionOrder}
          visibility={sectionVisibility}
          onOrderChange={(newOrder) => setValue('section_order', newOrder, { shouldDirty: true })}
          onVisibilityChange={(newVis) => setValue('section_visibility', newVis, { shouldDirty: true })}
        />
      </div>
    </form>
  )
}
