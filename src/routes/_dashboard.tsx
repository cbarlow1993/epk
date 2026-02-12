import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { getCurrentUser } from '~/server/auth'
import { DashboardSidebar } from '~/components/DashboardSidebar'
import { EqBars } from '~/components/EqBars'

export const Route = createFileRoute('/_dashboard')({
  loader: async () => {
    const result = await getCurrentUser()
    if (!result) {
      throw redirect({ to: '/login' })
    }

    // Enforce email verification
    if (!result.user.email_confirmed_at) {
      throw redirect({ to: '/verify-email' })
    }

    // Enforce onboarding completion
    if (!result.profile?.onboarding_completed) {
      throw redirect({ to: '/onboarding' })
    }

    return { user: result.user, profile: result.profile }
  },
  pendingMs: 200,
  pendingComponent: DashboardLoading,
  component: DashboardLayout,
})

function DashboardLoading() {
  return (
    <div className="theme-dark min-h-screen bg-bg flex flex-col items-center justify-center gap-6">
      <EqBars className="h-12" barCount={24} />
      <p className="text-text-secondary text-sm font-body animate-pulse">Loading...</p>
    </div>
  )
}

function DashboardLayout() {
  const { profile } = Route.useLoaderData()

  const safeProfile = {
    slug: profile?.slug || '',
    display_name: profile?.display_name || 'New User',
    profile_image_url: profile?.profile_image_url || '',
    published: profile?.published ?? false,
  }

  return (
    <div className="theme-dark min-h-screen bg-bg text-text-primary font-body flex">
      <DashboardSidebar profile={safeProfile} />
      <main className="flex-1 p-6 pt-20 md:pt-10 md:p-10 md:ml-64">
        <Outlet />
      </main>
    </div>
  )
}
