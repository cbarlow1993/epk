interface ReorderButtonsProps {
  index: number
  total: number
  onReorder: (index: number, direction: 'up' | 'down') => void
}

export function ReorderButtons({ index, total, onReorder }: ReorderButtonsProps) {
  return (
    <div className="flex flex-col gap-1">
      <button
        onClick={() => onReorder(index, 'up')}
        disabled={index === 0}
        className="text-xs text-text-secondary hover:text-white disabled:opacity-20 transition-colors"
        title="Move up"
      >
        &#9650;
      </button>
      <button
        onClick={() => onReorder(index, 'down')}
        disabled={index === total - 1}
        className="text-xs text-text-secondary hover:text-white disabled:opacity-20 transition-colors"
        title="Move down"
      >
        &#9660;
      </button>
    </div>
  )
}
