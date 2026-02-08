interface DashboardHeaderProps {
  title: string
  saving: boolean
  saved: boolean
  error: string
  isDirty: boolean
  sectionEnabled?: boolean
  onToggleSection?: () => void
}

export function DashboardHeader({ title, saving, saved, error, isDirty, sectionEnabled, onToggleSection }: DashboardHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-8 pb-6 border-b border-border">
      <div className="flex items-center gap-4">
        <h1 className="font-display font-extrabold text-2xl tracking-tight uppercase">{title}</h1>
        {onToggleSection !== undefined && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onToggleSection}
              className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
                sectionEnabled ? 'bg-accent' : 'bg-text-secondary/30'
              }`}
              aria-label={sectionEnabled ? `Disable ${title} section` : `Enable ${title} section`}
            >
              <span
                className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
                  sectionEnabled ? 'translate-x-[18px]' : 'translate-x-[3px]'
                }`}
              />
            </button>
            <span className={`text-xs font-medium uppercase tracking-wider ${sectionEnabled ? 'text-accent' : 'text-text-secondary'}`}>
              {sectionEnabled ? 'Enabled' : 'Disabled'}
            </span>
          </div>
        )}
      </div>
      <div className="flex items-center gap-3">
        {saved && <span className="text-xs font-semibold uppercase tracking-wider text-green-600">Saved</span>}
        {error && <span className="text-xs text-red-500">{error}</span>}
        <button
          type="submit"
          disabled={saving || !isDirty}
          className="px-6 py-2 text-xs font-semibold uppercase tracking-wider bg-text-primary text-white hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  )
}
