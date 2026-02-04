import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import {
  getCookies,
  setCookie,
  deleteCookie,
} from '@tanstack/react-start/server'

export function getSupabaseServerClient() {
  const supabase = createServerClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_KEY,
    {
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

// Admin client for server-only operations that bypass RLS (no cookies needed)
export function getSupabaseAdmin() {
  return createClient(
    import.meta.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}
