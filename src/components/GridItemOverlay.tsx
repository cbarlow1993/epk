interface GridItemOverlayProps {
  label: string
  index: number
  total: number
  onReorder: (index: number, direction: 'up' | 'down') => void
  onDelete: () => void
  children?: React.ReactNode
}

const OVERLAY_BTN = 'w-8 h-8 flex items-center justify-center rounded bg-white/10 text-white hover:bg-white/20 disabled:opacity-20 transition-colors text-xs'

export function GridItemOverlay({ label, index, total, onReorder, onDelete, children }: GridItemOverlayProps) {
  return (
    <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
      <p className="text-white text-xs font-bold uppercase tracking-wider text-center px-2 truncate w-full">
        {label}
      </p>
      {children}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onReorder(index, 'up')}
          disabled={index === 0}
          className={OVERLAY_BTN}
          title="Move up"
        >
          &#9650;
        </button>
        <button
          type="button"
          onClick={() => onReorder(index, 'down')}
          disabled={index === total - 1}
          className={OVERLAY_BTN}
          title="Move down"
        >
          &#9660;
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="w-8 h-8 flex items-center justify-center rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors text-xs"
          title="Delete"
        >
          &#10005;
        </button>
      </div>
    </div>
  )
}
