import { createFileRoute } from '@tanstack/react-router'
import { useMemo, useState, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { getMixes, getMixCategories, upsertMix, deleteMix, reorderMixes } from '~/server/mixes'
import { getProfile, updateProfile } from '~/server/profile'
import { resolveEmbed } from '~/server/oembed'
import { mixUpsertSchema, type MixUpsert } from '~/schemas/mix'
import { FORM_LABEL, FORM_INPUT, FORM_INPUT_ERROR, FORM_ERROR_MSG, BTN_BASE, BTN_PRIMARY, BTN_DELETE, FORM_FILE_INPUT } from '~/components/forms'
import { useListEditor } from '~/hooks/useListEditor'
import { ReorderButtons } from '~/components/ReorderButtons'
import { DashboardHeader } from '~/components/DashboardHeader'
import { useSectionToggle } from '~/hooks/useSectionToggle'
import { uploadFileFromInput } from '~/utils/upload'
import { Modal } from '~/components/Modal'
import type { MixRow } from '~/types/database'

export const Route = createFileRoute('/_dashboard/dashboard/music')({
  loader: async () => {
    const [mixes, categories, profile] = await Promise.all([getMixes(), getMixCategories(), getProfile()])
    return { mixes, categories, mixCategoryOrder: profile?.mix_category_order ?? [] }
  },
  component: MusicEditor,
})

const modalSchema = mixUpsertSchema.omit({ sort_order: true, thumbnail_url: true, platform: true, embed_html: true })

function MusicEditor() {
  const { mixes: initialMixes, categories: initialCategories, mixCategoryOrder: initialCategoryOrder } = Route.useLoaderData()
  const { items: mixes, handleDelete, addItem, setItems: setMixes } = useListEditor(
    initialMixes || [],
    { deleteFn: deleteMix, reorderFn: reorderMixes }
  )
  const [modalItem, setModalItem] = useState<'add' | MixRow | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const sectionToggle = useSectionToggle('music')
  const [sectionSaving, setSectionSaving] = useState(false)
  const [sectionSaved, setSectionSaved] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [categoryOrder, setCategoryOrder] = useState<string[]>(initialCategoryOrder || [])

  const categories = useMemo(() => {
    const fromMixes = mixes.map((m) => m.category).filter(Boolean)
    return [...new Set([...(initialCategories || []), ...fromMixes])].sort()
  }, [mixes, initialCategories])

  // Group mixes by category, sorted within each group by sort_order
  const groupedMixes = useMemo(() => {
    const groups: Record<string, MixRow[]> = {}
    for (const mix of mixes) {
      const cat = mix.category || 'Uncategorized'
      if (!groups[cat]) groups[cat] = []
      groups[cat].push(mix)
    }
    // Sort items within each group by sort_order
    for (const cat in groups) {
      groups[cat].sort((a, b) => a.sort_order - b.sort_order)
    }
    return groups
  }, [mixes])

  // Order categories: stored order first, then any new categories at the end
  const orderedCategories = useMemo(() => {
    const allCats = Object.keys(groupedMixes)
    const ordered: string[] = []
    for (const cat of categoryOrder) {
      if (allCats.includes(cat)) ordered.push(cat)
    }
    for (const cat of allCats.sort()) {
      if (!ordered.includes(cat)) ordered.push(cat)
    }
    return ordered
  }, [groupedMixes, categoryOrder])

  const { register, handleSubmit, formState: { errors }, reset } = useForm<MixUpsert>({
    resolver: zodResolver(modalSchema),
  })

  const openModal = (item: 'add' | MixRow) => {
    if (item === 'add') {
      reset({ title: '', url: '', category: '', description: '', image_url: '' })
      setImagePreview(null)
    } else {
      reset({
        id: item.id,
        title: item.title,
        url: item.url,
        category: item.category,
        description: item.description || '',
        image_url: item.image_url || '',
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
      const result = await uploadFileFromInput(file, 'mixes')
      if (result) imageUrl = result.url
    }

    const isEditing = modalItem !== 'add' && modalItem !== null
    const currentMix = isEditing ? modalItem : null
    const urlChanged = !currentMix || currentMix.url !== data.url

    // Resolve oEmbed if URL changed or new mix
    let platform = currentMix?.platform ?? null
    let embed_html = currentMix?.embed_html ?? null
    if (urlChanged) {
      const embed = await resolveEmbed({ data: { url: data.url } })
      platform = embed.platform
      embed_html = embed.embedHtml
    }

    const payload: Record<string, unknown> = {
      ...data,
      image_url: imageUrl || null,
      platform,
      embed_html,
    }

    if (!isEditing) {
      // Per-category sort_order: count items in the selected category
      const categoryItems = groupedMixes[data.category] || []
      payload.sort_order = categoryItems.length
    }

    const result = await upsertMix({ data: payload as MixUpsert })
    if ('mix' in result && result.mix) {
      if (isEditing) {
        setMixes((prev) => prev.map((m) => (m.id === result.mix.id ? result.mix : m)))
      } else {
        addItem(result.mix)
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
    const catItems = groupedMixes[category]
    if (!catItems) return
    const swapIndex = direction === 'up' ? indexInCategory - 1 : indexInCategory + 1
    if (swapIndex < 0 || swapIndex >= catItems.length) return

    const itemA = catItems[indexInCategory]
    const itemB = catItems[swapIndex]

    // Optimistic update
    setMixes((prev) => {
      const next = [...prev]
      const idxA = next.findIndex((m) => m.id === itemA.id)
      const idxB = next.findIndex((m) => m.id === itemB.id)
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
    await reorderMixes({ data: { ids: reorderedCatItems.map((m) => m.id) } })
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
    await updateProfile({ data: { mix_category_order: newOrder } })
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
        <DashboardHeader title="Music / Mixes" saving={sectionSaving} saved={sectionSaved} error="" isDirty={sectionToggle.isDirty} sectionEnabled={sectionToggle.enabled} onToggleSection={sectionToggle.toggle} />
      </form>

      {/* Add button */}
      <div className="mb-6">
        <button type="button" onClick={() => openModal('add')} className={BTN_PRIMARY}>
          + Add Mix
        </button>
      </div>

      {/* Category datalist */}
      <datalist id="mix-categories">
        {categories.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>

      {/* Mix List — grouped by category */}
      {mixes.length === 0 ? (
        <p className="text-text-secondary text-sm">No mixes yet. Add one above.</p>
      ) : (
        <div className="space-y-6">
          {orderedCategories.map((category, catIndex) => {
            const catMixes = groupedMixes[category]
            if (!catMixes || catMixes.length === 0) return null
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
                      ({catMixes.length})
                    </span>
                  </h3>
                </div>

                {/* Items in this category */}
                <div className="space-y-3 ml-8">
                  {catMixes.map((mix, index) => (
                    <div
                      key={mix.id}
                      className="bg-white border border-border p-4 flex items-center gap-4"
                    >
                      <ReorderButtons
                        index={index}
                        total={catMixes.length}
                        onReorder={(i, dir) => handleItemReorder(category, i, dir)}
                      />

                      {/* Thumbnail */}
                      {(mix.thumbnail_url || mix.image_url) && (
                        <img
                          src={mix.thumbnail_url || mix.image_url || ''}
                          alt=""
                          className="w-10 h-10 object-cover shrink-0"
                        />
                      )}

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-text-primary truncate">{mix.title}</p>
                        <p className="text-xs text-text-secondary truncate">{mix.url}</p>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => openModal(mix)}
                          className={`${BTN_BASE} bg-bg text-text-primary hover:bg-border`}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(mix.id)}
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
        title={modalItem === 'add' ? 'Add Mix' : 'Edit Mix'}
      >
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className={FORM_LABEL}>Title</label>
            <input
              type="text"
              placeholder="Mix title"
              {...register('title')}
              className={errors.title ? FORM_INPUT_ERROR : FORM_INPUT}
            />
            {errors.title && <p className={FORM_ERROR_MSG}>{errors.title.message}</p>}
          </div>

          <div>
            <label className={FORM_LABEL}>URL</label>
            <input
              type="url"
              placeholder="https://soundcloud.com/..."
              {...register('url')}
              className={errors.url ? FORM_INPUT_ERROR : FORM_INPUT}
            />
            {errors.url && <p className={FORM_ERROR_MSG}>{errors.url.message}</p>}
          </div>

          <div>
            <label className={FORM_LABEL}>Category</label>
            <input
              type="text"
              placeholder="e.g. Deep House"
              list="mix-categories"
              {...register('category')}
              className={errors.category ? FORM_INPUT_ERROR : FORM_INPUT}
            />
            {errors.category && <p className={FORM_ERROR_MSG}>{errors.category.message}</p>}
          </div>

          <div>
            <label className={FORM_LABEL}>Description (optional)</label>
            <textarea
              placeholder="Short description of this mix"
              rows={3}
              {...register('description')}
              className={FORM_INPUT}
            />
          </div>

          <div>
            <label className={FORM_LABEL}>Image (optional)</label>
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
