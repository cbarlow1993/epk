import type { UseFormRegisterReturn } from 'react-hook-form'
import { FORM_LABEL, FORM_ERROR_MSG } from './styles'

interface FormColorInputProps {
  label: string
  value: string
  registration: UseFormRegisterReturn
  onChange: (value: string) => void
  error?: { message?: string }
}

export function FormColorInput({ label, value, registration, onChange, error }: FormColorInputProps) {
  return (
    <div>
      <label className={FORM_LABEL}>{label}</label>
      <div className="flex items-center gap-3">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-12 h-10 rounded border border-border bg-card cursor-pointer"
        />
        <input
          type="text"
          {...registration}
          className={`flex-1 bg-card border px-3 py-2 text-text-primary text-sm font-mono focus:border-accent focus:outline-none ${
            error ? 'border-red-500' : 'border-border'
          }`}
        />
      </div>
      {error && <p className={FORM_ERROR_MSG}>{error.message}</p>}
    </div>
  )
}
