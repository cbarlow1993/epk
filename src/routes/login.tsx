import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { z } from 'zod'
import { useEffect, useState } from 'react'
import { loginWithEmail, getCurrentUser } from '~/server/auth'
import { AuthForm } from '~/components/AuthForm'
import { EqBars } from '~/components/EqBars'

export const Route = createFileRoute('/login')({
  validateSearch: z.object({
    error: z.string().optional(),
  }),
  head: () => ({
    meta: [
      { title: 'Log In | myEPK' },
      { name: 'description', content: 'Log in to your myEPK account to manage your electronic press kit.' },
    ],
  }),
  component: LoginPage,
})

function LoginPage() {
  const { error: urlError } = Route.useSearch()
  const navigate = useNavigate()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    getCurrentUser()
      .then((result) => {
        if (result?.user?.email_confirmed_at) {
          navigate({ to: '/dashboard' })
        } else {
          setChecking(false)
        }
      })
      .catch(() => setChecking(false))
  }, [navigate])

  if (checking) {
    return (
      <div className="theme-dark min-h-screen bg-bg flex flex-col items-center justify-center gap-6">
        <EqBars className="h-12" barCount={24} />
        <p className="text-text-secondary text-sm font-body animate-pulse">Loading...</p>
      </div>
    )
  }

  return (
    <AuthForm
      title="Log In"
      initialError={urlError}
      fields={[
        { id: 'email', label: 'Email', type: 'email', placeholder: 'your@email.com' },
        { id: 'password', label: 'Password', type: 'password', placeholder: 'Your password' },
      ]}
      submitLabel="Log In"
      loadingLabel="Logging in..."
      onSubmit={async (values) => {
        const result = await loginWithEmail({ data: { email: values.email, password: values.password } })
        if (result && 'error' in result && result.error) return { error: result.error }
        return {}
      }}
      footer={{ text: "Don't have an account?", linkText: 'Sign up', linkTo: '/signup' }}
      extraFooter={
        <Link to="/forgot-password" className="text-accent hover:underline text-sm">
          Forgot your password?
        </Link>
      }
    />
  )
}
