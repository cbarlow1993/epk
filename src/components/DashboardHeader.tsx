interface DashboardHeaderProps {
  title: string
  saving: boolean
  saved: boolean
  error: string
  isDirty: boolean
}

export function DashboardHeader({ title, saving, saved, error, isDirty }: DashboardHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-8">
      <h1 className="text-2xl font-display font-semibold tracking-tight">{title}</h1>
      <div className="flex items-center gap-3">
        {saved && <span className="text-xs text-green-600">Saved</span>}
        {error && <span className="text-xs text-red-500">{error}</span>}
        <button
          type="submit"
          disabled={saving || !isDirty}
          className="px-5 py-2 rounded-lg text-sm font-semibold bg-accent text-white hover:bg-accent/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  )
}
