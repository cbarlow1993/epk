/**
 * Lightweight GA4 event helpers.
 * All calls are no-ops when gtag isn't loaded (e.g. dev, ad-blockers).
 */

function send(event: string, params?: Record<string, string | number>) {
  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    window.gtag('event', event, params)
  }
}

/** CTA button clicked (hero, pricing, footer CTA) */
export function trackCTA(label: string, location: string) {
  send('cta_click', { cta_label: label, cta_location: location })
}

/** OAuth provider button clicked */
export function trackOAuthClick(provider: string) {
  send('oauth_click', { provider })
}

/** Email signup form submitted */
export function trackSignupSubmit() {
  send('signup_submit', { method: 'email' })
}

/** Signup completed (email confirmed or OAuth success) */
export function trackSignupComplete(method: string) {
  send('sign_up', { method })
}

/** Nav link clicked */
export function trackNavClick(label: string) {
  send('nav_click', { link_label: label })
}

/** Landing page section scrolled into view */
export function trackSectionView(section: string) {
  send('section_view', { section_name: section })
}
