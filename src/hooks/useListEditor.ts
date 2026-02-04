import { useState } from 'react'

type ServerResult = { error: string } | Record<string, unknown>
type DeleteFn = (args: { data: string }) => Promise<ServerResult>
type ReorderFn = (args: { data: { ids: string[] } }) => Promise<ServerResult>

export function useListEditor<T extends { id: string }>(
  initialItems: T[],
  opts: { deleteFn: DeleteFn; reorderFn?: ReorderFn }
) {
  const [items, setItems] = useState<T[]>(initialItems)

  const handleDelete = async (id: string) => {
    const prev = items
    setItems(items.filter(item => item.id !== id))
    const result = await opts.deleteFn({ data: id })
    if ('error' in result && typeof result.error === 'string') {
      setItems(prev) // rollback on failure
    }
  }

  const handleReorder = opts.reorderFn
    ? async (index: number, direction: 'up' | 'down') => {
        const swapIndex = direction === 'up' ? index - 1 : index + 1
        if (swapIndex < 0 || swapIndex >= items.length) return
        const reordered = [...items]
        const temp = reordered[index]
        reordered[index] = reordered[swapIndex]
        reordered[swapIndex] = temp
        setItems(reordered)
        await opts.reorderFn!({ data: { ids: reordered.map(item => item.id) } })
      }
    : undefined

  const addItem = (item: T) => setItems(prev => [...prev, item])

  return { items, setItems, handleDelete, handleReorder, addItem }
}
