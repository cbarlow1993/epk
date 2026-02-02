import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { getTechnicalRider, updateTechnicalRider } from '~/server/technical-rider'
import { technicalRiderUpdateSchema, type TechnicalRiderUpdate } from '~/schemas/technical-rider'
import { FormTextarea } from '~/components/forms'

export const Route = createFileRoute('/_dashboard/dashboard/technical')({
  loader: () => getTechnicalRider(),
  component: TechnicalRiderEditor,
})

function TechnicalRiderEditor() {
  const initialData = Route.useLoaderData()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const { register, handleSubmit, formState: { errors, isDirty } } = useForm<TechnicalRiderUpdate>({
    resolver: zodResolver(technicalRiderUpdateSchema),
    defaultValues: {
      preferred_setup: initialData?.preferred_setup || '',
      alternative_setup: initialData?.alternative_setup || '',
    },
  })

  const onSave = handleSubmit(async (data) => {
    setSaving(true)
    setSaved(false)
    setError('')
    try {
      const result = await updateTechnicalRider({ data })
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
        <h1 className="text-2xl font-black uppercase tracking-wider">Technical Rider</h1>
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

      <div className="space-y-6">
        <FormTextarea
          label="Preferred Setup"
          registration={register('preferred_setup')}
          error={errors.preferred_setup}
          rows={8}
          placeholder="e.g. 2 x CDJ-3000, 1 x DJM-900NXS2..."
        />
        <FormTextarea
          label="Alternative Setup"
          registration={register('alternative_setup')}
          error={errors.alternative_setup}
          rows={8}
          placeholder="e.g. 2 x CDJ-2000NXS2..."
        />
      </div>
    </form>
  )
}
