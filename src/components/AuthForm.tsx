import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { FORM_INPUT, FORM_LABEL } from '~/components/forms'
import { getSupabaseBrowserClient } from '~/utils/supabase'

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
  onSubmit: (values: Record<string, string>) => Promise<{ error?: string; done?: boolean }>
  footer: { text: string; linkText: string; linkTo: string }
  extraFooter?: React.ReactNode
  successContent?: React.ReactNode
  initialError?: string
}

export function AuthForm({ title, fields, submitLabel, loadingLabel, onSubmit, footer, extraFooter, successContent, initialError }: AuthFormProps) {
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(fields.map((f) => [f.id, '']))
  )
  const [error, setError] = useState(initialError || '')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

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
      if (result.done) {
        setSuccess(true)
        setLoading(false)
        return
      }
      window.location.href = '/dashboard'
    } catch {
      setError('An unexpected error occurred')
      setLoading(false)
    }
  }

  if (success && successContent) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center px-4">
        <div className="w-full max-w-md">{successContent}</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <h1 className="font-display font-extrabold text-3xl tracking-tight uppercase text-center mb-8">{title}</h1>

        {error && (
          <div className="border border-red-500 px-4 py-3 mb-6 text-red-500 text-sm">
            {error}
          </div>
        )}

        {/* OAuth Buttons */}
        <div className="space-y-3 mb-6">
          {(['google', 'apple', 'discord'] as const).map((provider) => (
            <button
              key={provider}
              type="button"
              onClick={async () => {
                const supabase = getSupabaseBrowserClient()
                await supabase.auth.signInWithOAuth({
                  provider,
                  options: { redirectTo: `${window.location.origin}/api/auth/callback?next=/dashboard` },
                })
              }}
              className="w-full bg-white border border-text-primary/20 hover:border-text-primary text-text-primary font-semibold py-3 transition-colors text-sm uppercase tracking-wider"
            >
              Continue with {provider.charAt(0).toUpperCase() + provider.slice(1)}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1 h-px bg-text-primary" />
          <span className="text-text-secondary text-xs uppercase tracking-wider">or</span>
          <div className="flex-1 h-px bg-text-primary" />
        </div>

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
            className="w-full bg-text-primary hover:bg-accent disabled:opacity-50 text-white font-semibold py-3 transition-colors uppercase tracking-wider text-sm"
          >
            {loading ? loadingLabel : submitLabel}
          </button>
        </form>

        <p className="text-text-secondary text-sm text-center mt-6">
          {footer.text}{' '}
          <Link to={footer.linkTo} className="text-accent hover:underline">{footer.linkText}</Link>
        </p>
        {extraFooter && <div className="text-center mt-3">{extraFooter}</div>}
      </div>
    </div>
  )
}
