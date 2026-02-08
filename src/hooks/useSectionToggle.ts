import { useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import { getProfile, updateProfile } from '~/server/profile'

export function useSectionToggle(sectionId: string, initialVisibility?: Record<string, boolean> | null) {
  const router = useRouter()
  const initialValue = initialVisibility ? initialVisibility[sectionId] !== false : true
  const [enabled, setEnabled] = useState(initialValue)
  const [initialEnabled, setInitialEnabled] = useState(initialValue)

  const toggle = () => setEnabled((prev) => !prev)

  const isDirty = enabled !== initialEnabled

  const save = async () => {
    if (!isDirty) return
    // Fetch current visibility to merge (avoids overwriting other sections)
    const profile = await getProfile()
    const current = (profile?.section_visibility as Record<string, boolean>) || {}
    await updateProfile({ data: { section_visibility: { ...current, [sectionId]: enabled } } })
    setInitialEnabled(enabled)
    router.invalidate()
  }

  return { enabled, toggle, isDirty, save }
}
