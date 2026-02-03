import { createFileRoute } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { getProfile, updateProfile } from '~/server/profile'
import { profileUpdateSchema, type ProfileUpdate } from '~/schemas/profile'
import { FormTextarea } from '~/components/forms'
import { useDashboardSave } from '~/hooks/useDashboardSave'
import { DashboardHeader } from '~/components/DashboardHeader'

export const Route = createFileRoute('/_dashboard/dashboard/bio')({
  loader: () => getProfile(),
  component: BioEditor,
})

function BioEditor() {
  const initialProfile = Route.useLoaderData()
  const { saving, saved, error, onSave: save } = useDashboardSave(updateProfile)

  const { register, handleSubmit, formState: { errors, isDirty } } = useForm<Pick<ProfileUpdate, 'bio_left' | 'bio_right'>>({
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
        <FormTextarea
          label="Left Column"
          registration={register('bio_left')}
          error={errors.bio_left}
          rows={15}
          placeholder="First half of your bio..."
        />
        <FormTextarea
          label="Right Column"
          registration={register('bio_right')}
          error={errors.bio_right}
          rows={15}
          placeholder="Second half of your bio..."
        />
      </div>
    </form>
  )
}
