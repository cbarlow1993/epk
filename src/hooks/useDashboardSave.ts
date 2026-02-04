import { useState } from 'react'

type ServerResult = { error: string } | Record<string, unknown>
type MutationFn<T> = (args: { data: T }) => Promise<ServerResult>

export function useDashboardSave<T extends Record<string, unknown>>(mutationFn: MutationFn<T>) {
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const onSave = async (data: T) => {
    setSaving(true)
    setSaved(false)
    setError('')
    try {
      const result = await mutationFn({ data })
      if ('error' in result && typeof result.error === 'string') {
        setError(result.error)
      } else {
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      }
    } catch {
      setError('Failed to save. Please try again.')
    }
    setSaving(false)
  }

  return { saving, saved, error, onSave }
}
