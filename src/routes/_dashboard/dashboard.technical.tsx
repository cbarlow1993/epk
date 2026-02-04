import { createFileRoute } from '@tanstack/react-router'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { getTechnicalRider, updateTechnicalRider } from '~/server/technical-rider'
import { technicalRiderUpdateSchema, type TechnicalRiderUpdate } from '~/schemas/technical-rider'
import { TiptapEditor } from '~/components/forms'
import { useDashboardSave } from '~/hooks/useDashboardSave'
import { DashboardHeader } from '~/components/DashboardHeader'

export const Route = createFileRoute('/_dashboard/dashboard/technical')({
  loader: () => getTechnicalRider(),
  component: TechnicalRiderEditor,
})

function TechnicalRiderEditor() {
  const initialData = Route.useLoaderData()
  const { saving, saved, error, onSave: save } = useDashboardSave(updateTechnicalRider)

  const { control, handleSubmit, formState: { errors, isDirty } } = useForm<TechnicalRiderUpdate>({
    resolver: zodResolver(technicalRiderUpdateSchema),
    defaultValues: {
      preferred_setup: initialData?.preferred_setup || '',
      alternative_setup: initialData?.alternative_setup || '',
    },
  })

  const onSave = handleSubmit(save)

  return (
    <form onSubmit={onSave}>
      <DashboardHeader title="Technical Rider" saving={saving} saved={saved} error={error} isDirty={isDirty} />

      <div className="space-y-6">
        <Controller
          name="preferred_setup"
          control={control}
          render={({ field }) => (
            <TiptapEditor
              label="Preferred Setup"
              content={field.value || ''}
              onChange={field.onChange}
              placeholder="e.g. 2 x CDJ-3000, 1 x DJM-900NXS2..."
            />
          )}
        />
        <Controller
          name="alternative_setup"
          control={control}
          render={({ field }) => (
            <TiptapEditor
              label="Alternative Setup"
              content={field.value || ''}
              onChange={field.onChange}
              placeholder="e.g. 2 x CDJ-2000NXS2..."
            />
          )}
        />
      </div>
    </form>
  )
}
