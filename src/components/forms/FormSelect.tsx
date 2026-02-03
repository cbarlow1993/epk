import type { UseFormRegisterReturn, FieldError } from 'react-hook-form'
import { FORM_LABEL, FORM_ERROR_MSG } from './styles'

interface FormSelectProps {
  label: string
  registration: UseFormRegisterReturn
  error?: FieldError
  options: readonly { value: string; label: string }[]
  className?: string
}

export function FormSelect({ label, registration, error, options, className }: FormSelectProps) {
  return (
    <div className={className}>
      <label className={FORM_LABEL}>{label}</label>
      <select
        {...registration}
        className={`w-full bg-dark-card border rounded-lg px-4 py-3 text-white focus:border-accent focus:outline-none transition-colors text-sm ${
          error ? 'border-red-500' : 'border-white/10'
        }`}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      {error && <p className={FORM_ERROR_MSG}>{error.message}</p>}
    </div>
  )
}
