import { useEffect, useRef } from 'react'
import { getSupabaseBrowserClient } from '~/utils/supabase'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const wasSignedIn = useRef(false)

  useEffect(() => {
    const supabase = getSupabaseBrowserClient()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        wasSignedIn.current = true
      }
      if (event === 'SIGNED_OUT' && wasSignedIn.current) {
        // Only redirect if the user was previously signed in (multi-tab logout)
        window.location.href = '/login'
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  return <>{children}</>
}
