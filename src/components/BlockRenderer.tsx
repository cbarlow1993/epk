import type { OutputData } from '@editorjs/editorjs'
import { sanitize } from '~/utils/sanitize'

interface BlockRendererProps {
  data: OutputData | null
  className?: string
}

export function BlockRenderer({ data, className }: BlockRendererProps) {
  if (!data || !data.blocks || data.blocks.length === 0) return null

  return (
    <div className={className}>
      {data.blocks.map((block, index) => (
        <Block key={block.id || `block-${index}`} block={block} />
      ))}
    </div>
  )
}

function Block({ block }: { block: OutputData['blocks'][number] }) {
  const tunes = block.tunes as Record<string, Record<string, unknown>> | undefined
  const variant = tunes?.textVariant?.alignment as string | undefined

  const inner = (() => {
    switch (block.type) {
      case 'paragraph':
        return <Paragraph data={block.data} />
      case 'header':
        return <Header data={block.data} />
      case 'list':
        return <ListBlock data={block.data} />
      case 'quote':
        return <Quote data={block.data} />
      case 'delimiter':
        return <hr className="my-6 border-current opacity-20" />
      case 'image':
        return <ImageBlock data={block.data} />
      case 'embed':
        return <EmbedBlock data={block.data} />
      case 'attaches':
        return <AttachesBlock data={block.data} />
      case 'table':
        return <TableBlock data={block.data} />
      case 'columns':
        return <ColumnsBlock data={block.data} />
      default:
        return null
    }
  })()

  if (!inner) return null

  if (variant === 'call-out') {
    return <div className="bio-callout">{inner}</div>
  }
  if (variant === 'citation') {
    return <div className="bio-citation">{inner}</div>
  }
  if (variant === 'details') {
    return <details className="bio-details"><summary>Details</summary>{inner}</details>
  }

  return inner
}

function Paragraph({ data }: { data: Record<string, unknown> }) {
  const text = typeof data.text === 'string' ? data.text : ''
  if (!text) return null
  // All inline HTML is sanitized through sanitize-html with strict allowlist
  return <p dangerouslySetInnerHTML={{ __html: sanitize(text) }} />
}

function Header({ data }: { data: Record<string, unknown> }) {
  const text = typeof data.text === 'string' ? data.text : ''
  const level = typeof data.level === 'number' ? data.level : 2
  const Tag = `h${Math.min(Math.max(level, 2), 4)}` as 'h2' | 'h3' | 'h4'
  return <Tag dangerouslySetInnerHTML={{ __html: sanitize(text) }} />
}

interface NestedListItem {
  content: string
  items?: NestedListItem[]
}

function ListItems({ items, style }: { items: unknown[]; style: 'ordered' | 'unordered' }) {
  const Tag = style === 'ordered' ? 'ol' : 'ul'
  return (
    <Tag className={style === 'ordered' ? 'list-decimal pl-6' : 'list-disc pl-6'}>
      {items.map((item: unknown, i: number) => {
        const content = typeof item === 'string' ? item : (item as NestedListItem)?.content
        const children = typeof item === 'object' && item !== null ? (item as NestedListItem).items : undefined
        if (typeof content !== 'string') return null
        return (
          <li key={i}>
            <span dangerouslySetInnerHTML={{ __html: sanitize(content) }} />
            {children && children.length > 0 && <ListItems items={children} style={style} />}
          </li>
        )
      })}
    </Tag>
  )
}

function ListBlock({ data }: { data: Record<string, unknown> }) {
  const items = Array.isArray(data.items) ? data.items : []
  const style = data.style === 'ordered' ? 'ordered' : 'unordered'
  return <ListItems items={items} style={style} />
}

function Quote({ data }: { data: Record<string, unknown> }) {
  const text = typeof data.text === 'string' ? data.text : ''
  const caption = typeof data.caption === 'string' ? data.caption : ''
  return (
    <blockquote className="border-l-4 border-current/20 pl-4 my-4 italic">
      <p dangerouslySetInnerHTML={{ __html: sanitize(text) }} />
      {caption && (
        <cite className="block mt-2 text-sm not-italic opacity-60"
          dangerouslySetInnerHTML={{ __html: sanitize(caption) }}
        />
      )}
    </blockquote>
  )
}

function ImageBlock({ data }: { data: Record<string, unknown> }) {
  const file = data.file as Record<string, unknown> | undefined
  const url = typeof file?.url === 'string' ? file.url : ''
  const caption = typeof data.caption === 'string' ? data.caption : ''
  const stretched = data.stretched === true

  if (!url) return null

  return (
    <figure className={`my-4 ${stretched ? 'w-full' : ''}`}>
      <img src={url} alt={caption || ''} className="w-full" loading="lazy" />
      {caption && (
        <figcaption className="mt-2 text-sm opacity-60 text-center"
          dangerouslySetInnerHTML={{ __html: sanitize(caption) }}
        />
      )}
    </figure>
  )
}

const ALLOWED_EMBED_HOSTS = new Set([
  'www.youtube.com',
  'www.youtube-nocookie.com',
  'w.soundcloud.com',
  'www.mixcloud.com',
  'open.spotify.com',
  'bandcamp.com',
])

function isAllowedEmbedUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:' && ALLOWED_EMBED_HOSTS.has(parsed.hostname)
  } catch {
    return false
  }
}

function EmbedBlock({ data }: { data: Record<string, unknown> }) {
  const embed = typeof data.embed === 'string' ? data.embed : ''
  const caption = typeof data.caption === 'string' ? data.caption : ''
  const height = typeof data.height === 'number' ? data.height : 300

  if (!embed || !isAllowedEmbedUrl(embed)) return null

  return (
    <figure className="my-4">
      <iframe
        src={embed}
        height={height}
        className="w-full border-0"
        sandbox="allow-scripts allow-same-origin allow-popups"
        loading="lazy"
        title={caption || 'Embedded content'}
      />
      {caption && (
        <figcaption className="mt-2 text-sm opacity-60 text-center"
          dangerouslySetInnerHTML={{ __html: sanitize(caption) }}
        />
      )}
    </figure>
  )
}

function AttachesBlock({ data }: { data: Record<string, unknown> }) {
  const file = data.file as Record<string, unknown> | undefined
  const url = typeof file?.url === 'string' ? file.url : ''
  const name = typeof data.title === 'string' ? data.title : (typeof file?.name === 'string' ? file.name : 'Download')
  const size = typeof file?.size === 'number' ? file.size : 0

  if (!url) return null

  const sizeLabel = size > 0
    ? size > 1048576
      ? `${(size / 1048576).toFixed(1)} MB`
      : `${(size / 1024).toFixed(0)} KB`
    : ''

  return (
    <a
      href={url}
      download
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 my-3 px-4 py-3 border border-current/10 hover:border-current/30 transition-colors"
    >
      <span className="text-sm font-medium">{name}</span>
      {sizeLabel && <span className="text-xs opacity-50">{sizeLabel}</span>}
    </a>
  )
}

function ColumnsBlock({ data }: { data: Record<string, unknown> }) {
  const cols = Array.isArray(data.cols) ? data.cols : []
  if (cols.length === 0) return null

  const mdCols = cols.length >= 3 ? 'md:grid-cols-3' : 'md:grid-cols-2'

  return (
    <div className={`my-4 grid grid-cols-1 ${mdCols} gap-6`}>
      {cols.map((col: unknown, i: number) => {
        const colData = col as Record<string, unknown> | null
        if (!colData || !Array.isArray(colData.blocks)) return null
        return (
          <div key={i}>
            <BlockRenderer data={colData as unknown as OutputData} />
          </div>
        )
      })}
    </div>
  )
}

function TableBlock({ data }: { data: Record<string, unknown> }) {
  const content = Array.isArray(data.content) ? data.content : []
  const withHeadings = data.withHeadings === true

  if (content.length === 0) return null

  return (
    <div className="my-4 overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        {withHeadings && content.length > 0 && (
          <thead>
            <tr>
              {(content[0] as string[]).map((cell: string, i: number) => (
                <th key={i} className="border border-current/10 px-3 py-2 text-left font-semibold"
                  dangerouslySetInnerHTML={{ __html: sanitize(cell) }}
                />
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {content.slice(withHeadings ? 1 : 0).map((row: unknown, rowIdx: number) => (
            <tr key={rowIdx}>
              {Array.isArray(row) && row.map((cell: string, cellIdx: number) => (
                <td key={cellIdx} className="border border-current/10 px-3 py-2"
                  dangerouslySetInnerHTML={{ __html: sanitize(cell) }}
                />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

