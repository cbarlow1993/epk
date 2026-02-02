# Issy Smith EPK Website Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a single-page scrolling EPK website for DJ Issy Smith using TanStack Start, optimised for SEO, deployed on Vercel.

**Architecture:** TanStack Start with SSR for SEO, single index route rendering all sections as React components. Tailwind CSS v4 for styling with a dark theme. Nitro server with Vercel preset for deployment.

**Tech Stack:** TanStack Start (React), Tailwind CSS v4, Vite 7, Nitro, TypeScript, Google Fonts (Inter)

---

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`
- Create: `vite.config.ts`
- Create: `tsconfig.json`
- Create: `src/router.tsx`
- Create: `src/styles.css`
- Create: `src/routes/__root.tsx`
- Create: `src/routes/index.tsx`

**Step 1: Initialise the project**

```bash
cd /Users/chrisbarlow/Documents/issy/epk
npm init -y
```

**Step 2: Install dependencies**

```bash
npm install react react-dom @tanstack/react-router @tanstack/react-start
npm install -D vite @vitejs/plugin-react typescript @types/react @types/react-dom tailwindcss @tailwindcss/vite nitro vite-tsconfig-paths
```

**Step 3: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "moduleResolution": "bundler",
    "module": "ESNext",
    "target": "ES2022",
    "skipLibCheck": true,
    "strict": true,
    "paths": {
      "~/*": ["./src/*"]
    }
  },
  "include": ["src"]
}
```

**Step 4: Create `vite.config.ts`**

```ts
import { defineConfig } from 'vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import tsConfigPaths from 'vite-tsconfig-paths'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { nitro } from 'nitro/vite'

export default defineConfig({
  server: {
    port: 3000,
  },
  plugins: [
    tailwindcss(),
    tsConfigPaths({ projects: ['./tsconfig.json'] }),
    tanstackStart({ tsr: { srcDir: 'src' } }),
    viteReact(),
    nitro(),
  ],
})
```

**Step 5: Create `src/styles.css`**

```css
@import 'tailwindcss';

@theme {
  --color-dark-bg: #0a0a0f;
  --color-dark-surface: #12121a;
  --color-dark-card: rgba(20, 20, 35, 0.7);
  --color-accent: #3b82f6;
  --color-accent-glow: #1e90ff;
  --color-text-secondary: #a0a0b0;
  --font-display: 'Inter', sans-serif;
}
```

**Step 6: Create `src/router.tsx`**

```tsx
import { createRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'

export function getRouter() {
  return createRouter({
    routeTree,
    defaultPreload: 'intent',
    scrollRestoration: true,
  })
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
```

**Step 7: Create `src/routes/__root.tsx`**

This is the HTML shell with SEO meta tags, Google Fonts, and global layout.

```tsx
import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
} from '@tanstack/react-router'

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
      { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap' },
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
      <body className="bg-dark-bg text-white font-display antialiased">
        <Outlet />
        <Scripts />
      </body>
    </html>
  )
}
```

**Step 8: Create `src/routes/index.tsx` (minimal placeholder)**

```tsx
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  return (
    <main>
      <h1>Issy Smith EPK</h1>
    </main>
  )
}
```

**Step 9: Update `package.json` scripts**

Add to package.json:
```json
{
  "type": "module",
  "scripts": {
    "dev": "vite dev",
    "build": "vite build && tsc --noEmit",
    "preview": "vite preview",
    "start": "node .output/server/index.mjs"
  }
}
```

**Step 10: Run dev server and verify it starts**

```bash
npm run dev
```
Expected: Dev server starts on port 3000, page renders "Issy Smith EPK".

**Step 11: Commit**

```bash
git init && git add -A && git commit -m "feat: scaffold TanStack Start project with Tailwind CSS v4"
```

---

### Task 2: Navigation Component

**Files:**
- Create: `src/components/Nav.tsx`
- Modify: `src/routes/index.tsx`

**Step 1: Create `src/components/Nav.tsx`**

Sticky top nav with transparent background that gains a backdrop blur on scroll. Contains anchor links to each section.

```tsx
import { useState, useEffect } from 'react'

const NAV_ITEMS = [
  { label: 'Bio', href: '#bio' },
  { label: 'Music', href: '#highlights' },
  { label: 'Events', href: '#events' },
  { label: 'Technical', href: '#technical' },
  { label: 'Contact', href: '#contact' },
]

export function Nav() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-dark-bg/80 backdrop-blur-md shadow-lg' : 'bg-transparent'
      }`}
    >
      <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        <a href="#" className="text-lg font-bold tracking-wider">ISSY SMITH</a>
        <div className="hidden md:flex gap-6">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-sm uppercase tracking-widest text-text-secondary hover:text-white transition-colors"
            >
              {item.label}
            </a>
          ))}
        </div>
      </div>
    </nav>
  )
}
```

**Step 2: Import Nav into `src/routes/index.tsx`**

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { Nav } from '~/components/Nav'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  return (
    <>
      <Nav />
      <main>
        <h1>Issy Smith EPK</h1>
      </main>
    </>
  )
}
```

**Step 3: Verify nav renders and scroll behaviour works**

```bash
npm run dev
```

**Step 4: Commit**

```bash
git add -A && git commit -m "feat: add sticky navigation with anchor links"
```

---

### Task 3: Hero Section

**Files:**
- Create: `src/components/Hero.tsx`
- Modify: `src/routes/index.tsx`
- Create: `public/images/` (placeholder directory)

**Step 1: Create placeholder hero image directory**

```bash
mkdir -p public/images
```

**Step 2: Create `src/components/Hero.tsx`**

Full-viewport hero with dark gradient overlay, name, subtitle, and social links.

```tsx
export function Hero() {
  return (
    <section className="relative h-screen flex items-center justify-center overflow-hidden">
      {/* Background placeholder - replace with actual hero image */}
      <div className="absolute inset-0 bg-gradient-to-b from-dark-bg via-dark-surface to-dark-bg" />
      <div className="absolute inset-0 bg-gradient-to-t from-dark-bg/90 via-transparent to-dark-bg/60" />

      <div className="relative z-10 text-center">
        <h1 className="text-6xl md:text-8xl font-black tracking-tight mb-2">
          ISSY SMITH
        </h1>
        <p className="text-lg md:text-xl tracking-[0.3em] text-text-secondary uppercase mb-8">
          Presskit / EPK
        </p>
        <div className="flex items-center justify-center gap-6">
          <a
            href="#"
            aria-label="SoundCloud"
            className="w-10 h-10 rounded-full border border-text-secondary/30 flex items-center justify-center hover:border-accent transition-colors"
          >
            <SoundCloudIcon />
          </a>
          <a
            href="#"
            aria-label="Instagram"
            className="w-10 h-10 rounded-full border border-text-secondary/30 flex items-center justify-center hover:border-accent transition-colors"
          >
            <InstagramIcon />
          </a>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <svg className="w-6 h-6 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7" />
        </svg>
      </div>
    </section>
  )
}

function SoundCloudIcon() {
  return (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M1.175 12.225c-.051 0-.094.046-.101.1l-.233 2.154.233 2.105c.007.058.05.098.101.098.05 0 .09-.04.099-.098l.255-2.105-.27-2.154c-.009-.06-.05-.1-.084-.1zm-.899.828c-.06 0-.091.037-.104.094L0 14.479l.165 1.308c.014.055.045.094.107.094.063 0 .09-.045.09-.094l.199-1.308-.192-1.332c0-.057-.029-.094-.093-.094zm1.83-1.229c-.063 0-.12.045-.12.104l-.21 2.563.225 2.458c0 .06.045.104.106.104.061 0 .12-.044.12-.104l.24-2.458-.24-2.563c0-.06-.059-.104-.12-.104zm.945-.089c-.075 0-.135.06-.15.135l-.193 2.787.21 2.61c.014.075.074.135.149.135.075 0 .135-.06.135-.135l.224-2.61-.209-2.787c0-.075-.075-.135-.165-.135zm.96-.315c-.09 0-.165.075-.165.165l-.176 3.063.176 2.633c0 .09.075.164.165.164.089 0 .164-.074.164-.164l.194-2.633-.21-3.063c-.015-.09-.074-.165-.149-.165z" />
    </svg>
  )
}

function InstagramIcon() {
  return (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
    </svg>
  )
}
```

**Step 3: Add Hero to index.tsx**

Update index.tsx to include `<Hero />` inside `<main>`.

**Step 4: Verify hero renders full-viewport**

**Step 5: Commit**

```bash
git add -A && git commit -m "feat: add hero section with social links"
```

---

### Task 4: Bio Section

**Files:**
- Create: `src/components/Bio.tsx`
- Modify: `src/routes/index.tsx`

**Step 1: Create `src/components/Bio.tsx`**

Two-column layout with the full bio text from the PDF, blue divider line at top.

```tsx
export function Bio() {
  return (
    <section id="bio" className="py-20 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Blue accent line */}
        <div className="w-20 h-1 bg-accent mb-8 shadow-[0_0_10px_var(--color-accent-glow)]" />
        <h2 className="text-4xl md:text-5xl font-black uppercase tracking-wider mb-12">Bio</h2>

        <div className="grid md:grid-cols-2 gap-8 md:gap-12 text-text-secondary leading-relaxed">
          <div className="space-y-4">
            <p>
              Based in the UK, just outside London, Issy Smith is taking the DJ world by storm with her fresh, energetic approach to House music. She blends the best of classic dance culture with cutting-edge new releases, crafting a sound that's vibrant, fun and built entirely for the dance floor.
            </p>
            <p>
              Her passion for music shines through in venue-specific sets and a high-energy performance style that leaves every crowd locked in.
            </p>
            <p>
              Issy's sets are colourful, dynamic journeys built around a core theme but spanning genres and decades. Expect suspenseful breakdowns, big hard-hitting drops, iconic vocals and pure hands-in-the-air moments.
            </p>
            <p>
              Her influences and selections come from across House, Commercial House, Deep/Tech, Afro House, Nu-Disco, Funky House, Tech House, and Melodic House &amp; Techno.
            </p>
            <p>
              This versatility comes from real experience &ndash; from main-room headline slots to long warm-ups, pool parties, bar sets and chilled daytime sessions. Issy's performance is always professional, prepared and built with intention.
            </p>
          </div>
          <div className="space-y-4">
            <p>
              A Resident DJ at Ibiza Rocks, Issy also plays across the island &ndash; including the Eden Ibiza main room in Summer 2025. In London she's a regular at Ministry Of Sound, performing in both The Box and Room 103.
            </p>
            <p>
              She's supported Craig David, Switch Disco, Joel Corry, DJEZ, P.O.U, Dizzee Rascal and many more and frequently appears on Select and FlexFM radio.
            </p>
            <p>
              With over 150k followers, Issy's strong social presence helps champion brands, venues and events she works with &ndash; pairing her music with bold fashion and standout promotional content.
            </p>
            <p>
              Looking ahead to 2026, Issy is pushing towards festival stages, more international dates, deeper melodic sets and releasing her own original music.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
```

**Step 2: Add Bio to index.tsx**

**Step 3: Verify two-column layout on desktop, single column on mobile**

**Step 4: Commit**

```bash
git add -A && git commit -m "feat: add bio section with two-column layout"
```

---

### Task 5: Highlights Section (Commercial & Melodic)

**Files:**
- Create: `src/components/Highlights.tsx`
- Modify: `src/routes/index.tsx`

**Step 1: Create `src/components/Highlights.tsx`**

Two subsections with mix cards. Each card has a placeholder thumbnail and "LISTEN" button.

```tsx
const COMMERCIAL_MIXES = [
  { title: 'Ministry Of Sound, Room 103', href: '#' },
  { title: 'Switch Disco', href: '#' },
  { title: 'Craig David', href: '#' },
  { title: 'Splash Hits', href: '#' },
  { title: 'DJEZ', href: '#' },
  { title: 'Love Juice', href: '#' },
]

const MELODIC_MIXES = [
  { title: 'Ministry Of Sound, The Box', href: '#' },
  { title: 'EGG LND (Electro)', href: '#' },
  { title: 'Eden Ibiza', href: '#' },
]

export function Highlights() {
  return (
    <section id="highlights" className="py-20 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="grid md:grid-cols-2 gap-12 md:gap-16">
          {/* Commercial */}
          <div>
            <div className="w-20 h-1 bg-accent mb-8 shadow-[0_0_10px_var(--color-accent-glow)]" />
            <h2 className="text-3xl md:text-4xl font-black uppercase tracking-wider mb-2">Commercial</h2>
            <h3 className="text-2xl md:text-3xl font-black uppercase tracking-wider text-text-secondary mb-8">Highlights</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {COMMERCIAL_MIXES.map((mix) => (
                <MixCard key={mix.title} {...mix} />
              ))}
            </div>
          </div>

          {/* Melodic & Progressive */}
          <div>
            <div className="w-20 h-1 bg-accent mb-8 shadow-[0_0_10px_var(--color-accent-glow)]" />
            <h2 className="text-3xl md:text-4xl font-black uppercase tracking-wider mb-2">Melodic &amp;</h2>
            <h3 className="text-2xl md:text-3xl font-black uppercase tracking-wider text-text-secondary mb-8">Progressive Highlights</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {MELODIC_MIXES.map((mix) => (
                <MixCard key={mix.title} {...mix} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function MixCard({ title, href }: { title: string; href: string }) {
  return (
    <a
      href={href}
      className="group block bg-dark-card backdrop-blur-sm rounded-lg overflow-hidden border border-white/5 hover:border-accent/30 transition-all"
    >
      {/* Placeholder thumbnail */}
      <div className="aspect-square bg-gradient-to-br from-dark-surface to-dark-bg flex items-center justify-center">
        <svg className="w-8 h-8 text-text-secondary/30 group-hover:text-accent transition-colors" fill="currentColor" viewBox="0 0 24 24">
          <path d="M8 5v14l11-7z" />
        </svg>
      </div>
      <div className="p-3">
        <p className="text-xs text-text-secondary truncate mb-2">{title}</p>
        <span className="text-xs uppercase tracking-widest font-bold text-accent">Listen</span>
      </div>
    </a>
  )
}
```

**Step 2: Add Highlights to index.tsx**

**Step 3: Verify grid layout renders properly**

**Step 4: Commit**

```bash
git add -A && git commit -m "feat: add commercial and melodic highlights sections"
```

---

### Task 6: Events & Brands Section

**Files:**
- Create: `src/components/Events.tsx`
- Modify: `src/routes/index.tsx`

**Step 1: Create `src/components/Events.tsx`**

Grid of event/brand cards with placeholder images.

```tsx
const EVENTS = [
  'Room 103 - Ministry Of Sound',
  'Love Juice',
  'Dizzee Rascal - Ministry Of Sound',
  'Future Citizens Vol. 3 - Ministry Of Sound',
  'Future Citizens Launch Party - Ministry Of Sound',
  'May 23rd',
  'Ibiza Rocks Residents',
  'Wildfire',
  'Le Plongeoir',
  'Linekers Y',
  'Guildford Mirage Project',
  'Joel Corry - Ministry Of Sound',
  'Future Citizens Vol. 2',
  'Splash Hits',
  'Love Juice',
  'DJEZ',
  'EGG LDN',
  'Flex FM',
  'Select',
  'Itaca Ibiza',
  'Ibiza Rocks',
  'Craig David TS5',
  'Eden',
  'Switch Disco',
]

export function Events() {
  return (
    <section id="events" className="py-20 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="w-20 h-1 bg-accent mb-8 shadow-[0_0_10px_var(--color-accent-glow)]" />
        <h2 className="text-4xl md:text-5xl font-black uppercase tracking-wider mb-12">
          Events <span className="text-accent">&amp;</span> Brands
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {EVENTS.map((event, i) => (
            <div
              key={`${event}-${i}`}
              className="aspect-square bg-dark-card backdrop-blur-sm rounded-lg border border-white/5 flex items-center justify-center p-3 hover:border-accent/30 transition-all"
            >
              <p className="text-xs text-center text-text-secondary leading-tight">{event}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
```

**Step 2: Add Events to index.tsx**

**Step 3: Verify responsive grid**

**Step 4: Commit**

```bash
git add -A && git commit -m "feat: add events and brands grid section"
```

---

### Task 7: Technical Rider Section

**Files:**
- Create: `src/components/TechnicalRider.tsx`
- Modify: `src/routes/index.tsx`

**Step 1: Create `src/components/TechnicalRider.tsx`**

Accordion-style panels for Preferred and Alternative setup.

```tsx
import { useState } from 'react'

export function TechnicalRider() {
  const [open, setOpen] = useState<'preferred' | 'alternative' | null>('preferred')

  return (
    <section id="technical" className="py-20 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="w-20 h-1 bg-accent mb-8 shadow-[0_0_10px_var(--color-accent-glow)]" />
        <h2 className="text-4xl md:text-5xl font-black uppercase tracking-wider mb-4">Technical</h2>
        <h3 className="text-2xl md:text-3xl font-black uppercase tracking-wider text-text-secondary mb-12">Rider</h3>

        <div className="bg-dark-card backdrop-blur-sm rounded-xl border border-white/5 overflow-hidden">
          <div className="px-6 py-4 border-b border-white/5">
            <p className="text-sm uppercase tracking-widest font-bold text-accent">DJ Equipment Information</p>
          </div>

          {/* Preferred Setup */}
          <button
            onClick={() => setOpen(open === 'preferred' ? null : 'preferred')}
            className="w-full px-6 py-4 flex items-center justify-between border-b border-white/5 hover:bg-white/5 transition-colors"
          >
            <span className="text-sm uppercase tracking-widest font-bold">Preferred Setup</span>
            <svg
              className={`w-5 h-5 transition-transform ${open === 'preferred' ? 'rotate-180' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {open === 'preferred' && (
            <div className="px-6 py-4 text-text-secondary text-sm leading-relaxed space-y-3 border-b border-white/5">
              <p>3 x CDJ-3000 (or CDJ-3000x) and 1x Pioneer DJM-A9 mixer (or DJM-900 NXS2). ALL CDJs &amp; Mixer to be LINKED via Ethernet Cable.</p>
              <p>1 x microphone connected to and controlled from the mixer. If only 2 CDJs are available that will suffice.</p>
              <p>2 x high powered monitor speakers positioned on the left and right of the DJ and with the volume controlled from the mixer.</p>
            </div>
          )}

          {/* Alternative Setup */}
          <button
            onClick={() => setOpen(open === 'alternative' ? null : 'alternative')}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-white/5 transition-colors"
          >
            <span className="text-sm uppercase tracking-widest font-bold">Alternative Setup</span>
            <svg
              className={`w-5 h-5 transition-transform ${open === 'alternative' ? 'rotate-180' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {open === 'alternative' && (
            <div className="px-6 py-4 text-text-secondary text-sm leading-relaxed space-y-3">
              <p>1x all in one Pioneer/AlphaTheta XDJ-AZ, XDJ-RX3, XDJ-XZ or XDJ-RR (or similar Pioneer/AlphaTheta models accessible with USB).</p>
              <p>1 x microphone connected to and controlled from the mixer.</p>
              <p>2 x high powered monitor speakers positioned on the left and right of the DJ and with the volume controlled from the mixer.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
```

**Step 2: Add TechnicalRider to index.tsx**

**Step 3: Verify accordion expand/collapse**

**Step 4: Commit**

```bash
git add -A && git commit -m "feat: add technical rider section with accordion"
```

---

### Task 8: Press Assets CTA Section

**Files:**
- Create: `src/components/PressAssets.tsx`
- Modify: `src/routes/index.tsx`

**Step 1: Create `src/components/PressAssets.tsx`**

Large CTA block linking to press photos/videos.

```tsx
export function PressAssets() {
  return (
    <section className="py-20 px-4">
      <div className="max-w-4xl mx-auto text-center">
        <a
          href="#"
          className="group block bg-dark-card backdrop-blur-sm rounded-xl border border-accent/20 p-12 md:p-16 hover:border-accent/50 transition-all hover:shadow-[0_0_30px_var(--color-accent-glow)/0.15]"
        >
          <p className="text-3xl md:text-5xl font-black uppercase tracking-wider mb-4 group-hover:text-accent transition-colors">
            Click Here
          </p>
          <p className="text-lg md:text-xl uppercase tracking-widest text-text-secondary">
            For Press Photos, Videos &amp; Assets
          </p>
        </a>
      </div>
    </section>
  )
}
```

**Step 2: Add PressAssets to index.tsx**

**Step 3: Commit**

```bash
git add -A && git commit -m "feat: add press assets CTA section"
```

---

### Task 9: Contact Form Section

**Files:**
- Create: `src/components/Contact.tsx`
- Modify: `src/routes/index.tsx`

**Step 1: Create `src/components/Contact.tsx`**

Contact form (UI only) with social links.

```tsx
export function Contact() {
  return (
    <section id="contact" className="py-20 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="w-20 h-1 bg-accent mb-8 shadow-[0_0_10px_var(--color-accent-glow)]" />
        <h2 className="text-4xl md:text-5xl font-black uppercase tracking-wider mb-4">Booking</h2>
        <h3 className="text-2xl md:text-3xl font-black uppercase tracking-wider text-text-secondary mb-12">Contact</h3>

        <div className="grid md:grid-cols-2 gap-12">
          {/* Form */}
          <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm uppercase tracking-widest font-bold mb-2">Name</label>
              <input
                id="name"
                type="text"
                className="w-full bg-dark-card border border-white/10 rounded-lg px-4 py-3 text-white placeholder-text-secondary/50 focus:border-accent focus:outline-none transition-colors"
                placeholder="Your name"
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm uppercase tracking-widest font-bold mb-2">Email</label>
              <input
                id="email"
                type="email"
                className="w-full bg-dark-card border border-white/10 rounded-lg px-4 py-3 text-white placeholder-text-secondary/50 focus:border-accent focus:outline-none transition-colors"
                placeholder="your@email.com"
              />
            </div>
            <div>
              <label htmlFor="message" className="block text-sm uppercase tracking-widest font-bold mb-2">Message</label>
              <textarea
                id="message"
                rows={5}
                className="w-full bg-dark-card border border-white/10 rounded-lg px-4 py-3 text-white placeholder-text-secondary/50 focus:border-accent focus:outline-none transition-colors resize-none"
                placeholder="Your message..."
              />
            </div>
            <button
              type="submit"
              className="w-full bg-accent hover:bg-accent/80 text-white font-bold uppercase tracking-widest py-3 rounded-lg transition-colors"
            >
              Send Enquiry
            </button>
          </form>

          {/* Social Links & Info */}
          <div className="space-y-6">
            <div>
              <p className="text-sm uppercase tracking-widest font-bold text-accent mb-4">Management &amp; Booking</p>
              <p className="text-text-secondary">Helen</p>
            </div>

            <div className="space-y-3">
              <SocialLink icon="instagram" label="@issysmithdj_official" href="#" />
              <SocialLink icon="soundcloud" label="issysmithdj_official" href="#" />
              <SocialLink icon="tiktok" label="issy.smitheee" href="#" />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function SocialLink({ icon, label, href }: { icon: string; label: string; href: string }) {
  return (
    <a
      href={href}
      className="flex items-center gap-3 text-text-secondary hover:text-white transition-colors"
    >
      <div className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center">
        <span className="text-xs">{icon[0].toUpperCase()}</span>
      </div>
      <span className="text-sm">{label}</span>
    </a>
  )
}
```

**Step 2: Add Contact to index.tsx**

**Step 3: Verify form renders, fields are interactive**

**Step 4: Commit**

```bash
git add -A && git commit -m "feat: add booking contact form and social links"
```

---

### Task 10: Scroll Animations

**Files:**
- Create: `src/hooks/useInView.ts`
- Modify: All section components to wrap in fade-in animation

**Step 1: Create `src/hooks/useInView.ts`**

Simple Intersection Observer hook for scroll-triggered fade-in.

```tsx
import { useEffect, useRef, useState } from 'react'

export function useInView(threshold = 0.1) {
  const ref = useRef<HTMLDivElement>(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setInView(true) },
      { threshold }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [threshold])

  return { ref, inView }
}
```

**Step 2: Create a `FadeIn` wrapper component**

Add to `src/components/FadeIn.tsx`:

```tsx
import { useInView } from '~/hooks/useInView'
import type { ReactNode } from 'react'

export function FadeIn({ children, className = '' }: { children: ReactNode; className?: string }) {
  const { ref, inView } = useInView()
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'} ${className}`}
    >
      {children}
    </div>
  )
}
```

**Step 3: Wrap each section component's outer div with `<FadeIn>`**

**Step 4: Verify animations trigger on scroll**

**Step 5: Commit**

```bash
git add -A && git commit -m "feat: add scroll-triggered fade-in animations"
```

---

### Task 11: Final Polish & Footer

**Files:**
- Create: `src/components/Footer.tsx`
- Modify: `src/routes/index.tsx` - assemble all sections in order
- Modify: `src/styles.css` - add smooth scroll

**Step 1: Add smooth scrolling to styles.css**

```css
html {
  scroll-behavior: smooth;
}
```

**Step 2: Create minimal footer**

```tsx
export function Footer() {
  return (
    <footer className="py-8 px-4 border-t border-white/5">
      <div className="max-w-6xl mx-auto text-center text-text-secondary text-xs">
        <p>&copy; {new Date().getFullYear()} Issy Smith. All rights reserved.</p>
      </div>
    </footer>
  )
}
```

**Step 3: Assemble all sections in `src/routes/index.tsx`**

Final order: Nav, Hero, Bio, Highlights, Events, TechnicalRider, PressAssets, Contact, Footer.

**Step 4: Full visual review at various breakpoints**

**Step 5: Run build to verify SSR works**

```bash
npm run build
```

**Step 6: Commit**

```bash
git add -A && git commit -m "feat: final assembly, footer, and polish"
```

---

### Task 12: Vercel Deployment Setup

**Files:**
- Verify: `vite.config.ts` has nitro plugin (already added in Task 1)

**Step 1: Verify build succeeds**

```bash
npm run build
```

**Step 2: Verify Vercel-compatible output exists**

```bash
ls .output/
```
Expected: server directory with built output.

**Step 3: Commit final state**

```bash
git add -A && git commit -m "chore: verify Vercel-ready build"
```

**Step 4: Deploy to Vercel**

```bash
npx vercel
```
Follow prompts to link project and deploy. Alternatively, push to GitHub and connect via Vercel dashboard.
