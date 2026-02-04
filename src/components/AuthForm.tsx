import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { FORM_INPUT, FORM_LABEL } from '~/components/forms'

interface AuthField {
  id: string
  label: string
  type: string
  placeholder: string
  minLength?: number
}

interface AuthFormProps {
  title: string
  fields: AuthField[]
  submitLabel: string
  loadingLabel: string
  onSubmit: (values: Record<string, string>) => Promise<{ error?: string }>
  footer: { text: string; linkText: string; linkTo: string }
}

export function AuthForm({ title, fields, submitLabel, loadingLabel, onSubmit, footer }: AuthFormProps) {
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(fields.map((f) => [f.id, '']))
  )
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const result = await onSubmit(values)
      if (result.error) {
        setError(result.error)
        setLoading(false)
        return
      }
      window.location.href = '/dashboard'
    } catch {
      setError('An unexpected error occurred')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-black uppercase tracking-wider text-center mb-8">{title}</h1>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 mb-6 text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {fields.map((field) => (
            <div key={field.id}>
              <label htmlFor={field.id} className={FORM_LABEL}>{field.label}</label>
              <input
                id={field.id}
                type={field.type}
                value={values[field.id]}
                onChange={(e) => setValues((prev) => ({ ...prev, [field.id]: e.target.value }))}
                className={FORM_INPUT}
                placeholder={field.placeholder}
                minLength={field.minLength}
                required
              />
            </div>
          ))}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-accent hover:bg-accent/80 disabled:opacity-50 text-white font-bold uppercase tracking-widest py-3 rounded-lg transition-colors"
          >
            {loading ? loadingLabel : submitLabel}
          </button>
        </form>

        <p className="text-text-secondary text-sm text-center mt-6">
          {footer.text}{' '}
          <Link to={footer.linkTo} className="text-accent hover:underline">{footer.linkText}</Link>
        </p>
      </div>
    </div>
  )
}
