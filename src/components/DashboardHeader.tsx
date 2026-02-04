interface DashboardHeaderProps {
  title: string
  saving: boolean
  saved: boolean
  error: string
  isDirty: boolean
}

export function DashboardHeader({ title, saving, saved, error, isDirty }: DashboardHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-8 pb-6 border-b border-border">
      <h1 className="font-display font-extrabold text-2xl tracking-tight uppercase">{title}</h1>
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
