import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { getSocialLinks, upsertSocialLink, deleteSocialLink, reorderSocialLinks } from '~/server/social-links'

export const Route = createFileRoute('/_dashboard/dashboard/socials')({
  loader: () => getSocialLinks(),
  component: SocialsEditor,
})

const PLATFORMS = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'soundcloud', label: 'SoundCloud' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'twitter', label: 'Twitter' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'spotify', label: 'Spotify' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'mixcloud', label: 'Mixcloud' },
  { value: 'other', label: 'Other' },
]

function SocialsEditor() {
  const initialLinks = Route.useLoaderData()
  const [links, setLinks] = useState(initialLinks || [])
  const [platform, setPlatform] = useState('instagram')
  const [url, setUrl] = useState('')
  const [handle, setHandle] = useState('')
  const [adding, setAdding] = useState(false)

  const handleAdd = async () => {
    if (!url.trim()) return
    setAdding(true)
    const result = await upsertSocialLink({
      data: { platform, url, handle, sort_order: links.length },
    })
    if ('link' in result && result.link) {
      setLinks([...links, result.link])
      setPlatform('instagram')
      setUrl('')
      setHandle('')
    }
    setAdding(false)
  }

  const handleDelete = async (id: string) => {
    await deleteSocialLink({ data: id })
    setLinks(links.filter((l: any) => l.id !== id))
  }

  const handleReorder = async (index: number, direction: 'up' | 'down') => {
    const swapIndex = direction === 'up' ? index - 1 : index + 1
    if (swapIndex < 0 || swapIndex >= links.length) return
    const reordered = [...links]
    const temp = reordered[index]
    reordered[index] = reordered[swapIndex]
    reordered[swapIndex] = temp
    setLinks(reordered)
    await reorderSocialLinks({ data: { ids: reordered.map((l: any) => l.id) } })
  }

  const getPlatformLabel = (value: string) => {
    const p = PLATFORMS.find((p) => p.value === value)
    return p ? p.label : value
  }

  const inputClass =
    'w-full bg-dark-card border border-white/10 rounded-lg px-4 py-3 text-white placeholder-text-secondary/50 focus:border-accent focus:outline-none transition-colors text-sm'
  const btnClass =
    'px-4 py-2 rounded-lg text-sm font-bold uppercase tracking-wider transition-colors'

  return (
    <div>
      <h1 className="text-2xl font-black uppercase tracking-wider mb-8">Social Links</h1>

      {/* Add Form */}
      <div className="bg-dark-card border border-white/10 rounded-xl p-6 mb-8">
        <h2 className="text-sm uppercase tracking-widest font-bold mb-4">Add Social Link</h2>
        <div className="grid md:grid-cols-3 gap-4 mb-4">
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            className={inputClass}
          >
            {PLATFORMS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
          <input
            type="url"
            placeholder="URL (e.g. https://instagram.com/...)"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className={inputClass}
          />
          <input
            type="text"
            placeholder="@username"
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            className={inputClass}
          />
        </div>
        <button
          onClick={handleAdd}
          disabled={adding || !url.trim()}
          className={`${btnClass} bg-accent text-black hover:bg-accent/80 disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {adding ? 'Adding...' : 'Add'}
        </button>
      </div>

      {/* Links List */}
      {links.length === 0 ? (
        <p className="text-text-secondary text-sm">No social links yet. Add one above.</p>
      ) : (
        <div className="space-y-3">
          {links.map((link: any, index: number) => (
            <div
              key={link.id}
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
                  disabled={index === links.length - 1}
                  className="text-xs text-text-secondary hover:text-white disabled:opacity-20 transition-colors"
                  title="Move down"
                >
                  &#9660;
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="font-bold text-white truncate">{getPlatformLabel(link.platform)}</p>
                <p className="text-xs text-text-secondary truncate">
                  {link.handle && <span className="mr-2">{link.handle}</span>}
                  {link.url}
                </p>
              </div>

              {/* Delete */}
              <button
                onClick={() => handleDelete(link.id)}
                className={`${btnClass} bg-red-500/20 text-red-400 hover:bg-red-500/30`}
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
