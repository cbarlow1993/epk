# DJ EPK Platform - Design Document

## Overview

A multi-tenant SaaS platform where DJs and artists sign up, build their Electronic Press Kit through a dashboard, and get a public-facing EPK page. "Linktree meets Squarespace, purpose-built for DJs."

## Tech Stack

- **Framework:** TanStack Start (SSR) — extending the existing project
- **Database:** Supabase (Postgres + Auth + Storage)
- **Payments:** Stripe (free + paid tier)
- **Hosting:** Vercel
- **File uploads:** Supabase Storage (profile photos, event images, press assets)

## URL Structure

- `/` — Marketing/landing page
- `/login`, `/signup` — Auth pages (Supabase Auth)
- `/dashboard/*` — Authenticated dashboard
- `/:slug` — Public EPK page (e.g. `/issysmith`)
- Subdomains: `issysmith.yourdomain.com` → same as `/:slug`
- Custom domains: Paid tier, configured via Vercel API

## Pricing Tiers

- **Free:** EPK page on `name.yourdomain.com`, all content features, platform branding in footer
- **Paid:** Custom domain, remove branding, analytics, full theme customisation

## Database Schema (Supabase / Postgres)

### profiles
- `id` UUID (FK to auth.users)
- `slug` TEXT UNIQUE
- `display_name` TEXT
- `tagline` TEXT
- `bio_left` TEXT
- `bio_right` TEXT
- `genres` TEXT[]
- `profile_image_url` TEXT
- `hero_image_url` TEXT
- `accent_color` TEXT (default: '#3b82f6')
- `bg_color` TEXT (default: '#0a0a0f')
- `font_family` TEXT (default: 'Inter')
- `custom_css` TEXT
- `custom_domain` TEXT
- `tier` TEXT (default: 'free')
- `stripe_customer_id` TEXT
- `published` BOOLEAN (default: false)
- `created_at` TIMESTAMPTZ
- `updated_at` TIMESTAMPTZ

### social_links
- `id` UUID
- `profile_id` UUID (FK profiles)
- `platform` TEXT (instagram, soundcloud, tiktok, twitter, youtube, etc.)
- `url` TEXT
- `handle` TEXT
- `sort_order` INTEGER
- `created_at` TIMESTAMPTZ

### mixes
- `id` UUID
- `profile_id` UUID (FK profiles)
- `title` TEXT
- `url` TEXT
- `category` TEXT (commercial, melodic, progressive, etc.)
- `thumbnail_url` TEXT
- `sort_order` INTEGER
- `created_at` TIMESTAMPTZ

### events
- `id` UUID
- `profile_id` UUID (FK profiles)
- `name` TEXT
- `image_url` TEXT
- `link_url` TEXT
- `sort_order` INTEGER
- `created_at` TIMESTAMPTZ

### technical_rider
- `id` UUID
- `profile_id` UUID (FK profiles)
- `preferred_setup` TEXT
- `alternative_setup` TEXT
- `created_at` TIMESTAMPTZ
- `updated_at` TIMESTAMPTZ

### booking_contact
- `id` UUID
- `profile_id` UUID (FK profiles)
- `manager_name` TEXT
- `email` TEXT
- `phone` TEXT
- `address` TEXT
- `created_at` TIMESTAMPTZ
- `updated_at` TIMESTAMPTZ

### press_assets
- `id` UUID
- `profile_id` UUID (FK profiles)
- `title` TEXT
- `file_url` TEXT
- `type` TEXT (photo, video, logo)
- `sort_order` INTEGER
- `created_at` TIMESTAMPTZ

### Security
- Row-level security (RLS) on all tables
- Users can only read/write their own data
- Public can read published profiles and their related data

## Dashboard UI

Fixed sidebar navigation (collapses to hamburger on mobile), content area on right. Dark theme.

### Sidebar Sections
1. **Profile** — Name, tagline, slug, profile photo, hero image
2. **Bio** — Left/right column text editors
3. **Music** — Manage mixes/sets (title, URL, category, thumbnail, reorder)
4. **Events** — Manage events grid (image upload, names, links, drag-to-reorder)
5. **Technical** — Edit preferred and alternative setup text
6. **Press Assets** — Upload photos/videos/logos, manage downloads
7. **Contact** — Manager name, email, phone, address
8. **Social Links** — Add/edit/reorder social media links
9. **Theme** — Colour pickers, font selector, live preview
10. **Settings** — Custom domain, billing/subscription, account

### Key UX Patterns
- Drag-and-drop reordering for events, mixes, social links
- Image upload with crop/resize
- Live preview panel
- Auto-save on every change (debounced)
- "View my EPK" button opens public page in new tab

## Public EPK Page

- SSR rendered for SEO
- Data fetched from Supabase by slug (or custom domain lookup)
- Dynamic meta tags per profile (OG, Twitter Card)
- JSON-LD MusicGroup structured data per artist
- Theme colours/fonts applied from profile settings
- "Built with [Brand]" footer on free tier, hidden on paid

## Auth Flow

- Supabase Auth: email/password + Google OAuth
- On signup: create profiles row, prompt for slug/display name
- Login redirects to /dashboard
- All /dashboard/* routes protected by auth middleware

## Custom Domains (Paid)

- User enters domain in Settings
- Backend adds domain via Vercel API
- User configures DNS (CNAME to cname.vercel-dns.com)
- Middleware checks hostname → looks up profile by custom_domain → renders EPK

## Landing Page

- Marketing page at /
- Hero, feature list, example EPKs, pricing table, signup CTA
