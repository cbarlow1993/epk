import { useEffect, useRef } from 'react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}

export function Modal({ open, onClose, title, children }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) {
      dialog.showModal()
    } else if (!open && dialog.open) {
      dialog.close()
    }
  }, [open])

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === dialogRef.current) onClose()
      }}
      className="backdrop:bg-black/50 bg-transparent p-0 m-auto max-w-lg w-full"
    >
      <div className="bg-white border border-border p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-text-primary">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-text-secondary hover:text-text-primary transition-colors text-lg leading-none"
          >
            &#10005;
          </button>
        </div>
        {children}
      </div>
    </dialog>
  )
}
