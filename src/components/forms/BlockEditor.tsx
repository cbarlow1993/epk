import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import type EditorJS from '@editorjs/editorjs'
import type { OutputData } from '@editorjs/editorjs'
import { FORM_LABEL } from './styles'

export interface BlockEditorHandle {
  save: () => Promise<OutputData>
}

interface BlockEditorProps {
  label: string
  defaultData: OutputData | null
  placeholder?: string
  onWordCount?: (count: number) => void
}

function countWords(data: OutputData | null): number {
  if (!data?.blocks) return 0
  let text = ''
  for (const block of data.blocks) {
    if (typeof block.data?.text === 'string') text += ' ' + block.data.text
    if (typeof block.data?.caption === 'string') text += ' ' + block.data.caption
    if (Array.isArray(block.data?.items)) {
      const extractItems = (items: unknown[]): void => {
        for (const item of items) {
          if (typeof item === 'string') text += ' ' + item
          else if (item && typeof item === 'object') {
            const obj = item as Record<string, unknown>
            if (typeof obj.content === 'string') text += ' ' + obj.content
            if (Array.isArray(obj.items)) extractItems(obj.items)
          }
        }
      }
      extractItems(block.data.items)
    }
  }
  // Strip HTML tags, then count words
  const plain = text.replace(/<[^>]*>/g, ' ').trim()
  return plain ? plain.split(/\s+/).length : 0
}

export const BlockEditor = forwardRef<BlockEditorHandle, BlockEditorProps>(
  function BlockEditor({ label, defaultData, placeholder, onWordCount }, ref) {
    const editorRef = useRef<EditorJS | null>(null)
    const holderRef = useRef<HTMLDivElement>(null)
    const [mounted, setMounted] = useState(false)

    useImperativeHandle(ref, () => ({
      async save() {
        if (!editorRef.current) {
          const fallback = defaultData || { time: Date.now(), blocks: [], version: '2.28.0' }
          onWordCount?.(countWords(fallback))
          return fallback
        }
        const output = await editorRef.current.save()
        onWordCount?.(countWords(output))
        return output
      },
    }))

    // SSR guard: only render editor on client
    useEffect(() => {
      setMounted(true)
    }, [])

    useEffect(() => {
      if (!mounted || !holderRef.current) return

      let cancelled = false
      let editorInstance: EditorJS | null = null

      async function init() {
        try {
          const [
            { default: EditorJSClass },
            { default: Header },
            { default: NestedList },
            { default: Quote },
            { default: Delimiter },
            { default: ImageTool },
            { default: Embed },
            { default: AttachesTool },
            { default: Table },
            { default: Columns },
            { default: TextVariantTune },
          ] = await Promise.all([
            import('@editorjs/editorjs'),
            import('@editorjs/header'),
            import('@editorjs/nested-list'),
            import('@editorjs/quote'),
            import('@editorjs/delimiter'),
            import('@editorjs/image'),
            import('@editorjs/embed'),
            import('@editorjs/attaches'),
            import('@editorjs/table'),
            import('@calumk/editorjs-columns'),
            import('@editorjs/text-variant-tune'),
          ])

          if (cancelled) return

          // Clear leftover DOM from previous unmounted editor instance (React Strict Mode)
          const holder = holderRef.current
          if (holder) {
            while (holder.firstChild) holder.removeChild(holder.firstChild)
          }

          // Tools available inside columns (no columns inside columns to avoid recursion)
          const columnTools = {
            header: {
              class: Header as unknown as EditorJS.BlockToolConstructable,
              config: { levels: [2, 3, 4], defaultLevel: 2 },
            },
            list: {
              class: NestedList as unknown as EditorJS.BlockToolConstructable,
              inlineToolbar: true,
            },
            quote: {
              class: Quote as unknown as EditorJS.BlockToolConstructable,
              inlineToolbar: true,
            },
            delimiter: Delimiter as unknown as EditorJS.BlockToolConstructable,
            image: {
              class: ImageTool as unknown as EditorJS.BlockToolConstructable,
              config: {
                uploader: {
                  async uploadByFile(file: Blob) {
                    const formData = new FormData()
                    formData.append('file', file)
                    formData.append('type', 'image')
                    const res = await fetch('/api/upload', { method: 'POST', body: formData })
                    return res.json()
                  },
                },
              },
            },
            embed: {
              class: Embed as unknown as EditorJS.BlockToolConstructable,
              config: {
                services: {
                  youtube: true,
                  soundcloud: true,
                  mixcloud: {
                    regex: /https?:\/\/www\.mixcloud\.com\/([^/]+\/[^/]+)\/?/,
                    embedUrl: 'https://www.mixcloud.com/widget/iframe/?feed=/<%= remote_id %>',
                    html: '<iframe height="120" scrolling="no" frameborder="no" allow="autoplay"></iframe>',
                    id: (groups: string[]) => groups[0],
                  },
                },
              },
            },
            attaches: {
              class: AttachesTool as unknown as EditorJS.BlockToolConstructable,
              config: {
                uploader: {
                  async uploadByFile(file: File) {
                    const formData = new FormData()
                    formData.append('file', file)
                    formData.append('type', 'attachment')
                    const res = await fetch('/api/upload', { method: 'POST', body: formData })
                    return res.json()
                  },
                },
              },
            },
            table: {
              class: Table as unknown as EditorJS.BlockToolConstructable,
              inlineToolbar: true,
            },
          }

          editorInstance = new EditorJSClass({
            holder: holder!,
            placeholder: placeholder || 'Start writing...',
            data: defaultData || undefined,
            tools: {
              ...columnTools,
              columns: {
                class: Columns as unknown as EditorJS.BlockToolConstructable,
                config: {
                  EditorJsLibrary: EditorJSClass,
                  tools: columnTools,
                },
              },
              textVariant: TextVariantTune as unknown as EditorJS.BlockToolConstructable,
            },
            tunes: ['textVariant'],
          })

          await editorInstance.isReady

          if (cancelled) {
            editorInstance.destroy()
            return
          }

          editorRef.current = editorInstance

          // Report initial word count
          if (onWordCount && defaultData) {
            onWordCount(countWords(defaultData))
          }
        } catch (err) {
          console.error('BlockEditor: failed to initialize Editor.js', err)
        }
      }

      init()

      return () => {
        cancelled = true
        if (editorRef.current) {
          editorRef.current.destroy()
          editorRef.current = null
        } else if (editorInstance) {
          editorInstance.isReady.then(() => editorInstance?.destroy()).catch(() => {})
        }
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mounted])

    return (
      <div>
        {label && <label className={FORM_LABEL}>{label}</label>}
        <div
          ref={holderRef}
          className="border border-text-primary/20 bg-white min-h-[200px] px-4 py-3 [&_.ce-block__content]:max-w-none [&_.ce-toolbar__content]:max-w-none"
        />
      </div>
    )
  },
)
