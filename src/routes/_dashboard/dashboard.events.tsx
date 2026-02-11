import { createFileRoute } from '@tanstack/react-router'
import { useMemo, useState, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { getEvents, getEventCategories, upsertEvent, deleteEvent, reorderEvents } from '~/server/events'
import { getProfile, updateProfile } from '~/server/profile'
import { eventUpsertSchema, type EventUpsert } from '~/schemas/event'
import { uploadFileFromInput } from '~/utils/upload'
import { FORM_LABEL, FORM_INPUT, FORM_INPUT_ERROR, FORM_ERROR_MSG, BTN_BASE, BTN_PRIMARY, BTN_DELETE, FORM_FILE_INPUT } from '~/components/forms'
import { useListEditor } from '~/hooks/useListEditor'
import { ReorderButtons } from '~/components/ReorderButtons'
import { DashboardHeader } from '~/components/DashboardHeader'
import { useSectionToggle } from '~/hooks/useSectionToggle'
import { Modal } from '~/components/Modal'
import type { EventRow } from '~/types/database'
import { formatEventDate } from '~/utils/dates'

export const Route = createFileRoute('/_dashboard/dashboard/events')({
  loader: async () => {
    const [events, categories, profile] = await Promise.all([getEvents(), getEventCategories(), getProfile()])
    return { events, categories, eventCategoryOrder: profile?.event_category_order ?? [], sectionVisibility: (profile?.section_visibility as Record<string, boolean> | null) ?? null }
  },
  component: EventsEditor,
})

const modalSchema = eventUpsertSchema.omit({ sort_order: true })

function EventsEditor() {
  const { events: initialEvents, categories: initialCategories, eventCategoryOrder: initialCategoryOrder, sectionVisibility } = Route.useLoaderData()
  const { items: events, handleDelete, addItem, setItems: setEvents } = useListEditor(
    initialEvents || [],
    { deleteFn: deleteEvent, reorderFn: reorderEvents }
  )
  const [modalItem, setModalItem] = useState<'add' | EventRow | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const sectionToggle = useSectionToggle('events', sectionVisibility)
  const [sectionSaving, setSectionSaving] = useState(false)
  const [sectionSaved, setSectionSaved] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [categoryOrder, setCategoryOrder] = useState<string[]>(initialCategoryOrder || [])

  const categories = useMemo(() => {
    const fromEvents = events.map((e) => e.category).filter(Boolean)
    return [...new Set([...(initialCategories || []), ...fromEvents])].sort()
  }, [events, initialCategories])

  // Group events by category, sorted within each group by sort_order
  const groupedEvents = useMemo(() => {
    const groups: Record<string, EventRow[]> = {}
    for (const event of events) {
      const cat = event.category || 'Uncategorized'
      if (!groups[cat]) groups[cat] = []
      groups[cat].push(event)
    }
    for (const cat in groups) {
      groups[cat].sort((a, b) => a.sort_order - b.sort_order)
    }
    return groups
  }, [events])

  // Order categories: stored order first, then any new categories at the end
  const orderedCategories = useMemo(() => {
    const allCats = Object.keys(groupedEvents)
    const ordered: string[] = []
    for (const cat of categoryOrder) {
      if (allCats.includes(cat)) ordered.push(cat)
    }
    for (const cat of allCats.sort()) {
      if (!ordered.includes(cat)) ordered.push(cat)
    }
    return ordered
  }, [groupedEvents, categoryOrder])

  const { register, handleSubmit, formState: { errors }, reset } = useForm<EventUpsert>({
    resolver: zodResolver(modalSchema),
  })

  const openModal = (item: 'add' | EventRow) => {
    if (item === 'add') {
      reset({ name: '', category: '', link_url: '', description: '', event_date: '', event_date_end: '' })
      setImagePreview(null)
    } else {
      reset({
        id: item.id,
        name: item.name,
        category: item.category,
        image_url: item.image_url || undefined,
        link_url: item.link_url || '',
        description: item.description || '',
        event_date: item.event_date || '',
        event_date_end: item.event_date_end || '',
      })
      setImagePreview(item.image_url || null)
    }
    if (fileInputRef.current) fileInputRef.current.value = ''
    setModalItem(item)
  }

  const closeModal = () => setModalItem(null)

  const onSubmit = handleSubmit(async (data) => {
    setSubmitting(true)

    // Handle image upload if a file was selected
    let imageUrl = data.image_url || undefined
    const file = fileInputRef.current?.files?.[0]
    if (file) {
      const result = await uploadFileFromInput(file, 'events')
      if (result) imageUrl = result.url
    }

    const isEditing = modalItem !== 'add' && modalItem !== null

    const payload: Record<string, unknown> = {
      ...data,
      image_url: imageUrl || undefined,
      link_url: data.link_url || undefined,
      event_date: data.event_date || undefined,
      event_date_end: data.event_date_end || undefined,
    }

    if (!isEditing) {
      // Per-category sort_order: count items in the selected category
      const categoryItems = groupedEvents[data.category] || []
      payload.sort_order = categoryItems.length
    }

    const result = await upsertEvent({ data: payload as EventUpsert })
    if ('event' in result && result.event) {
      if (isEditing) {
        setEvents((prev) => prev.map((e) => (e.id === result.event.id ? result.event : e)))
      } else {
        addItem(result.event)
      }
      closeModal()
    }
    setSubmitting(false)
  })

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImagePreview(URL.createObjectURL(file))
    }
  }

  // Within-category reorder: swap two items, then persist just that category's IDs
  const handleItemReorder = async (category: string, indexInCategory: number, direction: 'up' | 'down') => {
    const catItems = groupedEvents[category]
    if (!catItems) return
    const swapIndex = direction === 'up' ? indexInCategory - 1 : indexInCategory + 1
    if (swapIndex < 0 || swapIndex >= catItems.length) return

    const itemA = catItems[indexInCategory]
    const itemB = catItems[swapIndex]

    // Optimistic update
    setEvents((prev) => {
      const next = [...prev]
      const idxA = next.findIndex((e) => e.id === itemA.id)
      const idxB = next.findIndex((e) => e.id === itemB.id)
      if (idxA === -1 || idxB === -1) return prev
      const sortA = next[idxA].sort_order
      const sortB = next[idxB].sort_order
      next[idxA] = { ...next[idxA], sort_order: sortB }
      next[idxB] = { ...next[idxB], sort_order: sortA }
      return next
    })

    // Persist: reorder just this category's items
    const reorderedCatItems = [...catItems]
    const temp = reorderedCatItems[indexInCategory]
    reorderedCatItems[indexInCategory] = reorderedCatItems[swapIndex]
    reorderedCatItems[swapIndex] = temp
    await reorderEvents({ data: { ids: reorderedCatItems.map((e) => e.id) } })
  }

  // Category reorder: swap two categories in the order array, persist to profile
  const handleCategoryReorder = async (catIndex: number, direction: 'up' | 'down') => {
    const swapIndex = direction === 'up' ? catIndex - 1 : catIndex + 1
    if (swapIndex < 0 || swapIndex >= orderedCategories.length) return

    const newOrder = [...orderedCategories]
    const temp = newOrder[catIndex]
    newOrder[catIndex] = newOrder[swapIndex]
    newOrder[swapIndex] = temp

    setCategoryOrder(newOrder)
    await updateProfile({ data: { event_category_order: newOrder } })
  }

  const handleSectionSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSectionSaving(true)
    await sectionToggle.save()
    setSectionSaving(false)
    setSectionSaved(true)
    setTimeout(() => setSectionSaved(false), 3000)
  }

  return (
    <div>
      <form onSubmit={handleSectionSave}>
        <DashboardHeader title="Events / Brands" saving={sectionSaving} saved={sectionSaved} error="" isDirty={sectionToggle.isDirty} sectionEnabled={sectionToggle.enabled} onToggleSection={sectionToggle.toggle} />
      </form>

      {/* Add button */}
      <div className="mb-6">
        <button type="button" onClick={() => openModal('add')} className={BTN_PRIMARY}>
          + Add Event
        </button>
      </div>

      {/* Category datalist */}
      <datalist id="event-categories">
        {categories.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>

      {/* Events List — grouped by category */}
      {events.length === 0 ? (
        <p className="text-text-secondary text-sm">No events yet. Add one above.</p>
      ) : (
        <div className="space-y-6">
          {orderedCategories.map((category, catIndex) => {
            const catEvents = groupedEvents[category]
            if (!catEvents || catEvents.length === 0) return null
            return (
              <div key={category}>
                {/* Category header */}
                <div className="flex items-center gap-3 mb-3">
                  <ReorderButtons
                    index={catIndex}
                    total={orderedCategories.length}
                    onReorder={handleCategoryReorder}
                  />
                  <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider">
                    {category}
                    <span className="ml-2 text-text-secondary font-normal normal-case tracking-normal">
                      ({catEvents.length})
                    </span>
                  </h3>
                </div>

                {/* Items in this category */}
                <div className="space-y-3 ml-8">
                  {catEvents.map((event, index) => (
                    <div
                      key={event.id}
                      className="bg-surface border border-border p-4 flex items-center gap-4"
                    >
                      <ReorderButtons
                        index={index}
                        total={catEvents.length}
                        onReorder={(i, dir) => handleItemReorder(category, i, dir)}
                      />

                      {/* Thumbnail */}
                      {event.image_url && (
                        <img
                          src={event.image_url}
                          alt=""
                          className="w-10 h-10 object-cover shrink-0"
                        />
                      )}

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-text-primary truncate">{event.name}</p>
                        {formatEventDate(event.event_date, event.event_date_end) && (
                          <p className="text-xs text-text-secondary">{formatEventDate(event.event_date, event.event_date_end)}</p>
                        )}
                        {event.link_url && (
                          <p className="text-xs text-text-secondary truncate">{event.link_url}</p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => openModal(event)}
                          className={`${BTN_BASE} bg-bg text-text-primary hover:bg-border`}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(event.id)}
                          className={BTN_DELETE}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal */}
      <Modal
        open={modalItem !== null}
        onClose={closeModal}
        title={modalItem === 'add' ? 'Add Event' : 'Edit Event'}
      >
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className={FORM_LABEL}>Name</label>
            <input
              type="text"
              placeholder="Event / Brand Name"
              {...register('name')}
              className={errors.name ? FORM_INPUT_ERROR : FORM_INPUT}
            />
            {errors.name && <p className={FORM_ERROR_MSG}>{errors.name.message}</p>}
          </div>

          <div>
            <label className={FORM_LABEL}>Category</label>
            <input
              type="text"
              placeholder="e.g. Residencies"
              list="event-categories"
              {...register('category')}
              className={errors.category ? FORM_INPUT_ERROR : FORM_INPUT}
            />
            {errors.category && <p className={FORM_ERROR_MSG}>{errors.category.message}</p>}
          </div>

          <div>
            <label className={FORM_LABEL}>Link URL (optional)</label>
            <input
              type="url"
              placeholder="https://..."
              {...register('link_url')}
              className={errors.link_url ? FORM_INPUT_ERROR : FORM_INPUT}
            />
            {errors.link_url && <p className={FORM_ERROR_MSG}>{errors.link_url.message}</p>}
          </div>

          <div>
            <label className={FORM_LABEL}>Description (optional)</label>
            <textarea
              placeholder="Short description"
              rows={3}
              {...register('description')}
              className={FORM_INPUT}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={FORM_LABEL}>Date (optional)</label>
              <input
                type="date"
                {...register('event_date')}
                className={FORM_INPUT}
              />
            </div>
            <div>
              <label className={FORM_LABEL}>End Date (optional)</label>
              <input
                type="date"
                {...register('event_date_end')}
                className={FORM_INPUT}
              />
            </div>
          </div>

          <div>
            <label className={FORM_LABEL}>Image (optional)</label>
            <p className="text-xs text-text-secondary mb-2">Recommended: 800 x 800px</p>
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              onChange={handleFileChange}
              className={FORM_FILE_INPUT}
            />
            {imagePreview && (
              <img src={imagePreview} alt="Preview" className="mt-2 w-24 h-24 object-cover" />
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={submitting} className={BTN_PRIMARY}>
              {submitting ? 'Saving...' : 'Save'}
            </button>
            <button type="button" onClick={closeModal} className={`${BTN_BASE} bg-bg text-text-primary hover:bg-border`}>
              Cancel
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
