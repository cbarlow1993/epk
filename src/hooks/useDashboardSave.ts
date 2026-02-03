import { useState } from 'react'

type MutationFn = (args: { data: any }) => Promise<unknown>

export function useDashboardSave(mutationFn: MutationFn) {
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const onSave = async (data: Record<string, unknown>) => {
    setSaving(true)
    setSaved(false)
    setError('')
    try {
      const result = await mutationFn({ data })
      if (result && typeof result === 'object' && 'error' in result) {
        setError((result as { error: string }).error)
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
