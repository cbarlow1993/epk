import { useSearch, useNavigate } from '@tanstack/react-router'

export function useActiveProfile() {
  // Read ?profile=uuid from URL search params
  const search = useSearch({ strict: false }) as { profile?: string }
  const navigate = useNavigate()

  const activeProfileId = search.profile || null

  const setActiveProfile = (profileId: string | null) => {
    navigate({
      search: (prev: Record<string, unknown>) => {
        if (profileId) return { ...prev, profile: profileId }
        const { profile: _removed, ...rest } = prev
        return rest
      },
    } as Parameters<typeof navigate>[0])
  }

  return { activeProfileId, setActiveProfile }
}
