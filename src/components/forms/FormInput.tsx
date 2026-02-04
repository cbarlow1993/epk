import type { UseFormRegisterReturn, FieldError } from 'react-hook-form'
import { FORM_LABEL, FORM_INPUT as INPUT_STYLE, FORM_INPUT_ERROR as INPUT_ERROR_STYLE, FORM_ERROR_MSG } from './styles'

interface FormInputProps {
  label: string
  registration: UseFormRegisterReturn
  error?: FieldError
  type?: string
  placeholder?: string
  className?: string
}

export function FormInput({ label, registration, error, type = 'text', placeholder, className }: FormInputProps) {
  return (
    <div className={className}>
      <label className={FORM_LABEL}>{label}</label>
      <input
        type={type}
        placeholder={placeholder}
        {...registration}
        className={error ? INPUT_ERROR_STYLE : INPUT_STYLE}
      />
      {error && <p className={FORM_ERROR_MSG}>{error.message}</p>}
    </div>
  )
}
