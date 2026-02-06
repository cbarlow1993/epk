import type { UseFormRegisterReturn, FieldError } from 'react-hook-form'
import { FORM_LABEL, FORM_INPUT as INPUT_STYLE, FORM_INPUT_ERROR as INPUT_ERROR_STYLE, FORM_ERROR_MSG } from './styles'

interface FormSelectProps {
  label: string
  registration: UseFormRegisterReturn
  error?: FieldError
  options: { value: string; label: string }[]
  placeholder?: string
  className?: string
}

export function FormSelect({ label, registration, error, options, placeholder, className }: FormSelectProps) {
  return (
    <div className={className}>
      <label className={FORM_LABEL}>{label}</label>
      <select
        {...registration}
        className={error ? INPUT_ERROR_STYLE : INPUT_STYLE}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      {error && <p className={FORM_ERROR_MSG}>{error.message}</p>}
    </div>
  )
}
