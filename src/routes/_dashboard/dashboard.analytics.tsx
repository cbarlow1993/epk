import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
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

const RANGE_OPTIONS = [
  { label: '7 days', value: 7 },
  { label: '30 days', value: 30 },
  { label: '90 days', value: 90 },
] as const

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
  const [loaded, setLoaded] = useState(false)

  const isPro = profile?.tier === 'pro'

  const fetchAnalytics = async (selectedDays: number) => {
    setLoading(true)
    setError('')
    try {
      const result = await getAnalyticsSummary({ data: { days: selectedDays } })
      if ('error' in result) {
        setError(result.error)
        setData(null)
      } else {
        setData(result)
      }
    } catch {
      setError('Failed to load analytics')
    } finally {
      setLoading(false)
      setLoaded(true)
    }
  }

  const handleRangeChange = (newDays: number) => {
    setDays(newDays)
    if (isPro) fetchAnalytics(newDays)
  }

  // Load data on first render for pro users
  if (isPro && !loaded && !loading) {
    fetchAnalytics(days)
  }

  if (!isPro) {
    return (
      <div>
        <h1 className="text-2xl font-black uppercase tracking-wider mb-8">Analytics</h1>
        <div className={`${SETTINGS_CARD} text-center py-12`}>
          <div className="text-4xl mb-4">&#128202;</div>
          <h2 className="text-lg font-bold mb-2">Unlock Analytics</h2>
          <p className="text-text-secondary text-sm mb-6 max-w-md mx-auto">
            See who's viewing your EPK, where they come from, and what devices they use.
            Upgrade to Pro to access detailed analytics.
          </p>
          <Link
            to="/dashboard/settings"
            className={`${BTN_BASE} bg-accent text-black hover:bg-accent/80 inline-block`}
          >
            Upgrade to Pro
          </Link>
        </div>
      </div>
    )
  }

  const topReferrer = data?.topReferrers?.[0]?.referrer ?? '-'
  const topDevice = data?.deviceBreakdown?.[0]?.device ?? '-'

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-black uppercase tracking-wider">Analytics</h1>
        <div className="flex gap-2">
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => handleRangeChange(opt.value)}
              className={`${BTN_BASE} text-xs ${
                days === opt.value
                  ? 'bg-accent text-black'
                  : 'bg-white/5 text-text-secondary hover:text-white hover:bg-white/10'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className={`${SETTINGS_CARD} mb-6`}>
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {loading && !data && (
        <div className={`${SETTINGS_CARD} text-center py-12`}>
          <p className="text-text-secondary text-sm">Loading analytics...</p>
        </div>
      )}

      {data && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <SummaryCard label="Page Views" value={data.pageViews.toLocaleString()} />
            <SummaryCard label="Unique Visitors" value={data.uniqueVisitors.toLocaleString()} />
            <SummaryCard label="Top Referrer" value={topReferrer} />
            <SummaryCard label="Top Device" value={topDevice} />
          </div>

          {/* Daily Views Chart */}
          <div className={SETTINGS_CARD}>
            <h2 className="text-sm uppercase tracking-widest font-bold mb-4">Daily Views</h2>
            {data.dailyViews.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.dailyViews}>
                    <XAxis
                      dataKey="date"
                      tick={{ fill: '#9ca3af', fontSize: 11 }}
                      tickFormatter={(value: string) => {
                        const parts = value.split('-')
                        return `${parts[1]}/${parts[2]}`
                      }}
                    />
                    <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} allowDecimals={false} />
                    <Tooltip
                      contentStyle={TOOLTIP_STYLE.contentStyle}
                      labelStyle={{ color: '#fff' }}
                      itemStyle={{ color: '#3b82f6' }}
                    />
                    <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-text-secondary text-sm py-8 text-center">No view data for this period.</p>
            )}
          </div>

          {/* Bottom row: Referrers + Devices */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Referrers */}
            <div className={SETTINGS_CARD}>
              <h2 className="text-sm uppercase tracking-widest font-bold mb-4">Top Referrers</h2>
              {data.topReferrers.length > 0 ? (
                <div className="space-y-2">
                  {data.topReferrers.map((ref) => {
                    const maxCount = data.topReferrers[0].count
                    const pct = maxCount > 0 ? (ref.count / maxCount) * 100 : 0
                    return (
                      <div key={ref.referrer}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="truncate mr-4">{ref.referrer}</span>
                          <span className="text-text-secondary shrink-0">{ref.count}</span>
                        </div>
                        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-accent rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-text-secondary text-sm">No referrer data yet.</p>
              )}
            </div>

            {/* Device Breakdown */}
            <div className={SETTINGS_CARD}>
              <h2 className="text-sm uppercase tracking-widest font-bold mb-4">Devices</h2>
              {data.deviceBreakdown.length > 0 ? (
                <div className="flex items-center gap-6">
                  <div className="w-40 h-40 shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={data.deviceBreakdown}
                          dataKey="count"
                          nameKey="device"
                          cx="50%"
                          cy="50%"
                          innerRadius={35}
                          outerRadius={60}
                          paddingAngle={2}
                        >
                          {data.deviceBreakdown.map((_, idx) => (
                            <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={TOOLTIP_STYLE.contentStyle}
                          labelStyle={{ color: '#fff' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-2 flex-1">
                    {data.deviceBreakdown.map((d, idx) => (
                      <div key={d.device} className="flex items-center gap-2 text-sm">
                        <div
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }}
                        />
                        <span className="capitalize">{d.device}</span>
                        <span className="text-text-secondary ml-auto">{d.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-text-secondary text-sm">No device data yet.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className={SETTINGS_CARD}>
      <p className="text-xs uppercase tracking-widest text-text-secondary mb-1">{label}</p>
      <p className="text-xl font-bold truncate">{value}</p>
    </div>
  )
}
