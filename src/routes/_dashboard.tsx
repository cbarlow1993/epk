import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { getCurrentUser } from '~/server/auth'
import { getChecklistBadge } from '~/server/checklist'
import { DashboardSidebar } from '~/components/DashboardSidebar'

export const Route = createFileRoute('/_dashboard')({
  beforeLoad: async () => {
    const result = await getCurrentUser()
    if (!result) {
      throw redirect({ to: '/login' })
    }

    const showNextBadge = result.profile ? await getChecklistBadge({ data: { profileId: result.profile.id } }) : false

    return { user: result.user, profile: result.profile, showNextBadge }
  },
  component: DashboardLayout,
})

function DashboardLayout() {
  const { profile, showNextBadge } = Route.useRouteContext()

  const safeProfile = {
    slug: profile?.slug || '',
    display_name: profile?.display_name || 'New User',
    profile_image_url: profile?.profile_image_url || '',
    published: profile?.published ?? false,
  }

  return (
    <div className="min-h-screen bg-bg flex">
      <DashboardSidebar profile={safeProfile} showNextBadge={showNextBadge} />
      <main className="flex-1 p-6 pt-20 md:pt-10 md:p-10 md:ml-64">
        <Outlet />
      </main>
    </div>
  )
}
