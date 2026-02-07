import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { z } from 'zod'
import { loginWithEmail, getCurrentUser } from '~/server/auth'
import { AuthForm } from '~/components/AuthForm'

export const Route = createFileRoute('/login')({
  validateSearch: z.object({
    error: z.string().optional(),
  }),
  beforeLoad: async () => {
    const result = await getCurrentUser()
    if (result?.user?.email_confirmed_at) {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: LoginPage,
})

function LoginPage() {
  const { error: urlError } = Route.useSearch()

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
