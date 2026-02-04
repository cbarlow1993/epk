import type { UseFormRegisterReturn, FieldError } from 'react-hook-form'
import { FORM_LABEL, FORM_INPUT as INPUT_STYLE, FORM_INPUT_ERROR as INPUT_ERROR_STYLE, FORM_ERROR_MSG } from './styles'

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
        className={`${error ? INPUT_ERROR_STYLE : INPUT_STYLE} resize-none leading-relaxed`}
      />
      {error && <p className={FORM_ERROR_MSG}>{error.message}</p>}
    </div>
  )
}
