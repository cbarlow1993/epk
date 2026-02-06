import { createFileRoute } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { getTechnicalRider, updateTechnicalRider } from '~/server/technical-rider'
import { technicalRiderUpdateSchema, DECK_MODELS, MIXER_MODELS, MONITOR_TYPES, type TechnicalRiderUpdate } from '~/schemas/technical-rider'
import { FormInput, FormSelect, FormTextarea, FORM_LABEL, CARD_SECTION } from '~/components/forms'
import { useDashboardSave } from '~/hooks/useDashboardSave'
import { DashboardHeader } from '~/components/DashboardHeader'
import { useSectionToggle } from '~/hooks/useSectionToggle'

export const Route = createFileRoute('/_dashboard/dashboard/technical')({
  loader: () => getTechnicalRider(),
  component: TechnicalRiderEditor,
})

const deckOptions = DECK_MODELS.map((m) => ({ value: m, label: m }))
const mixerOptions = MIXER_MODELS.map((m) => ({ value: m, label: m }))
const monitorOptions = MONITOR_TYPES.map((m) => ({ value: m, label: m }))
const qtyOptions = [2, 3, 4].map((n) => ({ value: String(n), label: String(n) }))

function TechnicalRiderEditor() {
  const initialData = Route.useLoaderData()
  const { saving, saved, error, onSave } = useDashboardSave(updateTechnicalRider)
  const sectionToggle = useSectionToggle('technical')

  const { register, handleSubmit, watch, formState: { errors, isDirty } } = useForm<TechnicalRiderUpdate>({
    resolver: zodResolver(technicalRiderUpdateSchema) as never,
    defaultValues: {
      deck_model: initialData?.deck_model ?? undefined,
      deck_model_other: initialData?.deck_model_other ?? '',
      deck_quantity: initialData?.deck_quantity ?? undefined,
      mixer_model: initialData?.mixer_model ?? undefined,
      mixer_model_other: initialData?.mixer_model_other ?? '',
      monitor_type: initialData?.monitor_type ?? undefined,
      monitor_quantity: initialData?.monitor_quantity ?? undefined,
      monitor_notes: initialData?.monitor_notes ?? '',
      additional_notes: initialData?.additional_notes ?? '',
    },
  })

  const deckModel = watch('deck_model')
  const mixerModel = watch('mixer_model')
  const monitorType = watch('monitor_type')
  const showMonitorQty = monitorType === 'Booth Monitors' || monitorType === 'Both'

  const onSubmit = handleSubmit(async (formData) => {
    // Convert empty strings to null for DB storage
    const cleaned: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(formData)) {
      cleaned[key] = value === '' ? null : value
    }
    await Promise.all([
      onSave(cleaned as TechnicalRiderUpdate),
      sectionToggle.save(),
    ])
  })

  return (
    <form onSubmit={onSubmit}>
      <DashboardHeader
        title="Technical Rider"
        saving={saving}
        saved={saved}
        error={error}
        isDirty={isDirty || sectionToggle.isDirty}
        sectionEnabled={sectionToggle.enabled}
        onToggleSection={sectionToggle.toggle}
      />

      <div className="space-y-8 max-w-2xl">
        {/* Decks */}
        <div className={CARD_SECTION}>
          <h2 className={FORM_LABEL + ' mb-4 text-sm'}>Decks</h2>
          <div className="grid grid-cols-2 gap-4">
            <FormSelect
              label="Model"
              registration={register('deck_model')}
              error={errors.deck_model}
              options={deckOptions}
              placeholder="Select model..."
            />
            <FormSelect
              label="Quantity"
              registration={register('deck_quantity')}
              error={errors.deck_quantity}
              options={qtyOptions}
              placeholder="Qty"
            />
          </div>
          {deckModel === 'Other' && (
            <FormInput
              label="Specify Model"
              registration={register('deck_model_other')}
              error={errors.deck_model_other}
              placeholder="e.g. Rane Twelve MKII"
              className="mt-4"
            />
          )}
        </div>

        {/* Mixer */}
        <div className={CARD_SECTION}>
          <h2 className={FORM_LABEL + ' mb-4 text-sm'}>Mixer</h2>
          <FormSelect
            label="Model"
            registration={register('mixer_model')}
            error={errors.mixer_model}
            options={mixerOptions}
            placeholder="Select model..."
          />
          {mixerModel === 'Other' && (
            <FormInput
              label="Specify Model"
              registration={register('mixer_model_other')}
              error={errors.mixer_model_other}
              placeholder="e.g. Ecler Nuo 4.0"
              className="mt-4"
            />
          )}
        </div>

        {/* Monitoring */}
        <div className={CARD_SECTION}>
          <h2 className={FORM_LABEL + ' mb-4 text-sm'}>Monitoring</h2>
          <div className={`grid ${showMonitorQty ? 'grid-cols-2' : 'grid-cols-1'} gap-4`}>
            <FormSelect
              label="Type"
              registration={register('monitor_type')}
              error={errors.monitor_type}
              options={monitorOptions}
              placeholder="Select type..."
            />
            {showMonitorQty && (
              <FormInput
                label="Quantity"
                registration={register('monitor_quantity')}
                error={errors.monitor_quantity}
                type="number"
                placeholder="2"
              />
            )}
          </div>
          <FormInput
            label="Monitor Notes"
            registration={register('monitor_notes')}
            error={errors.monitor_notes}
            placeholder="e.g. Wedge style preferred"
            className="mt-4"
          />
        </div>

        {/* Additional Notes */}
        <div className={CARD_SECTION}>
          <FormTextarea
            label="Additional Notes"
            registration={register('additional_notes')}
            error={errors.additional_notes}
            rows={4}
            placeholder="Power requirements, stage furniture, USB access, etc."
          />
        </div>
      </div>
    </form>
  )
}
