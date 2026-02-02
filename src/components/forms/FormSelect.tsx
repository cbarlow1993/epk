import type { UseFormRegisterReturn, FieldError } from 'react-hook-form'

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
      <label className="block text-sm uppercase tracking-widest font-bold mb-2">{label}</label>
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
      {error && <p className="text-xs text-red-400 mt-1">{error.message}</p>}
    </div>
  )
}
