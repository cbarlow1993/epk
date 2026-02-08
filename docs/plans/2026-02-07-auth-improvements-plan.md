# Auth Improvements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Improve login/signup and authentication using all Supabase free-tier auth features — PKCE flow, auth callback route, email verification, session refresh, OAuth fix, and UI polish.

**Architecture:** Add a Nitro API route (`/api/auth/callback`) that handles auth code exchange for OAuth, email verification, and password reset flows. Add an `AuthProvider` component for client-side session state listening. Enforce email verification in the dashboard guard. Polish auth UI with password toggle, strength indicator, and better error messages.

**Tech Stack:** Supabase Auth (PKCE), TanStack Start, Nitro API routes, @supabase/ssr

---

### Task 1: Auth Callback Nitro Route

Create the server-side auth callback that exchanges codes for sessions. This is the foundation for OAuth, email verification, and password reset.

**Files:**
- Create: `server/routes/api/auth/callback.ts`

**Step 1: Create the callback route**

```ts
// server/routes/api/auth/callback.ts
import { createServerClient } from '@supabase/ssr'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const code = query.code as string | undefined
  const next = (query.next as string) || '/dashboard'

  if (!code) {
    return sendRedirect(event, `/login?error=${encodeURIComponent('Missing auth code')}`)
  }

  const supabase = createServerClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          const raw = parseCookies(event)
          return Object.entries(raw).map(([name, value]) => ({
            name,
            value: decodeURIComponent(value),
          }))
        },
        setAll(cookies) {
          for (const cookie of cookies) {
            setCookie(event, cookie.name, cookie.value, cookie.options)
          }
        },
      },
    },
  )

  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return sendRedirect(event, `/login?error=${encodeURIComponent(error.message)}`)
  }

  return sendRedirect(event, next)
})
```

**Step 2: Verify the route is accessible**

Run: `npm run dev`
Navigate to: `http://localhost:3000/api/auth/callback` (should redirect to `/login?error=Missing+auth+code`)

**Step 3: Commit**

```bash
git add server/routes/api/auth/callback.ts
git commit -m "feat: add auth callback route for PKCE code exchange"
```

---

### Task 2: Configure PKCE Flow on Supabase Clients

Update both server and browser Supabase clients to use PKCE auth flow.

**Files:**
- Modify: `src/utils/supabase.server.ts`
- Modify: `src/utils/supabase.ts`

**Step 1: Add PKCE flow to server client**

In `src/utils/supabase.server.ts`, add `auth: { flowType: 'pkce' }` to the `createServerClient` options:

```ts
export function getSupabaseServerClient() {
  const supabase = createServerClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY,
    {
      auth: {
        flowType: 'pkce',
      },
      cookies: {
        getAll() {
          const cookies = getCookies()
          return Object.entries(cookies).map(([name, value]) => ({
            name,
            value: decodeURIComponent(value),
          }))
        },
        setAll(cookies) {
          for (const cookie of cookies) {
            if (cookie.value === '') {
              deleteCookie(cookie.name, cookie.options)
            } else {
              setCookie(cookie.name, cookie.value, cookie.options)
            }
          }
        },
      },
    },
  )

  return supabase
}
```

**Step 2: Add PKCE flow to browser client**

In `src/utils/supabase.ts`:

```ts
import { createBrowserClient } from '@supabase/ssr'

export function getSupabaseBrowserClient() {
  return createBrowserClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY,
    {
      auth: {
        flowType: 'pkce',
      },
    },
  )
}
```

**Step 3: Verify login still works**

Run: `npm run dev`
Test: Log in with existing credentials — should still work as before.

**Step 4: Commit**

```bash
git add src/utils/supabase.server.ts src/utils/supabase.ts
git commit -m "feat: configure PKCE auth flow on Supabase clients"
```

---

### Task 3: Fix OAuth Redirect URLs

Update OAuth buttons to redirect through the callback route instead of directly to `/dashboard`.

**Files:**
- Modify: `src/components/AuthForm.tsx` (lines 67-73)

**Step 1: Update OAuth redirectTo**

Change the `signInWithOAuth` call to redirect through the callback:

```ts
onClick={async () => {
  const supabase = getSupabaseBrowserClient()
  await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${window.location.origin}/api/auth/callback?next=/dashboard`,
    },
  })
}}
```

**Step 2: Commit**

```bash
git add src/components/AuthForm.tsx
git commit -m "fix: route OAuth through auth callback for PKCE code exchange"
```

---

### Task 4: Update Password Reset Flow to Use Callback

The forgot-password and reset-password pages need to route through the callback for proper PKCE token exchange.

**Files:**
- Modify: `src/routes/forgot-password.tsx` (line 22-24)

**Step 1: Update reset password redirect URL**

In `forgot-password.tsx`, change the `redirectTo` to route through the callback:

```ts
const { error } = await supabase.auth.resetPasswordForEmail(email, {
  redirectTo: `${window.location.origin}/api/auth/callback?next=/reset-password`,
})
```

This ensures the auth code from the email link gets exchanged for a session server-side before landing on the reset-password page.

**Step 2: Commit**

```bash
git add src/routes/forgot-password.tsx
git commit -m "fix: route password reset through auth callback for PKCE"
```

---

### Task 5: Email Verification — Signup Flow Change

After signup, show a "check your email" screen instead of auto-redirecting to dashboard.

**Files:**
- Modify: `src/components/AuthForm.tsx`
- Modify: `src/routes/signup.tsx`
- Modify: `src/server/auth.ts`

**Step 1: Add `emailConfirmationRequired` option to signupWithEmail**

In `src/server/auth.ts`, update `signupWithEmail` to detect whether email confirmation was sent:

```ts
export const signupWithEmail = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => z.object({ email: z.string().email(), password: z.string().min(6), displayName: z.string().min(1).max(100) }).parse(data))
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()

    const { data: authData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: { display_name: data.displayName },
        emailRedirectTo: `${import.meta.env.VITE_SITE_URL || 'http://localhost:3000'}/api/auth/callback?next=/dashboard`,
      },
    })

    if (error) {
      return { error: error.message }
    }

    // If identities array is empty, email is already taken (Supabase returns fake success)
    if (authData.user && authData.user.identities?.length === 0) {
      return { error: 'An account with this email already exists' }
    }

    // If email_confirmed_at is null, user needs to confirm email
    const needsConfirmation = !authData.user?.email_confirmed_at

    return { user: authData.user, needsConfirmation }
  })
```

**Step 2: Update AuthForm to support a success state callback**

In `src/components/AuthForm.tsx`, add an `onSuccess` prop that the parent can use to control post-submit behavior. Change the `AuthFormProps` interface:

```ts
interface AuthFormProps {
  title: string
  fields: AuthField[]
  submitLabel: string
  loadingLabel: string
  onSubmit: (values: Record<string, string>) => Promise<{ error?: string; done?: boolean }>
  footer: { text: string; linkText: string; linkTo: string }
  extraFooter?: React.ReactNode
  successContent?: React.ReactNode
}
```

Update `handleSubmit` — if `result.done` is truthy, show `successContent` instead of redirecting:

```ts
const [success, setSuccess] = useState(false)

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()
  setError('')
  setLoading(true)

  try {
    const result = await onSubmit(values)
    if (result.error) {
      setError(result.error)
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
```

In the JSX, if `success && successContent`, render `successContent` instead of the form:

```tsx
{success && successContent ? (
  <div className="min-h-screen bg-bg flex items-center justify-center px-4">
    <div className="w-full max-w-md">{successContent}</div>
  </div>
) : (
  // existing form JSX
)}
```

**Step 3: Update signup page to show confirmation screen**

In `src/routes/signup.tsx`:

```tsx
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
```

**Step 4: Commit**

```bash
git add src/server/auth.ts src/components/AuthForm.tsx src/routes/signup.tsx
git commit -m "feat: show email verification prompt after signup"
```

---

### Task 6: Verify-Email Page + Dashboard Guard

Create a verify-email page for unverified users and enforce verification in the dashboard guard.

**Files:**
- Create: `src/routes/verify-email.tsx`
- Modify: `src/routes/_dashboard.tsx`

**Step 1: Create verify-email page**

```tsx
// src/routes/verify-email.tsx
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

    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: user.email,
      options: {
        emailRedirectTo: `${window.location.origin}/api/auth/callback?next=/dashboard`,
      },
    })

    if (error) {
      setError(error.message)
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
```

**Step 2: Update dashboard guard to check email verification**

In `src/routes/_dashboard.tsx`, after getting the user, check `email_confirmed_at`:

```ts
import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { getCurrentUser } from '~/server/auth'
import { getChecklistBadge } from '~/server/checklist'
import { DashboardSidebar } from '~/components/DashboardSidebar'

export const Route = createFileRoute('/_dashboard')({
  beforeLoad: async () => {
    const result = await getCurrentUser()
    if (!result) {
      throw redirect({ to: '/login' })
    }

    // Enforce email verification
    if (!result.user.email_confirmed_at) {
      throw redirect({ to: '/verify-email' })
    }

    const showNextBadge = result.profile ? await getChecklistBadge({ data: { profileId: result.profile.id } }) : false

    return { user: result.user, profile: result.profile, showNextBadge }
  },
  component: DashboardLayout,
})

// ... DashboardLayout unchanged
```

**Step 3: Commit**

```bash
git add src/routes/verify-email.tsx src/routes/_dashboard.tsx
git commit -m "feat: enforce email verification before dashboard access"
```

---

### Task 7: Auth Provider for Session Refresh + Multi-Tab Logout

Add a client-side auth state listener.

**Files:**
- Create: `src/components/AuthProvider.tsx`
- Modify: `src/routes/__root.tsx`

**Step 1: Create AuthProvider component**

```tsx
// src/components/AuthProvider.tsx
import { useEffect } from 'react'
import { getSupabaseBrowserClient } from '~/utils/supabase'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const supabase = getSupabaseBrowserClient()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        // Another tab signed out — redirect to login
        window.location.href = '/login'
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  return <>{children}</>
}
```

**Step 2: Wrap app in AuthProvider**

In `src/routes/__root.tsx`, wrap the `<body>` content:

```tsx
import { AuthProvider } from '~/components/AuthProvider'

function RootComponent() {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body className="bg-bg text-text-primary font-body antialiased">
        <AuthProvider>
          <Outlet />
        </AuthProvider>
        <Scripts />
      </body>
    </html>
  )
}
```

**Step 3: Commit**

```bash
git add src/components/AuthProvider.tsx src/routes/__root.tsx
git commit -m "feat: add AuthProvider for session state listening"
```

---

### Task 8: Auto-Redirect Authenticated Users Away from Auth Pages

If a user is already logged in and visits `/login` or `/signup`, redirect them to the dashboard.

**Files:**
- Modify: `src/routes/login.tsx`
- Modify: `src/routes/signup.tsx`

**Step 1: Add beforeLoad to login route**

In `src/routes/login.tsx`:

```tsx
import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { loginWithEmail, getCurrentUser } from '~/server/auth'
import { AuthForm } from '~/components/AuthForm'

export const Route = createFileRoute('/login')({
  beforeLoad: async () => {
    const result = await getCurrentUser()
    if (result?.user?.email_confirmed_at) {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: LoginPage,
})
```

**Step 2: Add beforeLoad to signup route**

In `src/routes/signup.tsx`:

```tsx
import { createFileRoute, redirect } from '@tanstack/react-router'
import { signupWithEmail, getCurrentUser } from '~/server/auth'
import { AuthForm } from '~/components/AuthForm'

export const Route = createFileRoute('/signup')({
  beforeLoad: async () => {
    const result = await getCurrentUser()
    if (result?.user?.email_confirmed_at) {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: SignupPage,
})
```

**Step 3: Commit**

```bash
git add src/routes/login.tsx src/routes/signup.tsx
git commit -m "feat: redirect authenticated users away from login/signup"
```

---

### Task 9: Display Login URL Errors

The callback route redirects to `/login?error=...` on failure. The login page needs to display this.

**Files:**
- Modify: `src/routes/login.tsx`
- Modify: `src/components/AuthForm.tsx`

**Step 1: Add `initialError` prop to AuthForm**

In `src/components/AuthForm.tsx`, add an `initialError` prop:

```ts
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
```

Initialize the error state from it:

```ts
const [error, setError] = useState(initialError || '')
```

**Step 2: Read search params in login page**

In `src/routes/login.tsx`, use `Route.useSearch()`:

```tsx
import { z } from 'zod'

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
      // ... rest unchanged
    />
  )
}
```

**Step 3: Commit**

```bash
git add src/routes/login.tsx src/components/AuthForm.tsx
git commit -m "feat: display auth callback errors on login page"
```

---

### Task 10: Password Visibility Toggle

Add show/hide toggle to all password fields.

**Files:**
- Modify: `src/components/AuthForm.tsx`

**Step 1: Add password visibility state and toggle**

Add state tracking which password fields are visible, and render an eye icon button inside password inputs:

```tsx
const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({})

// In the field rendering loop, for password fields:
{fields.map((field) => (
  <div key={field.id}>
    <label htmlFor={field.id} className={FORM_LABEL}>{field.label}</label>
    <div className="relative">
      <input
        id={field.id}
        type={field.type === 'password' && showPasswords[field.id] ? 'text' : field.type}
        value={values[field.id]}
        onChange={(e) => setValues((prev) => ({ ...prev, [field.id]: e.target.value }))}
        className={FORM_INPUT}
        placeholder={field.placeholder}
        minLength={field.minLength}
        required
        disabled={loading}
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
  </div>
))}
```

**Step 2: Also add toggle to reset-password page**

In `src/routes/reset-password.tsx`, add the same pattern for both password fields. Track state with:

```ts
const [showPassword, setShowPassword] = useState(false)
const [showConfirm, setShowConfirm] = useState(false)
```

Wrap each password input in a `<div className="relative">` and add the toggle button.

**Step 3: Commit**

```bash
git add src/components/AuthForm.tsx src/routes/reset-password.tsx
git commit -m "feat: add password visibility toggle to auth forms"
```

---

### Task 11: Password Strength Indicator

Add a visual strength bar on signup and reset-password pages.

**Files:**
- Create: `src/components/PasswordStrength.tsx`
- Modify: `src/components/AuthForm.tsx`
- Modify: `src/routes/reset-password.tsx`

**Step 1: Create PasswordStrength component**

```tsx
// src/components/PasswordStrength.tsx

function getStrength(password: string): { score: number; label: string } {
  if (!password) return { score: 0, label: '' }

  let score = 0
  if (password.length >= 6) score++
  if (password.length >= 10) score++
  if (/[A-Z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++

  if (score <= 1) return { score: 1, label: 'Weak' }
  if (score <= 2) return { score: 2, label: 'Fair' }
  if (score <= 3) return { score: 3, label: 'Good' }
  return { score: 4, label: 'Strong' }
}

const COLORS = ['', 'bg-red-500', 'bg-orange-400', 'bg-yellow-400', 'bg-green-500']

export function PasswordStrength({ password }: { password: string }) {
  const { score, label } = getStrength(password)
  if (!password) return null

  return (
    <div className="mt-2">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${
              i <= score ? COLORS[score] : 'bg-text-primary/10'
            }`}
          />
        ))}
      </div>
      <p className="text-xs text-text-secondary mt-1">{label}</p>
    </div>
  )
}
```

**Step 2: Add to AuthForm for password fields**

In `src/components/AuthForm.tsx`, import `PasswordStrength` and render it after password inputs (only when `field.id === 'password'` and `field.minLength` is set — this targets signup, not login):

```tsx
import { PasswordStrength } from '~/components/PasswordStrength'

// After the password input's closing </div>:
{field.type === 'password' && field.minLength && (
  <PasswordStrength password={values[field.id]} />
)}
```

**Step 3: Add to reset-password page**

Import and render `<PasswordStrength password={password} />` after the new password field.

**Step 4: Commit**

```bash
git add src/components/PasswordStrength.tsx src/components/AuthForm.tsx src/routes/reset-password.tsx
git commit -m "feat: add password strength indicator to signup and reset forms"
```

---

### Task 12: Better Error Messages

Map Supabase error strings to user-friendly messages.

**Files:**
- Create: `src/utils/auth-errors.ts`
- Modify: `src/components/AuthForm.tsx`
- Modify: `src/routes/forgot-password.tsx`
- Modify: `src/routes/reset-password.tsx`

**Step 1: Create error mapping utility**

```ts
// src/utils/auth-errors.ts
const ERROR_MAP: Record<string, string> = {
  'Invalid login credentials': 'Incorrect email or password.',
  'Email not confirmed': 'Please verify your email address before logging in.',
  'User already registered': 'An account with this email already exists.',
  'Signup requires a valid password': 'Please enter a valid password (at least 6 characters).',
  'Email rate limit exceeded': 'Too many attempts. Please try again in a few minutes.',
  'For security purposes, you can only request this once every 60 seconds': 'Please wait 60 seconds before requesting another email.',
}

export function friendlyAuthError(message: string): string {
  return ERROR_MAP[message] || message
}
```

**Step 2: Use in AuthForm**

In `src/components/AuthForm.tsx`, wrap error messages:

```ts
import { friendlyAuthError } from '~/utils/auth-errors'

// In handleSubmit, when setting error:
if (result.error) {
  setError(friendlyAuthError(result.error))
  // ...
}
```

**Step 3: Use in forgot-password and reset-password pages**

Import `friendlyAuthError` and wrap `error.message` in the error handlers.

**Step 4: Commit**

```bash
git add src/utils/auth-errors.ts src/components/AuthForm.tsx src/routes/forgot-password.tsx src/routes/reset-password.tsx
git commit -m "feat: add user-friendly auth error messages"
```

---

### Task 13: OAuth Loading State

Add loading/disabled state to OAuth buttons when one is clicked.

**Files:**
- Modify: `src/components/AuthForm.tsx`

**Step 1: Add OAuth loading state**

```ts
const [oauthLoading, setOauthLoading] = useState<string | null>(null)
```

Update OAuth button `onClick`:

```tsx
onClick={async () => {
  setOauthLoading(provider)
  const supabase = getSupabaseBrowserClient()
  await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${window.location.origin}/api/auth/callback?next=/dashboard`,
    },
  })
}}
disabled={!!oauthLoading || loading}
```

Update button text to show loading for the clicked provider:

```tsx
{oauthLoading === provider ? 'Redirecting...' : `Continue with ${provider.charAt(0).toUpperCase() + provider.slice(1)}`}
```

**Step 2: Commit**

```bash
git add src/components/AuthForm.tsx
git commit -m "feat: add loading state to OAuth buttons"
```

---

### Task 14: Disable Form Inputs During Submission

Prevent double-submit by disabling all inputs during loading.

**Files:**
- Modify: `src/components/AuthForm.tsx` (already partially done in Task 10's `disabled={loading}` on inputs)

**Step 1: Verify inputs are disabled during loading**

This was added in Task 10 with `disabled={loading}` on inputs and in Task 13 with `disabled={!!oauthLoading || loading}` on OAuth buttons. The submit button already has `disabled={loading}`.

No additional work needed — verify all three are disabled during submission.

**Step 2: Commit (if any changes needed)**

```bash
git add src/components/AuthForm.tsx
git commit -m "fix: ensure all auth form inputs disabled during submission"
```

---

### Task 15: Smoke Test All Flows

Manual testing checklist — run through each flow to verify everything works.

**Step 1: Start dev server**

Run: `npm run dev`

**Step 2: Test flows**

1. **Signup:** Fill form → should show "Check your email" screen (not redirect to dashboard)
2. **Login with unverified email:** Should redirect to `/verify-email`
3. **Login with verified email:** Should redirect to `/dashboard`
4. **Visit /login while logged in:** Should redirect to `/dashboard`
5. **Visit /signup while logged in:** Should redirect to `/dashboard`
6. **Forgot password:** Enter email → should show success message
7. **Password reset:** Follow email link → should land on reset-password page with valid session
8. **OAuth buttons:** Click one → should redirect to provider (if configured in Supabase)
9. **Password toggle:** Click eye icon → should show/hide password
10. **Password strength:** Type in signup → should show strength bar
11. **Error messages:** Wrong password on login → should show friendly message
12. **Multi-tab logout:** Log out in one tab → other tab should redirect to login

**Step 3: Final commit**

```bash
git add -A
git commit -m "feat: auth improvements — PKCE, email verification, session refresh, UI polish"
```

---

## Summary of All Files

**New files (5):**
- `server/routes/api/auth/callback.ts` — Auth code exchange route
- `src/routes/verify-email.tsx` — Email verification pending page
- `src/components/AuthProvider.tsx` — Client-side auth state listener
- `src/components/PasswordStrength.tsx` — Password strength indicator
- `src/utils/auth-errors.ts` — Friendly error message mapping

**Modified files (9):**
- `src/utils/supabase.server.ts` — Add PKCE flow type
- `src/utils/supabase.ts` — Add PKCE flow type
- `src/components/AuthForm.tsx` — Password toggle, strength indicator, success state, OAuth loading, error mapping, initialError prop
- `src/server/auth.ts` — Email verification detection, emailRedirectTo
- `src/routes/signup.tsx` — Show verification prompt, auto-redirect
- `src/routes/login.tsx` — URL error display, auto-redirect
- `src/routes/forgot-password.tsx` — Route through callback, friendly errors
- `src/routes/reset-password.tsx` — Password toggle, strength indicator, friendly errors
- `src/routes/_dashboard.tsx` — Email verification check
- `src/routes/__root.tsx` — AuthProvider wrapper

## Supabase Dashboard Configuration Required

After deploying code, enable in Supabase dashboard (Authentication → Settings):
- **Enable email confirmations** (toggle on)
- **Set Site URL** to production URL
- **Add redirect URLs:** `https://yourdomain.com/api/auth/callback` and `http://localhost:3000/api/auth/callback`
- **Configure OAuth providers** (Google, Apple, Discord) with client IDs/secrets if desired
