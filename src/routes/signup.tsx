import { createFileRoute } from '@tanstack/react-router'
import { signupWithEmail } from '~/server/auth'
import { AuthForm } from '~/components/AuthForm'

export const Route = createFileRoute('/signup')({
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
        return {}
      }}
      footer={{ text: 'Already have an account?', linkText: 'Log in', linkTo: '/login' }}
    />
  )
}
