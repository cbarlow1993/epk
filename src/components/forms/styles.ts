// Label used by FormInput, FormTextarea, FormSelect, and inline labels
export const FORM_LABEL = 'block text-sm font-medium text-text-secondary mb-2'

// Base input/textarea/select styling (shared across form components AND list page inline forms)
export const FORM_INPUT = 'w-full bg-white border border-border rounded-lg px-4 py-3 text-text-primary placeholder-text-secondary/50 focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none transition-colors text-sm'
export const FORM_INPUT_ERROR = 'w-full bg-white border border-red-500 rounded-lg px-4 py-3 text-text-primary placeholder-text-secondary/50 focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none transition-colors text-sm'
export const FORM_ERROR_MSG = 'text-xs text-red-500 mt-1'

// File input styling
export const FORM_FILE_INPUT = 'text-sm text-text-secondary file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-surface file:text-text-primary file:cursor-pointer hover:file:bg-border'

// Button base used in list page forms
export const BTN_BASE = 'px-4 py-2 rounded-lg text-sm font-semibold transition-colors'
export const BTN_PRIMARY = `${BTN_BASE} bg-accent text-white hover:bg-accent/80 disabled:opacity-50 disabled:cursor-not-allowed`
export const BTN_DELETE = `${BTN_BASE} bg-red-500/10 text-red-500 hover:bg-red-500/20`

// Card container used in dashboard add/upload forms
export const CARD_SECTION = 'bg-white border border-border rounded-xl p-6 mb-8 shadow-card'

// Card container used in settings page sections
export const SETTINGS_CARD = 'bg-white border border-border rounded-lg p-6 shadow-card'

// Convert a readonly const array to { value, label } options for <select> elements
export function toSelectOptions<T extends string>(values: readonly T[]): { value: T; label: string }[] {
  return values.map((v) => ({
    value: v,
    label: v.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
  }))
}

// Look up the display label for a value in an options array
export function getLabelForValue(options: { value: string; label: string }[], value: string): string {
  return options.find((o) => o.value === value)?.label ?? value
}
