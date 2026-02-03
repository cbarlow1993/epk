import type { UseFormRegisterReturn, FieldError } from 'react-hook-form'
import { FORM_LABEL, FORM_ERROR_MSG } from './styles'

interface FormTextareaProps {
  label: string
  registration: UseFormRegisterReturn
  error?: FieldError
  rows?: number
  placeholder?: string
  className?: string
}

export function FormTextarea({ label, registration, error, rows = 8, placeholder, className }: FormTextareaProps) {
  return (
    <div className={className}>
      <label className={FORM_LABEL}>{label}</label>
      <textarea
        rows={rows}
        placeholder={placeholder}
        {...registration}
        className={`w-full bg-dark-card border rounded-lg px-4 py-3 text-white placeholder-text-secondary/50 focus:border-accent focus:outline-none transition-colors resize-none text-sm leading-relaxed ${
          error ? 'border-red-500' : 'border-white/10'
        }`}
      />
      {error && <p className={FORM_ERROR_MSG}>{error.message}</p>}
    </div>
  )
}
