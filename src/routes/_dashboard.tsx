import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { getCurrentUser } from '~/server/auth'
import { DashboardSidebar } from '~/components/DashboardSidebar'

export const Route = createFileRoute('/_dashboard')({
  beforeLoad: async () => {
    const result = await getCurrentUser()
    if (!result) {
      throw redirect({ to: '/login' })
    }
    return { user: result.user, profile: result.profile }
  },
  component: DashboardLayout,
})

function DashboardLayout() {
  const { profile } = Route.useRouteContext()

  return (
    <div className="min-h-screen bg-dark-bg flex">
      <DashboardSidebar profile={profile} />
      <main className="flex-1 p-6 md:p-10 md:ml-64">
        <Outlet />
      </main>
    </div>
  )
}
