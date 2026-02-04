import { createClient } from '@supabase/supabase-js'

const MAIN_DOMAINS = [
  'localhost',
  'localhost:3000',
  '127.0.0.1',
  'epk-chi.vercel.app',
]

// Module-scoped client — stateless, safe to reuse across requests
const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export default defineEventHandler(async (event) => {
  const url = getRequestURL(event)
  const hostname = url.hostname
  const host = url.host // includes port

  // Skip for main domains — exact match on hostname or host (with port)
  if (MAIN_DOMAINS.some((d) => hostname === d || host === d)) {
    return
  }

  // Skip for API routes and assets
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/_build/') ||
    url.pathname.startsWith('/assets/')
  ) {
    return
  }

  // Only rewrite the root path for custom domains
  if (url.pathname === '/' || url.pathname === '') {
    const { data: profile } = await supabase
      .from('profiles')
      .select('slug')
      .eq('custom_domain', hostname)
      .eq('published', true)
      .single()

    if (profile) {
      // Internal rewrite to the slug route
      url.pathname = `/${profile.slug}`
      event.node!.req.url = url.pathname + url.search
    }
  }
})
