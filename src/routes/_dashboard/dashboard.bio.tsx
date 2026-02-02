import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { getProfile, updateProfile } from '~/server/profile'
import { profileUpdateSchema, type ProfileUpdate } from '~/schemas/profile'
import { FormTextarea } from '~/components/forms'

export const Route = createFileRoute('/_dashboard/dashboard/bio')({
  loader: () => getProfile(),
  component: BioEditor,
})

function BioEditor() {
  const initialProfile = Route.useLoaderData()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const { register, handleSubmit, formState: { errors, isDirty } } = useForm<Pick<ProfileUpdate, 'bio_left' | 'bio_right'>>({
    resolver: zodResolver(profileUpdateSchema.pick({ bio_left: true, bio_right: true }).partial()),
    defaultValues: {
      bio_left: initialProfile?.bio_left || '',
      bio_right: initialProfile?.bio_right || '',
    },
  })

  const onSave = handleSubmit(async (data) => {
    setSaving(true)
    setSaved(false)
    setError('')
    try {
      const result = await updateProfile({ data })
      if (result && 'error' in result) {
        setError(result.error as string)
      } else {
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      }
    } catch {
      setError('Failed to save. Please try again.')
    }
    setSaving(false)
  })

  return (
    <form onSubmit={onSave}>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-black uppercase tracking-wider">Bio</h1>
        <div className="flex items-center gap-3">
          {saved && <span className="text-xs text-green-400">Saved</span>}
          {error && <span className="text-xs text-red-400">{error}</span>}
          <button
            type="submit"
            disabled={saving || (!isDirty && !saved)}
            className="px-5 py-2 rounded-lg text-sm font-bold uppercase tracking-wider bg-accent text-black hover:bg-accent/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

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
