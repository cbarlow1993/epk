import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { withAuth } from './utils'

const POSTHOG_API_KEY = process.env.POSTHOG_API_KEY // Personal API key (not project key)
const POSTHOG_PROJECT_ID = process.env.POSTHOG_PROJECT_ID
const POSTHOG_HOST = process.env.POSTHOG_HOST || 'https://us.posthog.com'

interface AnalyticsSummary {
  pageViews: number
  uniqueVisitors: number
  topReferrers: { referrer: string; count: number }[]
  deviceBreakdown: { device: string; count: number }[]
  dailyViews: { date: string; count: number }[]
}

export const getAnalyticsSummary = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => z.object({ days: z.number().int().min(1).max(90) }).parse(data))
  .handler(async ({ data: { days } }): Promise<AnalyticsSummary | { error: string }> => {
    const { supabase, user } = await withAuth()

    // Check tier
    const { data: profile } = await supabase.from('profiles').select('tier, slug').eq('id', user.id).single()
    if (!profile || profile.tier !== 'pro') {
      return { error: 'Premium feature' }
    }

    if (!POSTHOG_API_KEY || !POSTHOG_PROJECT_ID) {
      return { error: 'Analytics not configured' }
    }

    const slug = profile.slug
    const dateFrom = new Date()
    dateFrom.setDate(dateFrom.getDate() - days)

    try {
      const response = await fetch(
        `${POSTHOG_HOST}/api/projects/${POSTHOG_PROJECT_ID}/events?event=epk_page_view&properties=[{"key":"slug","value":"${slug}","operator":"exact"}]&after=${dateFrom.toISOString()}&limit=10000`,
        {
          headers: {
            Authorization: `Bearer ${POSTHOG_API_KEY}`,
          },
        }
      )

      if (!response.ok) {
        return { error: 'Failed to fetch analytics' }
      }

      const { results } = await response.json()

      const visitors = new Set<string>()
      const referrerCounts: Record<string, number> = {}
      const deviceCounts: Record<string, number> = {}
      const dailyCounts: Record<string, number> = {}

      for (const event of results) {
        visitors.add(event.distinct_id)
        const referrer = event.properties?.referrer || 'direct'
        referrerCounts[referrer] = (referrerCounts[referrer] || 0) + 1
        const device = event.properties?.device_type || 'unknown'
        deviceCounts[device] = (deviceCounts[device] || 0) + 1
        const date = event.timestamp?.split('T')[0]
        if (date) dailyCounts[date] = (dailyCounts[date] || 0) + 1
      }

      return {
        pageViews: results.length,
        uniqueVisitors: visitors.size,
        topReferrers: Object.entries(referrerCounts)
          .map(([referrer, count]) => ({ referrer, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10),
        deviceBreakdown: Object.entries(deviceCounts)
          .map(([device, count]) => ({ device, count }))
          .sort((a, b) => b.count - a.count),
        dailyViews: Object.entries(dailyCounts)
          .map(([date, count]) => ({ date, count }))
          .sort((a, b) => a.date.localeCompare(b.date)),
      }
    } catch {
      return { error: 'Failed to process analytics' }
    }
  })

export const getAggregatedAnalytics = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => z.object({ days: z.number().int().min(1).max(90) }).parse(data))
  .handler(async ({ data: { days } }) => {
    const { supabase, user } = await withAuth()

    // Get all org profiles
    const { data: membership } = await supabase
      .from('organization_members')
      .select('organization_id, role')
      .eq('user_id', user.id)
      .in('role', ['owner', 'admin'])
      .single()

    if (!membership) return { error: 'Not authorized' }

    const { data: profiles } = await supabase
      .from('profiles')
      .select('slug, display_name')
      .eq('organization_id', membership.organization_id)

    if (!profiles || profiles.length === 0) return { error: 'No profiles' }

    if (!POSTHOG_API_KEY || !POSTHOG_PROJECT_ID) {
      return { error: 'Analytics not configured' }
    }

    const dateFrom = new Date()
    dateFrom.setDate(dateFrom.getDate() - days)

    // Query PostHog for each slug in parallel
    const results = await Promise.allSettled(
      profiles.map(async (profile: { slug: string | null; display_name: string | null }) => {
        const response = await fetch(
          `${POSTHOG_HOST}/api/projects/${POSTHOG_PROJECT_ID}/events?event=epk_page_view&properties=[{"key":"slug","value":"${profile.slug}","operator":"exact"}]&after=${dateFrom.toISOString()}&limit=10000`,
          { headers: { Authorization: `Bearer ${POSTHOG_API_KEY}` } }
        )

        if (!response.ok) return { slug: profile.slug!, name: profile.display_name || '', views: 0, visitors: 0 }

        const { results } = await response.json()
        const visitors = new Set<string>()
        for (const event of results) {
          visitors.add(event.distinct_id)
        }
        return { slug: profile.slug!, name: profile.display_name || '', views: results.length, visitors: visitors.size }
      })
    )

    const perArtist = results.map((r) =>
      r.status === 'fulfilled' ? r.value : { slug: '', name: '', views: 0, visitors: 0 }
    ).filter((a) => a.slug)

    let totalViews = 0
    let totalVisitors = 0
    for (const a of perArtist) {
      totalViews += a.views
      totalVisitors += a.visitors
    }

    perArtist.sort((a, b) => b.views - a.views)

    return {
      profiles: perArtist,
      totalViews,
      totalVisitors,
    }
  })
