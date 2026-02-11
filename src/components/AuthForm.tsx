import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { FORM_INPUT, FORM_LABEL } from '~/components/forms'
import { PasswordStrength } from '~/components/PasswordStrength'
import { friendlyAuthError } from '~/utils/auth-errors'
import { getSupabaseBrowserClient } from '~/utils/supabase'

const OAUTH_PROVIDERS = [
  {
    id: 'google' as const,
    label: 'Google',
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
      </svg>
    ),
  },
  {
    id: 'apple' as const,
    label: 'Apple',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
      </svg>
    ),
  },
  {
    id: 'spotify' as const,
    label: 'Spotify',
    icon: (
      <svg viewBox="0 0 24 24" fill="#1DB954" className="w-5 h-5">
        <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
      </svg>
    ),
  },
]

export { OAUTH_PROVIDERS }

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
          {OAUTH_PROVIDERS.map((provider) => (
            <button
              key={provider.id}
              type="button"
              disabled={!!oauthLoading || loading}
              onClick={async () => {
                setOauthLoading(provider.id)
                setError('')
                const supabase = getSupabaseBrowserClient()
                const { error: oauthError } = await supabase.auth.signInWithOAuth({
                  provider: provider.id,
                  options: {
                    redirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
                  },
                })
                if (oauthError) {
                  setError(friendlyAuthError(oauthError.message))
                  setOauthLoading(null)
                }
              }}
              className="w-full bg-surface border border-border rounded-lg text-text-primary font-medium py-3 transition-all text-sm hover:border-text-secondary disabled:opacity-50 flex items-center justify-center gap-3"
            >
              {provider.icon}
              {oauthLoading === provider.id ? 'Redirecting...' : `Continue with ${provider.label}`}
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
