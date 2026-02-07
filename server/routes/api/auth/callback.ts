// server/routes/api/auth/callback.ts
// Handles OAuth callbacks, email verification, and password reset PKCE code exchange.
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
