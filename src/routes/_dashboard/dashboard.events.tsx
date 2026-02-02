import { createFileRoute } from '@tanstack/react-router'
import { useState, useRef } from 'react'
import { getEvents, upsertEvent, deleteEvent, reorderEvents } from '~/server/events'
import { uploadFileFromInput } from '~/utils/upload'

export const Route = createFileRoute('/_dashboard/dashboard/events')({
  loader: () => getEvents(),
  component: EventsEditor,
})

function EventsEditor() {
  const initialEvents = Route.useLoaderData()
  const [events, setEvents] = useState(initialEvents || [])
  const [name, setName] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [adding, setAdding] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleAdd = async () => {
    if (!name.trim()) return
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
      data: { name, image_url: imageUrl, link_url: linkUrl || undefined, sort_order: events.length },
    })
    if ('event' in result && result.event) {
      setEvents([...events, result.event])
      setName('')
      setLinkUrl('')
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
    setAdding(false)
  }

  const handleDelete = async (id: string) => {
    await deleteEvent({ data: id })
    setEvents(events.filter((e: any) => e.id !== id))
  }

  const handleReorder = async (index: number, direction: 'up' | 'down') => {
    const swapIndex = direction === 'up' ? index - 1 : index + 1
    if (swapIndex < 0 || swapIndex >= events.length) return
    const reordered = [...events]
    const temp = reordered[index]
    reordered[index] = reordered[swapIndex]
    reordered[swapIndex] = temp
    setEvents(reordered)
    await reorderEvents({ data: { ids: reordered.map((e: any) => e.id) } })
  }

  const inputClass =
    'w-full bg-dark-card border border-white/10 rounded-lg px-4 py-3 text-white placeholder-text-secondary/50 focus:border-accent focus:outline-none transition-colors text-sm'
  const btnClass =
    'px-4 py-2 rounded-lg text-sm font-bold uppercase tracking-wider transition-colors'

  return (
    <div>
      <h1 className="text-2xl font-black uppercase tracking-wider mb-8">Events / Brands</h1>

      {/* Add Form */}
      <div className="bg-dark-card border border-white/10 rounded-xl p-6 mb-8">
        <h2 className="text-sm uppercase tracking-widest font-bold mb-4">Add Event</h2>
        <div className="grid md:grid-cols-3 gap-4 mb-4">
          <input
            type="text"
            placeholder="Event / Brand Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
          />
          <input
            type="url"
            placeholder="Link URL (optional)"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            className={inputClass}
          />
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            className={inputClass}
          />
        </div>
        <button
          onClick={handleAdd}
          disabled={adding || uploading || !name.trim()}
          className={`${btnClass} bg-accent text-black hover:bg-accent/80 disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {uploading ? 'Uploading...' : adding ? 'Adding...' : 'Add Event'}
        </button>
      </div>

      {/* Events Grid */}
      {events.length === 0 ? (
        <p className="text-text-secondary text-sm">No events yet. Add one above.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {events.map((event: any, index: number) => (
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
                    onClick={() => handleReorder(index, 'up')}
                    disabled={index === 0}
                    className="w-8 h-8 flex items-center justify-center rounded bg-white/10 text-white hover:bg-white/20 disabled:opacity-20 transition-colors text-xs"
                    title="Move up"
                  >
                    &#9650;
                  </button>
                  <button
                    onClick={() => handleReorder(index, 'down')}
                    disabled={index === events.length - 1}
                    className="w-8 h-8 flex items-center justify-center rounded bg-white/10 text-white hover:bg-white/20 disabled:opacity-20 transition-colors text-xs"
                    title="Move down"
                  >
                    &#9660;
                  </button>
                  <button
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
