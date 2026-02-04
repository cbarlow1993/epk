import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { acceptInvite } from '~/server/team'

export const Route = createFileRoute('/invite/$token')({
  component: InviteAcceptPage,
})

function InviteAcceptPage() {
  const { token } = Route.useParams()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [error, setError] = useState('')

  useEffect(() => {
    acceptInvite({ data: { token } }).then((result) => {
      if ('error' in result && result.error) {
        setError(typeof result.error === 'string' ? result.error : 'Failed to accept invite')
        setStatus('error')
      } else {
        setStatus('success')
        setTimeout(() => { window.location.href = '/dashboard' }, 2000)
      }
    })
  }, [token])

  return (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center px-4">
      <div className="text-center">
        {status === 'loading' && <p className="text-text-secondary">Accepting invite...</p>}
        {status === 'success' && (
          <>
            <p className="text-accent font-bold text-lg mb-2">Welcome to the team!</p>
            <p className="text-text-secondary text-sm">Redirecting to dashboard...</p>
          </>
        )}
        {status === 'error' && (
          <p className="text-red-400">{error}</p>
        )}
      </div>
    </div>
  )
}
