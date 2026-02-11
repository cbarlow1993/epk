import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
  useRouter,
} from '@tanstack/react-router'
import { useEffect } from 'react'
import '../styles.css'
import { AuthProvider } from '~/components/AuthProvider'

const GA_ID = 'G-V4TS3G7GD6'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'myEPK — Professional Press Kits for DJs & Artists' },
      { name: 'description', content: 'Create a stunning electronic press kit in minutes. Share your bio, mixes, photos, and booking info — all on one beautiful page.' },
      { name: 'og:title', content: 'myEPK — Professional Press Kits for DJs & Artists' },
      { name: 'og:description', content: 'Create a stunning electronic press kit in minutes. Share your bio, mixes, photos, and booking info — all on one beautiful page.' },
      { name: 'og:type', content: 'website' },
      { name: 'og:url', content: 'https://myepk.bio' },
      { name: 'og:image', content: 'https://myepk.bio/og-default.png' },
      { name: 'og:image:width', content: '1200' },
      { name: 'og:image:height', content: '630' },
      { name: 'og:image:alt', content: 'myEPK — Professional press kits for DJs & artists' },
      { name: 'og:site_name', content: 'myEPK' },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: 'myEPK — Professional Press Kits for DJs & Artists' },
      { name: 'twitter:description', content: 'Create a stunning electronic press kit in minutes. Share your bio, mixes, photos, and booking info — all on one beautiful page.' },
      { name: 'twitter:image', content: 'https://myepk.bio/og-default.png' },
    ],
    links: [
      { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
      { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,200..800&family=DM+Sans:wght@400;500;600;700&family=Instrument+Sans:wght@400;500;600;700&family=Sora:wght@400;500;600;700;800&display=swap' },
    ],
    scripts: [
      {
        src: `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`,
        async: true,
      },
      {
        children: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_ID}');`,
      },
      {
        type: 'application/ld+json',
        children: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'WebApplication',
          name: 'myEPK',
          description: 'Create a professional electronic press kit for DJs and artists. Share your bio, mixes, photos, and booking info on one beautiful page.',
          url: 'https://myepk.bio',
          applicationCategory: 'EntertainmentApplication',
          offers: {
            '@type': 'Offer',
            price: '0',
            priceCurrency: 'USD',
            description: 'Free plan available',
          },
        }),
      },
    ],
  }),
  component: RootComponent,
})

function RootComponent() {
  const router = useRouter()

  useEffect(() => {
    return router.subscribe('onResolved', (evt) => {
      if (typeof window.gtag === 'function') {
        window.gtag('event', 'page_view', {
          page_path: evt.toLocation.pathname,
        })
      }
    })
  }, [router])

  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body className="bg-bg text-text-primary font-body antialiased">
        <AuthProvider>
          <Outlet />
        </AuthProvider>
        <Scripts />
      </body>
    </html>
  )
}
