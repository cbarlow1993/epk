import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { withAuth } from './utils'

const VERCEL_TOKEN = process.env.VERCEL_TOKEN
const VERCEL_PROJECT_ID = process.env.VERCEL_PROJECT_ID
const VERCEL_TEAM_ID = process.env.VERCEL_TEAM_ID

export const addCustomDomain = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => z.object({ domain: z.string().min(1).max(253).regex(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/, 'Invalid domain format') }).parse(data))
  .handler(async ({ data }) => {
    const { supabase, user } = await withAuth()

    const { data: profile } = await supabase.from('profiles').select('tier').eq('id', user.id).single()
    if (profile?.tier !== 'pro') return { error: 'Pro plan required for custom domains' }

    const teamParam = VERCEL_TEAM_ID ? `&teamId=${VERCEL_TEAM_ID}` : ''
    const res = await fetch(`https://api.vercel.com/v10/projects/${VERCEL_PROJECT_ID}/domains?${teamParam}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${VERCEL_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: data.domain }),
    })

    if (!res.ok) {
      const err = await res.json()
      return { error: err.error?.message || 'Failed to add domain' }
    }

    await supabase.from('profiles').update({ custom_domain: data.domain }).eq('id', user.id)
    return { success: true, domain: data.domain }
  })

export const removeCustomDomain = createServerFn({ method: 'POST' }).handler(async () => {
  const { supabase, user } = await withAuth()

  const { data: profile } = await supabase.from('profiles').select('custom_domain').eq('id', user.id).single()
  if (!profile?.custom_domain) return { error: 'No custom domain configured' }

  const teamParam = VERCEL_TEAM_ID ? `?teamId=${VERCEL_TEAM_ID}` : ''
  const res = await fetch(`https://api.vercel.com/v10/projects/${VERCEL_PROJECT_ID}/domains/${profile.custom_domain}${teamParam}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${VERCEL_TOKEN}` },
  })

  if (!res.ok) {
    return { error: 'Failed to remove domain from hosting provider' }
  }

  await supabase.from('profiles').update({ custom_domain: null }).eq('id', user.id)
  return { success: true }
})

export const checkDomainStatus = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => z.object({ domain: z.string().min(1).max(253) }).parse(data))
  .handler(async ({ data }) => {
    const { supabase, user } = await withAuth()

    // Verify the domain belongs to this user
    const { data: profile } = await supabase
      .from('profiles')
      .select('custom_domain')
      .eq('id', user.id)
      .single()

    if (profile?.custom_domain !== data.domain) return { configured: false }

    const teamParam = VERCEL_TEAM_ID ? `?teamId=${VERCEL_TEAM_ID}` : ''
    const res = await fetch(`https://api.vercel.com/v10/projects/${VERCEL_PROJECT_ID}/domains/${data.domain}${teamParam}`, {
      headers: { Authorization: `Bearer ${VERCEL_TOKEN}` },
    })

    if (!res.ok) return { configured: false }
    const domainData = await res.json()
    return { configured: domainData.verified || false }
  })
