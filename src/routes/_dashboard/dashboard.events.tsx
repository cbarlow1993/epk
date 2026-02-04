import { createFileRoute } from '@tanstack/react-router'
import { useState, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { getEvents, upsertEvent, deleteEvent, reorderEvents } from '~/server/events'
import { eventUpsertSchema, type EventUpsert } from '~/schemas/event'
import { uploadFileFromInput } from '~/utils/upload'
import { FORM_INPUT, FORM_INPUT_ERROR, BTN_BASE } from '~/components/forms'
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
      <h1 className="text-2xl font-black uppercase tracking-wider mb-8">Events / Brands</h1>

      {/* Add Form */}
      <form onSubmit={onAdd} className="bg-dark-card border border-white/10 rounded-xl p-6 mb-8">
        <h2 className="text-sm uppercase tracking-widest font-bold mb-4">Add Event</h2>
        <div className="grid md:grid-cols-3 gap-4 mb-2">
          <div>
            <input
              type="text"
              placeholder="Event / Brand Name"
              {...register('name')}
              className={errors.name ? FORM_INPUT_ERROR : FORM_INPUT}
            />
            {errors.name && <p className="text-xs text-red-400 mt-1">{errors.name.message}</p>}
          </div>
          <div>
            <input
              type="url"
              placeholder="Link URL (optional)"
              {...register('link_url')}
              className={errors.link_url ? FORM_INPUT_ERROR : FORM_INPUT}
            />
            {errors.link_url && <p className="text-xs text-red-400 mt-1">{errors.link_url.message}</p>}
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
          className={`${BTN_BASE} bg-accent text-black hover:bg-accent/80 disabled:opacity-50 disabled:cursor-not-allowed mt-2`}
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
              className="group relative aspect-square bg-dark-card border border-white/10 rounded-xl overflow-hidden"
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

              {/* Hover Overlay */}
              <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                <p className="text-white text-xs font-bold uppercase tracking-wider text-center px-2 truncate w-full">
                  {event.name}
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleReorder?.(index, 'up')}
                    disabled={index === 0}
                    className="w-8 h-8 flex items-center justify-center rounded bg-white/10 text-white hover:bg-white/20 disabled:opacity-20 transition-colors text-xs"
                    title="Move up"
                  >
                    &#9650;
                  </button>
                  <button
                    type="button"
                    onClick={() => handleReorder?.(index, 'down')}
                    disabled={index === events.length - 1}
                    className="w-8 h-8 flex items-center justify-center rounded bg-white/10 text-white hover:bg-white/20 disabled:opacity-20 transition-colors text-xs"
                    title="Move down"
                  >
                    &#9660;
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(event.id)}
                    className="w-8 h-8 flex items-center justify-center rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors text-xs"
                    title="Delete"
                  >
                    &#10005;
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
