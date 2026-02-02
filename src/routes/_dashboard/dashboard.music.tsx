import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { getMixes, upsertMix, deleteMix, reorderMixes } from '~/server/mixes'

export const Route = createFileRoute('/_dashboard/dashboard/music')({
  loader: () => getMixes(),
  component: MusicEditor,
})

const CATEGORIES = [
  { value: 'commercial', label: 'Commercial' },
  { value: 'melodic', label: 'Melodic' },
  { value: 'progressive', label: 'Progressive' },
  { value: 'tech-house', label: 'Tech House' },
  { value: 'deep-house', label: 'Deep House' },
  { value: 'other', label: 'Other' },
]

function MusicEditor() {
  const initialMixes = Route.useLoaderData()
  const [mixes, setMixes] = useState(initialMixes || [])
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [category, setCategory] = useState('commercial')
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editUrl, setEditUrl] = useState('')
  const [editCategory, setEditCategory] = useState('')

  const handleAdd = async () => {
    if (!title.trim() || !url.trim()) return
    setAdding(true)
    const result = await upsertMix({ data: { title, url, category, sort_order: mixes.length } })
    if ('mix' in result && result.mix) {
      setMixes([...mixes, result.mix])
      setTitle('')
      setUrl('')
      setCategory('commercial')
    }
    setAdding(false)
  }

  const handleDelete = async (id: string) => {
    await deleteMix({ data: id })
    setMixes(mixes.filter((m: any) => m.id !== id))
  }

  const handleEdit = (mix: any) => {
    setEditingId(mix.id)
    setEditTitle(mix.title)
    setEditUrl(mix.url)
    setEditCategory(mix.category)
  }

  const handleSaveEdit = async (id: string) => {
    const result = await upsertMix({ data: { id, title: editTitle, url: editUrl, category: editCategory } })
    if ('mix' in result && result.mix) {
      setMixes(mixes.map((m: any) => (m.id === id ? result.mix : m)))
    }
    setEditingId(null)
  }

  const handleReorder = async (index: number, direction: 'up' | 'down') => {
    const swapIndex = direction === 'up' ? index - 1 : index + 1
    if (swapIndex < 0 || swapIndex >= mixes.length) return
    const reordered = [...mixes]
    const temp = reordered[index]
    reordered[index] = reordered[swapIndex]
    reordered[swapIndex] = temp
    setMixes(reordered)
    await reorderMixes({ data: { ids: reordered.map((m: any) => m.id) } })
  }

  const inputClass =
    'w-full bg-dark-card border border-white/10 rounded-lg px-4 py-3 text-white placeholder-text-secondary/50 focus:border-accent focus:outline-none transition-colors text-sm'
  const btnClass =
    'px-4 py-2 rounded-lg text-sm font-bold uppercase tracking-wider transition-colors'

  return (
    <div>
      <h1 className="text-2xl font-black uppercase tracking-wider mb-8">Music / Mixes</h1>

      {/* Add Form */}
      <div className="bg-dark-card border border-white/10 rounded-xl p-6 mb-8">
        <h2 className="text-sm uppercase tracking-widest font-bold mb-4">Add Mix</h2>
        <div className="grid md:grid-cols-3 gap-4 mb-4">
          <input
            type="text"
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={inputClass}
          />
          <input
            type="url"
            placeholder="URL (SoundCloud, Mixcloud, etc.)"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className={inputClass}
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className={inputClass}
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={handleAdd}
          disabled={adding || !title.trim() || !url.trim()}
          className={`${btnClass} bg-accent text-black hover:bg-accent/80 disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {adding ? 'Adding...' : 'Add Mix'}
        </button>
      </div>

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
              <div className="flex flex-col gap-1">
                <button
                  onClick={() => handleReorder(index, 'up')}
                  disabled={index === 0}
                  className="text-xs text-text-secondary hover:text-white disabled:opacity-20 transition-colors"
                  title="Move up"
                >
                  &#9650;
                </button>
                <button
                  onClick={() => handleReorder(index, 'down')}
                  disabled={index === mixes.length - 1}
                  className="text-xs text-text-secondary hover:text-white disabled:opacity-20 transition-colors"
                  title="Move down"
                >
                  &#9660;
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                {editingId === mix.id ? (
                  <div className="grid md:grid-cols-3 gap-3">
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className={inputClass}
                    />
                    <input
                      type="url"
                      value={editUrl}
                      onChange={(e) => setEditUrl(e.target.value)}
                      className={inputClass}
                    />
                    <select
                      value={editCategory}
                      onChange={(e) => setEditCategory(e.target.value)}
                      className={inputClass}
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
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
                      className={`${btnClass} bg-accent text-black hover:bg-accent/80`}
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className={`${btnClass} bg-white/10 text-white hover:bg-white/20`}
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => handleEdit(mix)}
                      className={`${btnClass} bg-white/10 text-white hover:bg-white/20`}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(mix.id)}
                      className={`${btnClass} bg-red-500/20 text-red-400 hover:bg-red-500/30`}
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
