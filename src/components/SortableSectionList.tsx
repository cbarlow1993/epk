import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

const SECTION_LABELS: Record<string, string> = {
  bio: 'Bio',
  music: 'Music',
  events: 'Events & Brands',
  technical: 'Technical Rider',
  press: 'Press Assets',
  contact: 'Booking Contact',
}

interface SortableItemProps {
  id: string
  visible: boolean
  onToggleVisibility: (id: string) => void
}

function SortableItem({ id, visible, onToggleVisibility }: SortableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 p-3 border border-border bg-white ${isDragging ? 'shadow-lg' : ''}`}
    >
      <button
        type="button"
        className="cursor-grab active:cursor-grabbing text-text-secondary hover:text-text-primary"
        {...attributes}
        {...listeners}
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path d="M7 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" />
        </svg>
      </button>
      <span className="flex-1 text-sm font-medium">{SECTION_LABELS[id] || id}</span>
      <label className="flex items-center gap-2 text-xs text-text-secondary">
        <input
          type="checkbox"
          checked={visible}
          onChange={() => onToggleVisibility(id)}
          className="w-4 h-4 accent-accent"
        />
        {visible ? 'Visible' : 'Hidden'}
      </label>
    </div>
  )
}

interface SortableSectionListProps {
  order: string[]
  visibility: Record<string, boolean>
  onOrderChange: (newOrder: string[]) => void
  onVisibilityChange: (newVisibility: Record<string, boolean>) => void
}

export function SortableSectionList({
  order,
  visibility,
  onOrderChange,
  onVisibilityChange,
}: SortableSectionListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      const oldIndex = order.indexOf(active.id as string)
      const newIndex = order.indexOf(over.id as string)
      onOrderChange(arrayMove(order, oldIndex, newIndex))
    }
  }

  const toggleVisibility = (id: string) => {
    onVisibilityChange({ ...visibility, [id]: !visibility[id] })
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={order} strategy={verticalListSortingStrategy}>
        <div className="space-y-1">
          {order.map((id) => (
            <SortableItem
              key={id}
              id={id}
              visible={visibility[id] !== false}
              onToggleVisibility={toggleVisibility}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}
