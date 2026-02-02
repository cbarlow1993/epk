import { createBrowserClient } from '@supabase/ssr'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

export function getSupabaseBrowserClient() {
  return createBrowserClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY,
  )
}

export function getSupabaseServerClient(request: Request) {
  const headers = new Headers()

  const supabase = createServerClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return parseCookies(request.headers.get('Cookie') ?? '')
        },
        setAll(cookies) {
          for (const cookie of cookies) {
            headers.append('Set-Cookie', serializeCookie(cookie.name, cookie.value, cookie.options))
          }
        },
      },
    },
  )

  return { supabase, headers }
}

// Simple admin client for server-only operations (no cookies needed)
export function getSupabaseAdmin() {
  return createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY,
  )
}

function parseCookies(cookieHeader: string) {
  const cookies: { name: string; value: string }[] = []
  if (!cookieHeader) return cookies
  for (const pair of cookieHeader.split(';')) {
    const [name, ...rest] = pair.trim().split('=')
    if (name) cookies.push({ name, value: rest.join('=') })
  }
  return cookies
}

function serializeCookie(
  name: string,
  value: string,
  options?: Record<string, unknown>,
): string {
  let cookie = `${name}=${value}`
  if (options?.path) cookie += `; Path=${options.path}`
  if (options?.maxAge) cookie += `; Max-Age=${options.maxAge}`
  if (options?.httpOnly) cookie += `; HttpOnly`
  if (options?.secure) cookie += `; Secure`
  if (options?.sameSite) cookie += `; SameSite=${options.sameSite}`
  return cookie
}
