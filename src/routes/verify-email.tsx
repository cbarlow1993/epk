import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { getSupabaseBrowserClient } from '~/utils/supabase'

export const Route = createFileRoute('/verify-email')({
  head: () => ({
    meta: [
      { title: 'Verify Email | myEPK' },
      { name: 'description', content: 'Verify your email address to activate your myEPK account.' },
    ],
  }),
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
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
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
    <div className="theme-dark min-h-screen bg-bg font-body flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <h1 className="font-display font-bold text-3xl tracking-tight text-text-primary mb-4">Verify Your Email</h1>
        <p className="text-text-secondary text-sm mb-8">
          Please check your inbox and click the verification link to access your dashboard.
        </p>

        {error && (
          <div className="border border-red-500/50 bg-red-500/10 rounded-lg px-4 py-3 mb-6 text-red-400 text-sm">{error}</div>
        )}

        {resent ? (
          <div className="bg-accent/10 border border-accent/30 rounded-xl px-4 py-3 mb-6 text-accent text-sm">
            Verification email resent. Check your inbox.
          </div>
        ) : (
          <button
            onClick={handleResend}
            disabled={loading}
            className="bg-accent hover:brightness-110 disabled:opacity-50 text-white font-semibold py-3 px-6 rounded-full transition-all tracking-wider text-sm hover:shadow-[0_0_20px_rgba(255,85,0,0.25)]"
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
