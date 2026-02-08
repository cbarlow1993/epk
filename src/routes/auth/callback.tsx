import { createFileRoute, redirect } from '@tanstack/react-router'
import { z } from 'zod'
import { exchangeAuthCode } from '~/server/auth'

export const Route = createFileRoute('/auth/callback')({
  validateSearch: z.object({
    code: z.string().optional(),
    next: z.string().optional(),
  }),
  beforeLoad: async ({ search }) => {
    const { code, next } = search

    if (!code) {
      throw redirect({ to: '/login', search: { error: 'Missing auth code' } })
    }

    // Prevent open redirect: only allow relative paths
    const safeNext = next && next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard'

    const result = await exchangeAuthCode({ data: { code } })

    if (result && 'error' in result && result.error) {
      throw redirect({ to: '/login', search: { error: result.error } })
    }

    throw redirect({ to: safeNext })
  },
  component: () => null,
})
