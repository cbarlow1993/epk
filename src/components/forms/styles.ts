// Label used by FormInput, FormTextarea, FormSelect, and inline labels
export const FORM_LABEL = 'block text-sm uppercase tracking-widest font-bold mb-2'

// Base input/textarea/select styling (shared across form components AND list page inline forms)
export const FORM_INPUT = 'w-full bg-dark-card border border-white/10 rounded-lg px-4 py-3 text-white placeholder-text-secondary/50 focus:border-accent focus:outline-none transition-colors text-sm'
export const FORM_INPUT_ERROR = 'w-full bg-dark-card border border-red-500 rounded-lg px-4 py-3 text-white placeholder-text-secondary/50 focus:border-accent focus:outline-none transition-colors text-sm'
export const FORM_ERROR_MSG = 'text-xs text-red-400 mt-1'

// Button base used in list page forms
export const BTN_BASE = 'px-4 py-2 rounded-lg text-sm font-bold uppercase tracking-wider transition-colors'
export const BTN_DELETE = `${BTN_BASE} bg-red-500/20 text-red-400 hover:bg-red-500/30`

// Card container used in dashboard add/upload forms
export const CARD_SECTION = 'bg-dark-card border border-white/10 rounded-xl p-6 mb-8'

// Convert a readonly const array to { value, label } options for <select> elements
export function toSelectOptions<T extends string>(values: readonly T[]): { value: T; label: string }[] {
  return values.map((v) => ({
    value: v,
    label: v.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
  }))
}
