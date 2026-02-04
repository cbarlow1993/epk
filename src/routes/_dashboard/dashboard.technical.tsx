import { useRef } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { getTechnicalRider, updateTechnicalRider } from '~/server/technical-rider'
import { BlockEditor, type BlockEditorHandle } from '~/components/forms'
import { useDashboardSave } from '~/hooks/useDashboardSave'
import { DashboardHeader } from '~/components/DashboardHeader'

export const Route = createFileRoute('/_dashboard/dashboard/technical')({
  loader: () => getTechnicalRider(),
  component: TechnicalRiderEditor,
})

function TechnicalRiderEditor() {
  const initialData = Route.useLoaderData()
  const { saving, saved, error, onSave } = useDashboardSave(updateTechnicalRider)
  const preferredRef = useRef<BlockEditorHandle>(null)
  const alternativeRef = useRef<BlockEditorHandle>(null)

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    const [preferred_setup, alternative_setup] = await Promise.all([
      preferredRef.current?.save() ?? null,
      alternativeRef.current?.save() ?? null,
    ])
    await onSave({ preferred_setup, alternative_setup } as Record<string, unknown>)
  }

  return (
    <form onSubmit={handleSave}>
      <DashboardHeader title="Technical Rider" saving={saving} saved={saved} error={error} isDirty={true} />

      <div className="space-y-6">
        <BlockEditor
          ref={preferredRef}
          label="Preferred Setup"
          defaultData={initialData?.preferred_setup || null}
          placeholder="e.g. 2 x CDJ-3000, 1 x DJM-900NXS2..."
        />
        <BlockEditor
          ref={alternativeRef}
          label="Alternative Setup"
          defaultData={initialData?.alternative_setup || null}
          placeholder="e.g. 2 x CDJ-2000NXS2..."
        />
      </div>
    </form>
  )
}
