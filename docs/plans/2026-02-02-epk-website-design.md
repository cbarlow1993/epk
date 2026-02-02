# Issy Smith EPK Website Design

## Overview

Single-page scrolling EPK (Electronic Press Kit) website for DJ Issy Smith, built with TanStack Start, optimised for SEO, deployed on Vercel. Faithfully recreates the existing PDF EPK as an interactive web experience.

## Tech Stack

- **Framework:** TanStack Start (SSR) with Vinxi
- **Styling:** Tailwind CSS v4
- **Deployment:** Vercel (using TanStack Start's Vercel preset)
- **Fonts:** Google Fonts (Inter or similar condensed sans-serif)

## SEO Strategy

- Server-side rendered for full crawlability
- Meta tags: title, description, Open Graph, Twitter Card
- JSON-LD structured data (`MusicGroup` schema)
- Semantic HTML (`<section>`, `<nav>`, `<header>`, `<footer>`)
- Proper heading hierarchy (single h1, section h2s)

## Page Sections (top to bottom)

### 1. Hero
- Full-viewport background image with dark gradient overlay
- "ISSY SMITH" in large bold display type
- "PRESSKIT / EPK" subtitle
- SoundCloud + Instagram icon links
- Sticky/fixed nav with anchor links to sections

### 2. Bio
- Two-column text layout on desktop, single column on mobile
- Section title "BIO" in uppercase bold
- Content from the PDF bio text

### 3. Highlights
- Two subsections: "Commercial Highlights" and "Melodic & Progressive Highlights"
- Cards with thumbnail images and "LISTEN" CTA buttons
- Placeholder links for now

### 4. Events & Brands
- Section title "EVENTS & BRANDS"
- Grid of event/brand images (4 cols desktop, 2 cols mobile)
- Items: Ministry of Sound, Love Juice, Ibiza Rocks, Eden, Splash Hits, EGG LDN, Flex FM, Select, Joel Corry, Craig David, Switch Disco, Dizzee Rascal, DJEZ, etc.

### 5. Technical Rider
- Section title "TECHNICAL RIDER"
- "DJ EQUIPMENT INFORMATION" subheading
- Preferred Setup and Alternative Setup in expandable/accordion panels
- Equipment specs as listed in the PDF

### 6. Press Assets
- Large CTA: "CLICK HERE FOR PRESS PHOTOS, VIDEOS & ASSETS"
- Placeholder link

### 7. Booking Contact
- Section title "BOOKING CONTACT"
- Contact form (name, email, message) - UI only, no backend yet
- Social links: Instagram, SoundCloud, TikTok

## Visual Design

### Colors
- Background: `#0a0a0f` (near-black) with dark blue-grey gradients
- Accent: `#1e90ff` / `#3b82f6` (electric blue)
- Text primary: white
- Text secondary: `#a0a0b0` (light grey)
- Blue glow effects on dividers and interactive elements

### Typography
- Headings: bold condensed sans-serif, uppercase for section titles
- "ISSY SMITH": large bold display weight
- Body: clean sans-serif, comfortable reading size

### Effects
- Dark gradient overlays on images
- CSS backdrop blur for depth
- Blue horizontal line dividers between sections
- Glass-morphism cards (semi-transparent + blur)
- Scroll-triggered fade-in animations per section

### Responsive
- Mobile-first
- Bio stacks to single column
- Events grid: 4 cols -> 2 cols
- Hero: full-viewport on all sizes

## Assets
- Placeholder images throughout, to be replaced with real assets later
- Placeholder URLs for all "LISTEN" links
