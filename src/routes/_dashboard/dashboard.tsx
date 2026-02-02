import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_dashboard/dashboard')({
  component: DashboardHome,
})

function DashboardHome() {
  return (
    <div>
      <h1 className="text-2xl font-black uppercase tracking-wider mb-8">Profile</h1>
      <p className="text-text-secondary">Dashboard profile editor coming next...</p>
    </div>
  )
}
