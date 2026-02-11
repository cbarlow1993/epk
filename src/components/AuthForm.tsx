import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { FORM_INPUT, FORM_LABEL } from '~/components/forms'
import { PasswordStrength } from '~/components/PasswordStrength'
import { friendlyAuthError } from '~/utils/auth-errors'
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
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({})
  const [oauthLoading, setOauthLoading] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const result = await onSubmit(values)
      if (result.error) {
        setError(friendlyAuthError(result.error))
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
      <div className="theme-dark min-h-screen bg-bg font-body flex items-center justify-center px-4">
        <div className="w-full max-w-md">{successContent}</div>
      </div>
    )
  }

  return (
    <div className="theme-dark min-h-screen bg-bg font-body flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <h1 className="font-display font-bold text-3xl tracking-tight text-text-primary text-center mb-8">{title}</h1>

        {error && (
          <div className="border border-red-500/50 bg-red-500/10 rounded-lg px-4 py-3 mb-6 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* OAuth Buttons */}
        <div className="space-y-3 mb-6">
          {(['google', 'apple', 'discord'] as const).map((provider) => (
            <button
              key={provider}
              type="button"
              disabled={!!oauthLoading || loading}
              onClick={async () => {
                setOauthLoading(provider)
                setError('')
                const supabase = getSupabaseBrowserClient()
                const { error: oauthError } = await supabase.auth.signInWithOAuth({
                  provider,
                  options: {
                    redirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
                  },
                })
                if (oauthError) {
                  setError(friendlyAuthError(oauthError.message))
                  setOauthLoading(null)
                }
              }}
              className="w-full bg-surface border border-border rounded-lg text-text-primary font-medium py-3 transition-all text-sm hover:border-text-secondary disabled:opacity-50"
            >
              {oauthLoading === provider ? 'Redirecting...' : `Continue with ${provider.charAt(0).toUpperCase() + provider.slice(1)}`}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1 h-px bg-border" />
          <span className="text-text-secondary text-xs tracking-wider">or</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {fields.map((field) => (
            <div key={field.id}>
              <label htmlFor={field.id} className={FORM_LABEL}>{field.label}</label>
              <div className="relative">
                <input
                  id={field.id}
                  type={field.type === 'password' && showPasswords[field.id] ? 'text' : field.type}
                  value={values[field.id]}
                  onChange={(e) => setValues((prev) => ({ ...prev, [field.id]: e.target.value }))}
                  className={`${FORM_INPUT} rounded-lg`}
                  placeholder={field.placeholder}
                  minLength={field.minLength}
                  disabled={loading}
                  required
                />
                {field.type === 'password' && (
                  <button
                    type="button"
                    onClick={() => setShowPasswords((prev) => ({ ...prev, [field.id]: !prev[field.id] }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary transition-colors"
                    aria-label={showPasswords[field.id] ? 'Hide password' : 'Show password'}
                  >
                    {showPasswords[field.id] ? (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                        <path fillRule="evenodd" d="M3.28 2.22a.75.75 0 00-1.06 1.06l14.5 14.5a.75.75 0 101.06-1.06l-1.745-1.745a10.029 10.029 0 003.3-4.38 1.651 1.651 0 000-1.185A10.004 10.004 0 009.999 3a9.956 9.956 0 00-4.744 1.194L3.28 2.22zM7.752 6.69l1.092 1.092a2.5 2.5 0 013.374 3.373l1.092 1.092a4 4 0 00-5.558-5.558z" clipRule="evenodd" />
                        <path d="M10.748 13.93l2.523 2.523a9.987 9.987 0 01-3.27.547c-4.258 0-7.894-2.66-9.337-6.41a1.651 1.651 0 010-1.186A10.007 10.007 0 012.839 6.02L6.07 9.252a4 4 0 004.678 4.678z" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                        <path d="M10 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" />
                        <path fillRule="evenodd" d="M.664 10.59a1.651 1.651 0 010-1.186A10.004 10.004 0 0110 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0110 17c-4.257 0-7.893-2.66-9.336-6.41zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                )}
              </div>
              {field.type === 'password' && field.minLength && (
                <PasswordStrength password={values[field.id]} />
              )}
            </div>
          ))}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-accent hover:brightness-110 disabled:opacity-50 text-white font-semibold py-3 rounded-full transition-all tracking-wider text-sm hover:shadow-[0_0_20px_rgba(255,85,0,0.25)]"
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
