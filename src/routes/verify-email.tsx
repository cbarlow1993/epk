import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { getSupabaseBrowserClient } from '~/utils/supabase'

export const Route = createFileRoute('/verify-email')({
  component: VerifyEmailPage,
})

function VerifyEmailPage() {
  const [resent, setResent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleResend = async () => {
    setError('')
    setLoading(true)

    const supabase = getSupabaseBrowserClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user?.email) {
      setError('No email found. Please sign up again.')
      setLoading(false)
      return
    }

    const { error: resendError } = await supabase.auth.resend({
      type: 'signup',
      email: user.email,
      options: {
        emailRedirectTo: `${window.location.origin}/api/auth/callback?next=/dashboard`,
      },
    })

    if (resendError) {
      setError(resendError.message)
    } else {
      setResent(true)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <h1 className="font-display font-extrabold text-3xl tracking-tight uppercase mb-4">Verify Your Email</h1>
        <p className="text-text-secondary text-sm mb-8">
          Please check your inbox and click the verification link to access your dashboard.
        </p>

        {error && (
          <div className="border border-red-500 px-4 py-3 mb-6 text-red-500 text-sm">{error}</div>
        )}

        {resent ? (
          <div className="bg-accent/10 border border-accent/20 px-4 py-3 mb-6 text-accent text-sm">
            Verification email resent. Check your inbox.
          </div>
        ) : (
          <button
            onClick={handleResend}
            disabled={loading}
            className="bg-text-primary text-white hover:bg-accent disabled:opacity-50 font-semibold py-3 px-6 transition-colors uppercase tracking-wider text-sm"
          >
            {loading ? 'Sending...' : 'Resend Verification Email'}
          </button>
        )}

        <p className="text-text-secondary text-sm mt-6">
          Wrong account?{' '}
          <Link to="/login" className="text-accent hover:underline">Log in with a different email</Link>
        </p>
      </div>
    </div>
  )
}
