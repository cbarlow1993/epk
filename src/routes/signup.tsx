import { createFileRoute, Link, redirect, isRedirect } from '@tanstack/react-router'
import { useState } from 'react'
import { signupWithEmail, getCurrentUser } from '~/server/auth'
import { FORM_INPUT, FORM_LABEL } from '~/components/forms'
import { OAUTH_PROVIDERS } from '~/components/AuthForm'
import { PasswordStrength } from '~/components/PasswordStrength'
import { friendlyAuthError } from '~/utils/auth-errors'
import { getSupabaseBrowserClient } from '~/utils/supabase'

export const Route = createFileRoute('/signup')({
  head: () => ({
    meta: [
      { title: 'Sign Up | myEPK' },
      { name: 'description', content: 'Create your free myEPK account and build a professional press kit in minutes.' },
      { property: 'og:title', content: 'Sign Up | myEPK — Free Professional Press Kits' },
      { property: 'og:description', content: 'Create your free myEPK account and build a professional press kit in minutes.' },
      { property: 'og:image', content: 'https://myepk.bio/og-default.png' },
      { property: 'twitter:card', content: 'summary_large_image' },
      { property: 'twitter:image', content: 'https://myepk.bio/og-default.png' },
    ],
  }),
  beforeLoad: async () => {
    try {
      const result = await getCurrentUser()
      if (result?.user?.email_confirmed_at) {
        throw redirect({ to: '/dashboard' })
      }
    } catch (e) {
      if (isRedirect(e)) throw e
    }
  },
  component: SignupPage,
})

const VALUE_POINTS = [
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
      </svg>
    ),
    title: 'Professional bio & profile',
    desc: 'Photo, biography, genre tags — everything a promoter needs.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" />
      </svg>
    ),
    title: 'Mixes & music embeds',
    desc: 'SoundCloud, Mixcloud, Spotify — let your sound do the talking.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
      </svg>
    ),
    title: 'Events & gig history',
    desc: 'Showcase past and upcoming shows. Build credibility instantly.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17l-5.384 3.183A1.2 1.2 0 014.25 17.28V6.72a1.2 1.2 0 011.786-1.073L11.42 8.83m0 6.34v-6.34m0 6.34L17.25 18.6a1.2 1.2 0 001.786-1.073V6.473a1.2 1.2 0 00-1.786-1.073L11.42 8.83" />
      </svg>
    ),
    title: 'Technical rider & press assets',
    desc: 'Equipment specs, hi-res photos, logos — all downloadable.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
      </svg>
    ),
    title: 'One link for everything',
    desc: 'Share a single URL. No PDFs, no outdated attachments.',
  },
]

function SignupPage() {
  const [values, setValues] = useState({ displayName: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [oauthLoading, setOauthLoading] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const result = await signupWithEmail({ data: { email: values.email, password: values.password, displayName: values.displayName } })
      if (result && 'error' in result && result.error) {
        setError(friendlyAuthError(result.error))
        setLoading(false)
        return
      }
      if (result && 'needsConfirmation' in result && result.needsConfirmation) {
        setSuccess(true)
        setLoading(false)
        return
      }
      window.location.href = '/dashboard/profile'
    } catch {
      setError('An unexpected error occurred')
      setLoading(false)
    }
  }

  const handleOAuth = async (provider: 'google' | 'apple' | 'spotify') => {
    setOauthLoading(provider)
    setError('')
    const supabase = getSupabaseBrowserClient()
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/dashboard/profile`,
      },
    })
    if (oauthError) {
      setError(friendlyAuthError(oauthError.message))
      setOauthLoading(null)
    }
  }

  if (success) {
    return (
      <div className="theme-dark min-h-screen bg-bg font-body flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="text-center text-text-primary">
            <div className="bg-accent/10 border border-accent/30 rounded-xl px-6 py-8">
              <h2 className="font-display font-bold text-2xl tracking-tight mb-3">Check Your Email</h2>
              <p className="text-text-secondary text-sm">
                We've sent a verification link to your email address. Click the link to activate your account.
              </p>
            </div>
            <p className="text-text-secondary text-sm mt-6">
              Already verified?{' '}
              <a href="/login" className="text-accent hover:underline">Log in</a>
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="theme-dark min-h-screen bg-bg font-body flex flex-col lg:flex-row">

      {/* Left — Marketing Panel */}
      <div className="relative lg:w-[52%] flex flex-col justify-between p-8 lg:p-16 overflow-hidden">

        {/* Background effects */}
        <div
          className="absolute top-[10%] left-[5%] w-[400px] h-[400px] rounded-full blur-[160px] pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(255,85,0,0.15) 0%, transparent 70%)' }}
        />
        <div
          className="absolute bottom-[15%] right-[10%] w-[300px] h-[300px] rounded-full blur-[120px] pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(255,85,0,0.08) 0%, transparent 70%)' }}
        />
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle, #888 1px, transparent 1px)', backgroundSize: '32px 32px' }}
        />

        {/* Logo */}
        <div className="relative z-10">
          <Link to="/" className="font-display font-bold text-lg tracking-tight flex items-center gap-2 text-text-primary">
            myEPK <span className="inline-block w-2 h-2 bg-accent rounded-full" />
          </Link>
        </div>

        {/* Value Content */}
        <div className="relative z-10 my-12 lg:my-0">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-px w-10 bg-accent" />
            <span className="text-[10px] font-semibold tracking-[0.2em] text-accent uppercase">Free to start</span>
          </div>

          <h1 className="font-display font-extrabold text-[clamp(2rem,5vw,3.5rem)] leading-[1] tracking-tight text-text-primary mb-5">
            Your career<br />deserves a<br /><span className="text-accent">press kit.</span>
          </h1>

          <p className="text-text-secondary text-[clamp(0.875rem,1.2vw,1rem)] leading-relaxed max-w-md mb-10">
            Stop sending outdated PDFs. Create a professional EPK in minutes and share it with a single link.
          </p>

          {/* Value points */}
          <div className="space-y-5">
            {VALUE_POINTS.map((point) => (
              <div key={point.title} className="flex gap-4 items-start">
                <div className="text-accent mt-0.5 shrink-0">{point.icon}</div>
                <div>
                  <p className="text-sm font-semibold text-text-primary">{point.title}</p>
                  <p className="text-xs text-text-secondary mt-0.5">{point.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom stats */}
        <div className="relative z-10 hidden lg:flex gap-10 pt-6 border-t border-border">
          {[
            { value: '$0', label: 'To get started' },
            { value: '5 min', label: 'Setup time' },
            { value: '1', label: 'Link to share' },
          ].map((stat) => (
            <div key={stat.label}>
              <span className="font-display font-bold text-xl tracking-tight text-text-primary">{stat.value}</span>
              <span className="block text-[10px] font-medium tracking-widest text-text-secondary uppercase mt-1">{stat.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right — Form Panel */}
      <div className="lg:w-[48%] flex items-center justify-center p-8 lg:p-16 lg:border-l border-border">
        <div className="w-full max-w-md">
          <h2 className="font-display font-bold text-2xl tracking-tight text-text-primary mb-2">Create your account</h2>
          <p className="text-text-secondary text-sm mb-8">Get your press kit live in under 5 minutes.</p>

          {error && (
            <div className="border border-red-500/50 bg-red-500/10 rounded-lg px-4 py-3 mb-6 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* OAuth */}
          <div className="space-y-3 mb-6">
            {OAUTH_PROVIDERS.map((provider) => (
              <button
                key={provider.id}
                type="button"
                disabled={!!oauthLoading || loading}
                onClick={() => handleOAuth(provider.id)}
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

          {/* Email form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="displayName" className={FORM_LABEL}>Artist / DJ Name</label>
              <input
                id="displayName"
                type="text"
                value={values.displayName}
                onChange={(e) => setValues((prev) => ({ ...prev, displayName: e.target.value }))}
                className={`${FORM_INPUT} rounded-lg`}
                placeholder="Your name"
                disabled={loading}
                required
              />
            </div>
            <div>
              <label htmlFor="email" className={FORM_LABEL}>Email</label>
              <input
                id="email"
                type="email"
                value={values.email}
                onChange={(e) => setValues((prev) => ({ ...prev, email: e.target.value }))}
                className={`${FORM_INPUT} rounded-lg`}
                placeholder="your@email.com"
                disabled={loading}
                required
              />
            </div>
            <div>
              <label htmlFor="password" className={FORM_LABEL}>Password</label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={values.password}
                  onChange={(e) => setValues((prev) => ({ ...prev, password: e.target.value }))}
                  className={`${FORM_INPUT} rounded-lg`}
                  placeholder="Min 6 characters"
                  minLength={6}
                  disabled={loading}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
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
              </div>
              <PasswordStrength password={values.password} />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-accent hover:brightness-110 disabled:opacity-50 text-white font-semibold py-3 rounded-full transition-all tracking-wider text-sm hover:shadow-[0_0_20px_rgba(255,85,0,0.25)]"
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <p className="text-text-secondary text-sm text-center mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-accent hover:underline">Log in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
