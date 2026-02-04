import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { getAggregatedAnalytics } from '~/server/analytics'
import { getOrganization } from '~/server/organizations'
import { BTN_PRIMARY, CARD_SECTION } from '~/components/forms'

export const Route = createFileRoute('/_dashboard/dashboard/analytics-overview')({
  loader: async () => {
    const org = await getOrganization()
    return { org }
  },
  component: AnalyticsOverviewPage,
})

function AnalyticsOverviewPage() {
  const { org } = Route.useLoaderData()
  const [days, setDays] = useState(30)
  const [data, setData] = useState<{
    profiles: { slug: string; name: string; views: number; visitors: number }[]
    totalViews: number
    totalVisitors: number
  } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!org || (org.userRole !== 'owner' && org.userRole !== 'admin')) {
    return (
      <div>
        <h1 className="text-2xl font-black uppercase tracking-wider mb-8">Analytics Overview</h1>
        <p className="text-text-secondary">Agency analytics is available to organization owners and admins.</p>
      </div>
    )
  }

  const fetchData = async (d: number) => {
    setLoading(true)
    setError('')
    const result = await getAggregatedAnalytics({ data: { days: d } })
    if ('error' in result && result.error) {
      setError(typeof result.error === 'string' ? result.error : 'Failed to fetch analytics')
    } else if ('profiles' in result) {
      setData(result as typeof data)
    }
    setLoading(false)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-black uppercase tracking-wider">Analytics Overview</h1>
        <div className="flex gap-2">
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => { setDays(d); fetchData(d) }}
              className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-colors ${
                days === d ? 'bg-accent text-black' : 'bg-white/10 text-text-secondary hover:text-white'
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {!data && !loading && !error && (
        <div className="text-center py-12">
          <p className="text-text-secondary mb-4">Select a time range to view aggregated analytics across all artists.</p>
          <button onClick={() => fetchData(days)} className={BTN_PRIMARY}>
            Load Analytics
          </button>
        </div>
      )}

      {loading && <p className="text-text-secondary text-center py-8">Loading analytics...</p>}
      {error && <p className="text-red-400 text-center py-8">{error}</p>}

      {data && (
        <>
          {/* Summary */}
          <div className={CARD_SECTION}>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <p className="text-3xl font-black text-accent">{data.totalViews.toLocaleString()}</p>
                <p className="text-xs text-text-secondary uppercase tracking-wider mt-1">Total Page Views</p>
              </div>
              <div>
                <p className="text-3xl font-black">{data.totalVisitors.toLocaleString()}</p>
                <p className="text-xs text-text-secondary uppercase tracking-wider mt-1">Unique Visitors</p>
              </div>
            </div>
          </div>

          {/* Per-Artist Ranking */}
          <h2 className="text-sm uppercase tracking-widest font-bold text-text-secondary mb-4">Per Artist</h2>
          <div className="space-y-3">
            {data.profiles.map((profile, i) => {
              const maxViews = data.profiles[0]?.views || 1
              const barWidth = Math.max((profile.views / maxViews) * 100, 2)
              return (
                <div key={profile.slug} className="bg-dark-card border border-white/10 rounded-xl p-4">
                  <div className="flex items-center gap-4 mb-2">
                    <span className="text-xs text-text-secondary font-bold w-6">#{i + 1}</span>
                    <div className="flex-1">
                      <p className="font-bold text-sm">{profile.name}</p>
                      <p className="text-xs text-text-secondary">/{profile.slug}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-sm">{profile.views.toLocaleString()}</p>
                      <p className="text-xs text-text-secondary">{profile.visitors.toLocaleString()} visitors</p>
                    </div>
                  </div>
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-accent rounded-full transition-all" style={{ width: `${barWidth}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
