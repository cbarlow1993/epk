import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
} from '@tanstack/react-router'
import '../styles.css'
import { AuthProvider } from '~/components/AuthProvider'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'Issy Smith | DJ - Official Press Kit' },
      { name: 'description', content: 'Official Electronic Press Kit for DJ Issy Smith. Resident DJ at Ibiza Rocks, performing at Ministry Of Sound, Eden Ibiza and more. Booking enquiries welcome.' },
      { name: 'og:title', content: 'Issy Smith | DJ - Official Press Kit' },
      { name: 'og:description', content: 'Official Electronic Press Kit for DJ Issy Smith. Resident DJ at Ibiza Rocks, performing at Ministry Of Sound, Eden Ibiza and more.' },
      { name: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: 'Issy Smith | DJ - Official Press Kit' },
      { name: 'twitter:description', content: 'Official Electronic Press Kit for DJ Issy Smith.' },
    ],
    links: [
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
      { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,200..800&family=Instrument+Sans:wght@400;500;600;700&display=swap' },
    ],
    scripts: [
      {
        type: 'application/ld+json',
        children: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'MusicGroup',
          name: 'Issy Smith',
          description: 'UK-based DJ specialising in House, Commercial House, Deep/Tech, Afro House, Nu-Disco, Funky House, Tech House, and Melodic House & Techno.',
          genre: ['House', 'Tech House', 'Melodic House', 'Afro House'],
          url: 'https://issysmithdj.com',
        }),
      },
    ],
  }),
  component: RootComponent,
})

function RootComponent() {
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
