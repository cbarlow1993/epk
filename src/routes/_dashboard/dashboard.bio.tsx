import { createFileRoute } from '@tanstack/react-router'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { getProfile, updateProfile } from '~/server/profile'
import { profileUpdateSchema, type ProfileUpdate } from '~/schemas/profile'
import { TiptapEditor } from '~/components/forms'
import { useDashboardSave } from '~/hooks/useDashboardSave'
import { DashboardHeader } from '~/components/DashboardHeader'

export const Route = createFileRoute('/_dashboard/dashboard/bio')({
  loader: () => getProfile(),
  component: BioEditor,
})

function BioEditor() {
  const initialProfile = Route.useLoaderData()
  const { saving, saved, error, onSave: save } = useDashboardSave(updateProfile)

  const { control, handleSubmit, formState: { errors, isDirty } } = useForm<Pick<ProfileUpdate, 'bio_left' | 'bio_right'>>({
    resolver: zodResolver(profileUpdateSchema.pick({ bio_left: true, bio_right: true }).partial()),
    defaultValues: {
      bio_left: initialProfile?.bio_left || '',
      bio_right: initialProfile?.bio_right || '',
    },
  })

  const onSave = handleSubmit(save)

  return (
    <form onSubmit={onSave}>
      <DashboardHeader title="Bio" saving={saving} saved={saved} error={error} isDirty={isDirty} />

      <div className="grid md:grid-cols-2 gap-6">
        <Controller
          name="bio_left"
          control={control}
          render={({ field }) => (
            <TiptapEditor
              label="Left Column"
              content={field.value || ''}
              onChange={field.onChange}
              placeholder="First half of your bio..."
            />
          )}
        />
        <Controller
          name="bio_right"
          control={control}
          render={({ field }) => (
            <TiptapEditor
              label="Right Column"
              content={field.value || ''}
              onChange={field.onChange}
              placeholder="Second half of your bio..."
            />
          )}
        />
      </div>
    </form>
  )
}
