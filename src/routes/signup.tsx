import { createFileRoute, redirect, isRedirect } from '@tanstack/react-router'
import { signupWithEmail, getCurrentUser } from '~/server/auth'
import { AuthForm } from '~/components/AuthForm'

export const Route = createFileRoute('/signup')({
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

function SignupPage() {
  return (
    <AuthForm
      title="Sign Up"
      fields={[
        { id: 'displayName', label: 'Artist / DJ Name', type: 'text', placeholder: 'Your name' },
        { id: 'email', label: 'Email', type: 'email', placeholder: 'your@email.com' },
        { id: 'password', label: 'Password', type: 'password', placeholder: 'Min 6 characters', minLength: 6 },
      ]}
      submitLabel="Create Account"
      loadingLabel="Creating account..."
      onSubmit={async (values) => {
        const result = await signupWithEmail({ data: { email: values.email, password: values.password, displayName: values.displayName } })
        if (result && 'error' in result && result.error) return { error: result.error }
        if (result && 'needsConfirmation' in result && result.needsConfirmation) return { done: true }
        return {}
      }}
      footer={{ text: 'Already have an account?', linkText: 'Log in', linkTo: '/login' }}
      successContent={
        <div className="text-center">
          <div className="bg-accent/10 border border-accent/20 px-6 py-8">
            <h2 className="font-display font-extrabold text-2xl tracking-tight uppercase mb-3">Check Your Email</h2>
            <p className="text-text-secondary text-sm">
              We've sent a verification link to your email address. Click the link to activate your account.
            </p>
          </div>
          <p className="text-text-secondary text-sm mt-6">
            Already verified?{' '}
            <a href="/login" className="text-accent hover:underline">Log in</a>
          </p>
        </div>
      }
    />
  )
}
