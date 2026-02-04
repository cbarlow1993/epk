import { useEffect } from 'react'
import posthog from 'posthog-js'

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com'

let initialized = false

interface AnalyticsProps {
  slug: string
  profileId?: string
}

export function Analytics({ slug }: AnalyticsProps) {
  useEffect(() => {
    if (!POSTHOG_KEY || typeof window === 'undefined') return

    if (!initialized) {
      posthog.init(POSTHOG_KEY, {
        api_host: POSTHOG_HOST,
        persistence: 'memory',
        capture_pageview: false,
        capture_pageleave: true,
        autocapture: false,
      })
      initialized = true
    }

    posthog.capture('epk_page_view', {
      slug,
      referrer: document.referrer || 'direct',
      device_type: window.innerWidth < 768 ? 'mobile' : window.innerWidth < 1024 ? 'tablet' : 'desktop',
    })
  }, [slug])

  return null
}

export function trackSectionView(slug: string, section: string) {
  if (!POSTHOG_KEY || typeof window === 'undefined') return
  posthog.capture('epk_section_view', { slug, section })
}

export function trackEmbedPlay(slug: string, mixTitle: string, platform: string) {
  if (!POSTHOG_KEY || typeof window === 'undefined') return
  posthog.capture('epk_embed_play', { slug, mix_title: mixTitle, platform })
}

export function trackFileDownload(slug: string, fileName: string) {
  if (!POSTHOG_KEY || typeof window === 'undefined') return
  posthog.capture('epk_file_download', { slug, file_name: fileName })
}

export function trackBookingSubmit(slug: string) {
  if (!POSTHOG_KEY || typeof window === 'undefined') return
  posthog.capture('epk_booking_submit', { slug })
}
