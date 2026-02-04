import { createFileRoute } from '@tanstack/react-router'
import { useState, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { getEvents, upsertEvent, deleteEvent, reorderEvents } from '~/server/events'
import { eventUpsertSchema, type EventUpsert } from '~/schemas/event'
import { uploadFileFromInput } from '~/utils/upload'
import { FORM_INPUT, FORM_INPUT_ERROR, FORM_ERROR_MSG, BTN_PRIMARY, CARD_SECTION } from '~/components/forms'
import { GridItemOverlay } from '~/components/GridItemOverlay'
import { useListEditor } from '~/hooks/useListEditor'

export const Route = createFileRoute('/_dashboard/dashboard/events')({
  loader: () => getEvents(),
  component: EventsEditor,
})

function EventsEditor() {
  const initialEvents = Route.useLoaderData()
  const { items: events, handleDelete, handleReorder, addItem } = useListEditor(
    initialEvents || [],
    { deleteFn: deleteEvent, reorderFn: reorderEvents }
  )
  const [adding, setAdding] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { register, handleSubmit, formState: { errors }, reset } = useForm<EventUpsert>({
    resolver: zodResolver(eventUpsertSchema.omit({ id: true, sort_order: true, image_url: true })),
    defaultValues: { name: '', link_url: '' },
  })

  const onAdd = handleSubmit(async (data) => {
    setAdding(true)

    let imageUrl: string | undefined
    const file = fileInputRef.current?.files?.[0]
    if (file) {
      setUploading(true)
      const url = await uploadFileFromInput(file, 'events')
      setUploading(false)
      if (url) imageUrl = url
    }

    const result = await upsertEvent({
      data: { name: data.name, image_url: imageUrl, link_url: data.link_url || undefined, sort_order: events.length },
    })
    if ('event' in result && result.event) {
      addItem(result.event)
      reset()
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
    setAdding(false)
  })


  return (
    <div>
      <h1 className="text-2xl font-display font-semibold tracking-tight mb-8">Events / Brands</h1>

      {/* Add Form */}
      <form onSubmit={onAdd} className={CARD_SECTION}>
        <h2 className="font-medium text-text-secondary text-sm mb-4">Add Event</h2>
        <div className="grid md:grid-cols-3 gap-4 mb-2">
          <div>
            <input
              type="text"
              placeholder="Event / Brand Name"
              {...register('name')}
              className={errors.name ? FORM_INPUT_ERROR : FORM_INPUT}
            />
            {errors.name && <p className={FORM_ERROR_MSG}>{errors.name.message}</p>}
          </div>
          <div>
            <input
              type="url"
              placeholder="Link URL (optional)"
              {...register('link_url')}
              className={errors.link_url ? FORM_INPUT_ERROR : FORM_INPUT}
            />
            {errors.link_url && <p className={FORM_ERROR_MSG}>{errors.link_url.message}</p>}
          </div>
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            className={FORM_INPUT}
          />
        </div>
        <button
          type="submit"
          disabled={adding || uploading}
          className={`${BTN_PRIMARY} mt-2`}
        >
          {uploading ? 'Uploading...' : adding ? 'Adding...' : 'Add Event'}
        </button>
      </form>

      {/* Events Grid */}
      {events.length === 0 ? (
        <p className="text-text-secondary text-sm">No events yet. Add one above.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {events.map((event, index) => (
            <div
              key={event.id}
              className="group relative aspect-square bg-white border border-border rounded-xl overflow-hidden"
            >
              {event.image_url ? (
                <img
                  src={event.image_url}
                  alt={event.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-text-secondary text-xs uppercase tracking-wider">
                  {event.name}
                </div>
              )}

              <GridItemOverlay
                label={event.name}
                index={index}
                total={events.length}
                onReorder={handleReorder!}
                onDelete={() => handleDelete(event.id)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
