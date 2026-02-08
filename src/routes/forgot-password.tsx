import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { getSupabaseBrowserClient } from '~/utils/supabase'
import { FORM_INPUT, FORM_LABEL } from '~/components/forms'
import { friendlyAuthError } from '~/utils/auth-errors'

export const Route = createFileRoute('/forgot-password')({
  component: ForgotPasswordPage,
})

function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = getSupabaseBrowserClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    })

    if (error) {
      setError(friendlyAuthError(error.message))
      setLoading(false)
      return
    }

    setSent(true)
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-display font-extrabold tracking-tight uppercase text-center mb-8">Reset Password</h1>

        {sent ? (
          <div className="bg-accent/10 border border-accent/20 px-4 py-6 text-center">
            <p className="text-accent font-semibold mb-2">Check your email</p>
            <p className="text-text-secondary text-sm">We've sent a password reset link to <strong className="text-text-primary">{email}</strong></p>
          </div>
        ) : (
          <>
            {error && (
              <div className="border border-red-500 px-4 py-3 mb-6 text-red-500 text-sm">{error}</div>
            )}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="email" className={FORM_LABEL}>Email</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={FORM_INPUT}
                  placeholder="your@email.com"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-text-primary text-white hover:bg-accent disabled:opacity-50 font-semibold py-3 transition-colors uppercase tracking-wider text-sm"
              >
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>
          </>
        )}

        <p className="text-text-secondary text-sm text-center mt-6">
          Remember your password?{' '}
          <Link to="/login" className="text-accent hover:underline">Log in</Link>
        </p>
      </div>
    </div>
  )
}
