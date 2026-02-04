import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { getProfile } from '~/server/profile'
import { getAnalyticsSummary } from '~/server/analytics'
import { SETTINGS_CARD, BTN_BASE } from '~/components/forms'

export const Route = createFileRoute('/_dashboard/dashboard/analytics')({
  loader: () => getProfile(),
  component: AnalyticsPage,
})

const CHART_COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981']

const TOOLTIP_STYLE = {
  contentStyle: {
    backgroundColor: '#1a1a2e',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px',
  },
}

interface AnalyticsData {
  pageViews: number
  uniqueVisitors: number
  topReferrers: { referrer: string; count: number }[]
  deviceBreakdown: { device: string; count: number }[]
  dailyViews: { date: string; count: number }[]
}

function AnalyticsPage() {
  const profile = Route.useLoaderData()
  const [days, setDays] = useState(30)
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const isPro = profile?.tier === 'pro'

  useEffect(() => {
    if (!isPro) return

    let cancelled = false
    setLoading(true)
    setError('')

    getAnalyticsSummary({ data: { days } })
      .then((result) => {
        if (cancelled) return
        if ('error' in result) {
          setError(result.error as string)
          setData(null)
        } else {
          setData(result as AnalyticsData)
        }
      })
      .catch(() => {
        if (!cancelled) setError('Failed to load analytics')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [days, isPro])

  if (!isPro) {
    return (
      <div>
        <h1 className="text-2xl font-display font-semibold tracking-tight mb-8">Analytics</h1>
        <div className={`${SETTINGS_CARD} max-w-lg`}>
          <h2 className="font-medium text-text-secondary mb-4">Pro Feature</h2>
          <p className="text-text-secondary text-sm mb-4">
            Upgrade to Pro to access detailed analytics about your EPK page views, referrers, and device breakdown.
          </p>
          <Link
            to="/dashboard/settings"
            className={`${BTN_BASE} bg-accent text-white hover:bg-accent/80 inline-block`}
          >
            Upgrade to Pro
          </Link>
        </div>
      </div>
    )
  }

  const topReferrer = data?.topReferrers?.[0]?.referrer || '-'
  const topDevice = data?.deviceBreakdown?.[0]?.device || '-'

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-display font-semibold tracking-tight">Analytics</h1>
        <div className="flex gap-2">
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDays(d)}
              className={`${BTN_BASE} ${
                days === d
                  ? 'bg-accent text-white'
                  : 'bg-bg text-text-secondary hover:text-text-primary'
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className={`${SETTINGS_CARD} mb-6`}>
          <p className="text-red-500 text-sm">{error}</p>
        </div>
      )}

      {loading && !data && (
        <p className="text-text-secondary text-sm">Loading analytics...</p>
      )}

      {data && (
        <div className="space-y-8">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className={SETTINGS_CARD}>
              <p className="text-xs font-medium text-text-secondary mb-1">Page Views</p>
              <p className="text-2xl font-black">{data.pageViews.toLocaleString()}</p>
            </div>
            <div className={SETTINGS_CARD}>
              <p className="text-xs font-medium text-text-secondary mb-1">Unique Visitors</p>
              <p className="text-2xl font-black">{data.uniqueVisitors.toLocaleString()}</p>
            </div>
            <div className={SETTINGS_CARD}>
              <p className="text-xs font-medium text-text-secondary mb-1">Top Referrer</p>
              <p className="text-lg font-bold truncate">{topReferrer}</p>
            </div>
            <div className={SETTINGS_CARD}>
              <p className="text-xs font-medium text-text-secondary mb-1">Top Device</p>
              <p className="text-lg font-bold capitalize">{topDevice}</p>
            </div>
          </div>

          {/* Daily Views Chart */}
          {data.dailyViews.length > 0 && (
            <div className={SETTINGS_CARD}>
              <h2 className="font-medium text-text-secondary mb-4">Daily Views</h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.dailyViews}>
                    <XAxis
                      dataKey="date"
                      tick={{ fill: '#9ca3af', fontSize: 11 }}
                      tickFormatter={(v: string) => v.slice(5)}
                    />
                    <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} />
                    <Tooltip {...TOOLTIP_STYLE} />
                    <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Referrers + Device Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Referrers */}
            {data.topReferrers.length > 0 && (
              <div className={SETTINGS_CARD}>
                <h2 className="font-medium text-text-secondary mb-4">Top Referrers</h2>
                <div className="space-y-2">
                  {data.topReferrers.map((r) => (
                    <div key={r.referrer} className="flex items-center justify-between text-sm">
                      <span className="text-text-secondary truncate mr-4">{r.referrer}</span>
                      <span className="font-bold shrink-0">{r.count.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Device Breakdown */}
            {data.deviceBreakdown.length > 0 && (
              <div className={SETTINGS_CARD}>
                <h2 className="font-medium text-text-secondary mb-4">Devices</h2>
                <div className="h-48 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.deviceBreakdown}
                        dataKey="count"
                        nameKey="device"
                        innerRadius={40}
                        outerRadius={80}
                        paddingAngle={2}
                      >
                        {data.deviceBreakdown.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip {...TOOLTIP_STYLE} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap gap-3 mt-2 justify-center">
                  {data.deviceBreakdown.map((d, i) => (
                    <div key={d.device} className="flex items-center gap-1.5 text-xs">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                      />
                      <span className="capitalize text-text-secondary">{d.device}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
