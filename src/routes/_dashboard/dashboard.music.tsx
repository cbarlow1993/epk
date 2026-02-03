import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { getMixes, upsertMix, deleteMix, reorderMixes } from '~/server/mixes'
import { mixUpsertSchema, MIX_CATEGORIES, type MixUpsert } from '~/schemas/mix'
import { FORM_INPUT, FORM_INPUT_ERROR, BTN_BASE } from '~/components/forms'
import { useListEditor } from '~/hooks/useListEditor'
import { ReorderButtons } from '~/components/ReorderButtons'

export const Route = createFileRoute('/_dashboard/dashboard/music')({
  loader: () => getMixes(),
  component: MusicEditor,
})

const CATEGORY_OPTIONS = MIX_CATEGORIES.map((c) => ({
  value: c,
  label: c.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
}))

function MusicEditor() {
  const initialMixes = Route.useLoaderData()
  const { items: mixes, handleDelete, handleReorder, addItem, setItems: setMixes } = useListEditor(
    initialMixes || [],
    { deleteFn: deleteMix, reorderFn: reorderMixes }
  )
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editUrl, setEditUrl] = useState('')
  const [editCategory, setEditCategory] = useState('')

  const { register, handleSubmit, formState: { errors }, reset } = useForm<MixUpsert>({
    resolver: zodResolver(mixUpsertSchema.omit({ id: true, sort_order: true, thumbnail_url: true })),
    defaultValues: { title: '', url: '', category: 'commercial' },
  })

  const onAdd = handleSubmit(async (data) => {
    setAdding(true)
    const result = await upsertMix({ data: { ...data, sort_order: mixes.length } })
    if ('mix' in result && result.mix) {
      addItem(result.mix)
      reset()
    }
    setAdding(false)
  })

  const handleEdit = (mix: any) => {
    setEditingId(mix.id)
    setEditTitle(mix.title)
    setEditUrl(mix.url)
    setEditCategory(mix.category)
  }

  const handleSaveEdit = async (id: string) => {
    const result = await upsertMix({ data: { id, title: editTitle, url: editUrl, category: editCategory as any } })
    if ('mix' in result && result.mix) {
      setMixes(prev => prev.map((m: any) => (m.id === id ? result.mix : m)))
    }
    setEditingId(null)
  }


  return (
    <div>
      <h1 className="text-2xl font-black uppercase tracking-wider mb-8">Music / Mixes</h1>

      {/* Add Form */}
      <form onSubmit={onAdd} className="bg-dark-card border border-white/10 rounded-xl p-6 mb-8">
        <h2 className="text-sm uppercase tracking-widest font-bold mb-4">Add Mix</h2>
        <div className="grid md:grid-cols-3 gap-4 mb-2">
          <div>
            <input
              type="text"
              placeholder="Title"
              {...register('title')}
              className={errors.title ? FORM_INPUT_ERROR : FORM_INPUT}
            />
            {errors.title && <p className="text-xs text-red-400 mt-1">{errors.title.message}</p>}
          </div>
          <div>
            <input
              type="url"
              placeholder="URL (SoundCloud, Mixcloud, etc.)"
              {...register('url')}
              className={errors.url ? FORM_INPUT_ERROR : FORM_INPUT}
            />
            {errors.url && <p className="text-xs text-red-400 mt-1">{errors.url.message}</p>}
          </div>
          <div>
            <select {...register('category')} className={FORM_INPUT}>
              {CATEGORY_OPTIONS.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
            {errors.category && <p className="text-xs text-red-400 mt-1">{errors.category.message}</p>}
          </div>
        </div>
        <button
          type="submit"
          disabled={adding}
          className={`${BTN_BASE} bg-accent text-black hover:bg-accent/80 disabled:opacity-50 disabled:cursor-not-allowed mt-2`}
        >
          {adding ? 'Adding...' : 'Add Mix'}
        </button>
      </form>

      {/* Mix List */}
      {mixes.length === 0 ? (
        <p className="text-text-secondary text-sm">No mixes yet. Add one above.</p>
      ) : (
        <div className="space-y-3">
          {mixes.map((mix: any, index: number) => (
            <div
              key={mix.id}
              className="bg-dark-card border border-white/10 rounded-xl p-4 flex items-center gap-4"
            >
              {/* Reorder Buttons */}
              {handleReorder && <ReorderButtons index={index} total={mixes.length} onReorder={handleReorder} />}

              {/* Content */}
              <div className="flex-1 min-w-0">
                {editingId === mix.id ? (
                  <div className="grid md:grid-cols-3 gap-3">
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className={FORM_INPUT}
                    />
                    <input
                      type="url"
                      value={editUrl}
                      onChange={(e) => setEditUrl(e.target.value)}
                      className={FORM_INPUT}
                    />
                    <select
                      value={editCategory}
                      onChange={(e) => setEditCategory(e.target.value)}
                      className={FORM_INPUT}
                    >
                      {CATEGORY_OPTIONS.map((c) => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <p className="font-bold text-white truncate">{mix.title}</p>
                    <p className="text-xs text-text-secondary truncate">
                      {mix.url}
                      <span className="ml-2 inline-block bg-white/10 rounded px-2 py-0.5 text-[10px] uppercase tracking-wider">
                        {mix.category}
                      </span>
                    </p>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 shrink-0">
                {editingId === mix.id ? (
                  <>
                    <button
                      onClick={() => handleSaveEdit(mix.id)}
                      className={`${BTN_BASE} bg-accent text-black hover:bg-accent/80`}
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className={`${BTN_BASE} bg-white/10 text-white hover:bg-white/20`}
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => handleEdit(mix)}
                      className={`${BTN_BASE} bg-white/10 text-white hover:bg-white/20`}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(mix.id)}
                      className={`${BTN_BASE} bg-red-500/20 text-red-400 hover:bg-red-500/30`}
                    >
                      Delete
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
