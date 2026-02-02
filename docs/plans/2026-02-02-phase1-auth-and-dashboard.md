# Phase 1: Auth, Database & Basic Dashboard — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add Supabase auth, database schema, and a basic dashboard where users can sign up, log in, and edit their profile/bio — with the public EPK page rendering from the database.

**Architecture:** Supabase handles auth (email/password + Google OAuth) and Postgres database. TanStack Start's `beforeLoad` pattern protects dashboard routes. The existing EPK components become a dynamic template reading from Supabase. Server functions handle all DB operations.

**Tech Stack:** Supabase (Postgres + Auth + Storage), @supabase/ssr, @supabase/supabase-js, TanStack Start, Tailwind CSS v4

---

### Task 1: Install Supabase Dependencies & Environment Setup

**Files:**
- Modify: `package.json`
- Create: `.env`
- Create: `.env.example`
- Create: `src/utils/supabase.ts`

**Step 1: Install Supabase packages**

```bash
cd /Users/chrisbarlow/Documents/issy/epk
npm install @supabase/supabase-js @supabase/ssr
```

**Step 2: Create `.env.example`**

```
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

**Step 3: Create `.env`**

Copy `.env.example` and fill in real Supabase credentials from the user's Supabase project dashboard. Add `.env` to `.gitignore` if not already there.

**Step 4: Create `src/utils/supabase.ts`**

This creates both a browser client (for client-side) and a server client factory (for SSR/server functions).

```ts
import { createBrowserClient } from '@supabase/ssr'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

export function getSupabaseBrowserClient() {
  return createBrowserClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY,
  )
}

export function getSupabaseServerClient(request: Request) {
  const headers = new Headers()

  const supabase = createServerClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return parseCookies(request.headers.get('Cookie') ?? '')
        },
        setAll(cookies) {
          for (const cookie of cookies) {
            headers.append('Set-Cookie', serializeCookie(cookie.name, cookie.value, cookie.options))
          }
        },
      },
    },
  )

  return { supabase, headers }
}

// Simple admin client for server-only operations (no cookies needed)
export function getSupabaseAdmin() {
  return createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY,
  )
}

function parseCookies(cookieHeader: string) {
  const cookies: { name: string; value: string }[] = []
  if (!cookieHeader) return cookies
  for (const pair of cookieHeader.split(';')) {
    const [name, ...rest] = pair.trim().split('=')
    if (name) cookies.push({ name, value: rest.join('=') })
  }
  return cookies
}

function serializeCookie(
  name: string,
  value: string,
  options?: Record<string, unknown>,
): string {
  let cookie = `${name}=${value}`
  if (options?.path) cookie += `; Path=${options.path}`
  if (options?.maxAge) cookie += `; Max-Age=${options.maxAge}`
  if (options?.httpOnly) cookie += `; HttpOnly`
  if (options?.secure) cookie += `; Secure`
  if (options?.sameSite) cookie += `; SameSite=${options.sameSite}`
  return cookie
}
```

**Step 5: Verify dev server still starts**

```bash
npm run dev
```

**Step 6: Commit**

```bash
git add -A && git commit -m "feat: add Supabase dependencies and client utilities"
```

---

### Task 2: Supabase Database Schema

**Files:**
- Create: `supabase/schema.sql`

**Step 1: Create `supabase/schema.sql`**

This is the SQL to run in the Supabase SQL Editor to set up all tables.

```sql
-- Profiles table (one per auth user)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  slug TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL DEFAULT '',
  tagline TEXT DEFAULT '',
  bio_left TEXT DEFAULT '',
  bio_right TEXT DEFAULT '',
  genres TEXT[] DEFAULT '{}',
  profile_image_url TEXT DEFAULT '',
  hero_image_url TEXT DEFAULT '',
  accent_color TEXT DEFAULT '#3b82f6',
  bg_color TEXT DEFAULT '#0a0a0f',
  font_family TEXT DEFAULT 'Inter',
  custom_css TEXT DEFAULT '',
  custom_domain TEXT,
  tier TEXT DEFAULT 'free' CHECK (tier IN ('free', 'pro')),
  stripe_customer_id TEXT,
  published BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Social links
CREATE TABLE social_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  url TEXT DEFAULT '',
  handle TEXT DEFAULT '',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Mixes / sets
CREATE TABLE mixes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT '',
  url TEXT DEFAULT '',
  category TEXT DEFAULT 'commercial',
  thumbnail_url TEXT DEFAULT '',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Events & brands
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  image_url TEXT DEFAULT '',
  link_url TEXT DEFAULT '',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Technical rider
CREATE TABLE technical_rider (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  preferred_setup TEXT DEFAULT '',
  alternative_setup TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Booking contact
CREATE TABLE booking_contact (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  manager_name TEXT DEFAULT '',
  email TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  address TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Press assets
CREATE TABLE press_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT DEFAULT '',
  file_url TEXT DEFAULT '',
  type TEXT DEFAULT 'photo' CHECK (type IN ('photo', 'video', 'logo')),
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE mixes ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE technical_rider ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_contact ENABLE ROW LEVEL SECURITY;
ALTER TABLE press_assets ENABLE ROW LEVEL SECURITY;

-- RLS Policies: users can read/write their own data
-- Profiles: owner can do everything
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Profiles: public can read published profiles
CREATE POLICY "Public can view published profiles" ON profiles FOR SELECT USING (published = true);

-- Helper function for child table policies
CREATE OR REPLACE FUNCTION is_profile_owner(p_profile_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = p_profile_id AND id = auth.uid());
$$ LANGUAGE sql SECURITY DEFINER;

-- Child tables: owner CRUD + public read (if profile is published)
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY['social_links', 'mixes', 'events', 'technical_rider', 'booking_contact', 'press_assets'])
  LOOP
    EXECUTE format('CREATE POLICY "Owner select on %I" ON %I FOR SELECT USING (is_profile_owner(profile_id))', tbl, tbl);
    EXECUTE format('CREATE POLICY "Owner insert on %I" ON %I FOR INSERT WITH CHECK (is_profile_owner(profile_id))', tbl, tbl);
    EXECUTE format('CREATE POLICY "Owner update on %I" ON %I FOR UPDATE USING (is_profile_owner(profile_id))', tbl, tbl);
    EXECUTE format('CREATE POLICY "Owner delete on %I" ON %I FOR DELETE USING (is_profile_owner(profile_id))', tbl, tbl);
    EXECUTE format('CREATE POLICY "Public read on %I" ON %I FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = %I.profile_id AND published = true))', tbl, tbl, tbl);
  END LOOP;
END $$;

-- Auto-create profile on user signup via trigger
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, slug, display_name)
  VALUES (
    NEW.id,
    LOWER(REPLACE(COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)), ' ', '-')),
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );
  -- Also create empty technical_rider and booking_contact rows
  INSERT INTO technical_rider (profile_id) VALUES (NEW.id);
  INSERT INTO booking_contact (profile_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER technical_rider_updated_at BEFORE UPDATE ON technical_rider FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER booking_contact_updated_at BEFORE UPDATE ON booking_contact FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Supabase Storage bucket for uploads
-- Run this in the Supabase dashboard under Storage:
-- Create a bucket called "uploads" with public access
```

**Step 2: Instruct user to run this SQL in their Supabase project**

The user needs to:
1. Go to Supabase Dashboard > SQL Editor
2. Paste and run the full schema.sql
3. Go to Storage > Create bucket "uploads" (public)
4. Go to Authentication > Providers > Enable Email and Google (if desired)

**Step 3: Commit**

```bash
git add -A && git commit -m "feat: add Supabase database schema with RLS policies"
```

---

### Task 3: Auth Server Functions

**Files:**
- Create: `src/server/auth.ts`

**Step 1: Create `src/server/auth.ts`**

Server functions for login, signup, logout, and getting the current user.

```ts
import { createServerFn } from '@tanstack/react-start'
import { getSupabaseServerClient } from '~/utils/supabase'
import { getWebRequest } from '@tanstack/react-start/server'

export const getCurrentUser = createServerFn({ method: 'GET' }).handler(async () => {
  const request = getWebRequest()
  const { supabase } = getSupabaseServerClient(request)
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return { user, profile }
})

export const loginWithEmail = createServerFn({ method: 'POST' })
  .validator((data: { email: string; password: string }) => data)
  .handler(async ({ data }) => {
    const request = getWebRequest()
    const { supabase, headers } = getSupabaseServerClient(request)

    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    })

    if (error) {
      return { error: error.message, headers: Object.fromEntries(headers.entries()) }
    }

    return { user: authData.user, headers: Object.fromEntries(headers.entries()) }
  })

export const signupWithEmail = createServerFn({ method: 'POST' })
  .validator((data: { email: string; password: string; displayName: string }) => data)
  .handler(async ({ data }) => {
    const request = getWebRequest()
    const { supabase, headers } = getSupabaseServerClient(request)

    const { data: authData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: { display_name: data.displayName },
      },
    })

    if (error) {
      return { error: error.message, headers: Object.fromEntries(headers.entries()) }
    }

    return { user: authData.user, headers: Object.fromEntries(headers.entries()) }
  })

export const logout = createServerFn({ method: 'POST' }).handler(async () => {
  const request = getWebRequest()
  const { supabase, headers } = getSupabaseServerClient(request)
  await supabase.auth.signOut()
  return { headers: Object.fromEntries(headers.entries()) }
})
```

**Step 2: Commit**

```bash
git add -A && git commit -m "feat: add auth server functions (login, signup, logout, getCurrentUser)"
```

---

### Task 4: Login & Signup Pages

**Files:**
- Create: `src/routes/login.tsx`
- Create: `src/routes/signup.tsx`

**Step 1: Create `src/routes/login.tsx`**

```tsx
import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { loginWithEmail } from '~/server/auth'

export const Route = createFileRoute('/login')({
  component: LoginPage,
})

function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const result = await loginWithEmail({ data: { email, password } })

    if (result.error) {
      setError(result.error)
      setLoading(false)
      return
    }

    navigate({ to: '/dashboard' })
  }

  return (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-black uppercase tracking-wider text-center mb-8">Log In</h1>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 mb-6 text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm uppercase tracking-widest font-bold mb-2">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-dark-card border border-white/10 rounded-lg px-4 py-3 text-white placeholder-text-secondary/50 focus:border-accent focus:outline-none transition-colors"
              placeholder="your@email.com"
              required
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm uppercase tracking-widest font-bold mb-2">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-dark-card border border-white/10 rounded-lg px-4 py-3 text-white placeholder-text-secondary/50 focus:border-accent focus:outline-none transition-colors"
              placeholder="Your password"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-accent hover:bg-accent/80 disabled:opacity-50 text-white font-bold uppercase tracking-widest py-3 rounded-lg transition-colors"
          >
            {loading ? 'Logging in...' : 'Log In'}
          </button>
        </form>

        <p className="text-text-secondary text-sm text-center mt-6">
          Don't have an account?{' '}
          <Link to="/signup" className="text-accent hover:underline">Sign up</Link>
        </p>
      </div>
    </div>
  )
}
```

**Step 2: Create `src/routes/signup.tsx`**

```tsx
import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { signupWithEmail } from '~/server/auth'

export const Route = createFileRoute('/signup')({
  component: SignupPage,
})

function SignupPage() {
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const result = await signupWithEmail({ data: { email, password, displayName } })

    if (result.error) {
      setError(result.error)
      setLoading(false)
      return
    }

    navigate({ to: '/dashboard' })
  }

  return (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-black uppercase tracking-wider text-center mb-8">Sign Up</h1>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 mb-6 text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="displayName" className="block text-sm uppercase tracking-widest font-bold mb-2">Artist / DJ Name</label>
            <input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full bg-dark-card border border-white/10 rounded-lg px-4 py-3 text-white placeholder-text-secondary/50 focus:border-accent focus:outline-none transition-colors"
              placeholder="Your name"
              required
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm uppercase tracking-widest font-bold mb-2">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-dark-card border border-white/10 rounded-lg px-4 py-3 text-white placeholder-text-secondary/50 focus:border-accent focus:outline-none transition-colors"
              placeholder="your@email.com"
              required
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm uppercase tracking-widest font-bold mb-2">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-dark-card border border-white/10 rounded-lg px-4 py-3 text-white placeholder-text-secondary/50 focus:border-accent focus:outline-none transition-colors"
              placeholder="Min 6 characters"
              minLength={6}
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-accent hover:bg-accent/80 disabled:opacity-50 text-white font-bold uppercase tracking-widest py-3 rounded-lg transition-colors"
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="text-text-secondary text-sm text-center mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-accent hover:underline">Log in</Link>
        </p>
      </div>
    </div>
  )
}
```

**Step 3: Verify both pages render**

```bash
npm run dev
```
Visit `/login` and `/signup`.

**Step 4: Commit**

```bash
git add -A && git commit -m "feat: add login and signup pages"
```

---

### Task 5: Protected Dashboard Layout

**Files:**
- Create: `src/routes/_dashboard.tsx`
- Create: `src/routes/_dashboard/dashboard.tsx` (aliased as `/dashboard`)
- Create: `src/components/DashboardSidebar.tsx`

**Step 1: Create `src/routes/_dashboard.tsx`**

This is a pathless layout route that protects all child routes. It checks auth in `beforeLoad` and redirects to `/login` if not authenticated.

```tsx
import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { getCurrentUser } from '~/server/auth'
import { DashboardSidebar } from '~/components/DashboardSidebar'

export const Route = createFileRoute('/_dashboard')({
  beforeLoad: async () => {
    const result = await getCurrentUser()
    if (!result) {
      throw redirect({ to: '/login' })
    }
    return { user: result.user, profile: result.profile }
  },
  component: DashboardLayout,
})

function DashboardLayout() {
  const { profile } = Route.useRouteContext()

  return (
    <div className="min-h-screen bg-dark-bg flex">
      <DashboardSidebar profile={profile} />
      <main className="flex-1 p-6 md:p-10 md:ml-64">
        <Outlet />
      </main>
    </div>
  )
}
```

**Step 2: Create `src/components/DashboardSidebar.tsx`**

```tsx
import { Link, useMatchRoute } from '@tanstack/react-router'
import { logout } from '~/server/auth'
import { useNavigate } from '@tanstack/react-router'

interface Profile {
  slug: string
  display_name: string
  profile_image_url: string
}

const NAV_ITEMS = [
  { label: 'Profile', href: '/dashboard' },
  { label: 'Bio', href: '/dashboard/bio' },
  { label: 'Music', href: '/dashboard/music' },
  { label: 'Events', href: '/dashboard/events' },
  { label: 'Technical', href: '/dashboard/technical' },
  { label: 'Press Assets', href: '/dashboard/press' },
  { label: 'Contact', href: '/dashboard/contact' },
  { label: 'Social Links', href: '/dashboard/socials' },
  { label: 'Theme', href: '/dashboard/theme' },
  { label: 'Settings', href: '/dashboard/settings' },
]

export function DashboardSidebar({ profile }: { profile: Profile }) {
  const matchRoute = useMatchRoute()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate({ to: '/login' })
  }

  return (
    <aside className="fixed top-0 left-0 h-full w-64 bg-dark-surface border-r border-white/5 flex flex-col z-40 hidden md:flex">
      {/* Header */}
      <div className="p-6 border-b border-white/5">
        <p className="font-bold text-sm truncate">{profile.display_name}</p>
        <a
          href={`/${profile.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-accent hover:underline"
        >
          View EPK
        </a>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const isActive = matchRoute({ to: item.href, fuzzy: true })
          return (
            <Link
              key={item.href}
              to={item.href}
              className={`block px-6 py-2.5 text-sm transition-colors ${
                isActive
                  ? 'text-white bg-white/5 border-r-2 border-accent'
                  : 'text-text-secondary hover:text-white hover:bg-white/5'
              }`}
            >
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-white/5">
        <button
          onClick={handleLogout}
          className="w-full text-sm text-text-secondary hover:text-white transition-colors text-left px-2 py-1"
        >
          Log out
        </button>
      </div>
    </aside>
  )
}
```

**Step 3: Create `src/routes/_dashboard/dashboard.tsx`**

A simple dashboard home/profile editing page (placeholder for now).

```tsx
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_dashboard/dashboard')({
  component: DashboardHome,
})

function DashboardHome() {
  return (
    <div>
      <h1 className="text-2xl font-black uppercase tracking-wider mb-8">Profile</h1>
      <p className="text-text-secondary">Dashboard profile editor coming next...</p>
    </div>
  )
}
```

**Step 4: Verify auth flow works**

1. Visit `/dashboard` — should redirect to `/login`
2. Sign up via `/signup`
3. Should redirect to `/dashboard` and show the sidebar

**Step 5: Commit**

```bash
git add -A && git commit -m "feat: add protected dashboard layout with sidebar navigation"
```

---

### Task 6: Profile Editor (Dashboard Home)

**Files:**
- Create: `src/server/profile.ts`
- Modify: `src/routes/_dashboard/dashboard.tsx`

**Step 1: Create `src/server/profile.ts`**

Server functions for reading and updating the profile.

```ts
import { createServerFn } from '@tanstack/react-start'
import { getSupabaseServerClient } from '~/utils/supabase'
import { getWebRequest } from '@tanstack/react-start/server'

export const getProfile = createServerFn({ method: 'GET' }).handler(async () => {
  const request = getWebRequest()
  const { supabase } = getSupabaseServerClient(request)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  return data
})

export const updateProfile = createServerFn({ method: 'POST' })
  .validator((data: {
    display_name?: string
    tagline?: string
    slug?: string
    genres?: string[]
    profile_image_url?: string
    hero_image_url?: string
    published?: boolean
  }) => data)
  .handler(async ({ data }) => {
    const request = getWebRequest()
    const { supabase } = getSupabaseServerClient(request)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    const { data: profile, error } = await supabase
      .from('profiles')
      .update(data)
      .eq('id', user.id)
      .select()
      .single()

    if (error) return { error: error.message }
    return { profile }
  })
```

**Step 2: Rewrite `src/routes/_dashboard/dashboard.tsx`**

Full profile editor with auto-save.

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect, useCallback } from 'react'
import { getProfile, updateProfile } from '~/server/profile'

export const Route = createFileRoute('/_dashboard/dashboard')({
  loader: () => getProfile(),
  component: ProfileEditor,
})

function ProfileEditor() {
  const initialProfile = Route.useLoaderData()
  const [profile, setProfile] = useState(initialProfile)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const save = useCallback(async (updates: Record<string, unknown>) => {
    setSaving(true)
    setSaved(false)
    await updateProfile({ data: updates as any })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }, [])

  // Debounced auto-save
  const [timer, setTimer] = useState<ReturnType<typeof setTimeout> | null>(null)
  const autoSave = useCallback((field: string, value: unknown) => {
    if (timer) clearTimeout(timer)
    const t = setTimeout(() => save({ [field]: value }), 800)
    setTimer(t)
  }, [timer, save])

  const handleChange = (field: string, value: string | string[] | boolean) => {
    setProfile((p: any) => ({ ...p, [field]: value }))
    autoSave(field, value)
  }

  if (!profile) return <p className="text-text-secondary">Loading...</p>

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-black uppercase tracking-wider">Profile</h1>
        <span className="text-xs text-text-secondary">
          {saving ? 'Saving...' : saved ? 'Saved' : ''}
        </span>
      </div>

      <div className="space-y-6 max-w-2xl">
        <div>
          <label className="block text-sm uppercase tracking-widest font-bold mb-2">Display Name</label>
          <input
            type="text"
            value={profile.display_name}
            onChange={(e) => handleChange('display_name', e.target.value)}
            className="w-full bg-dark-card border border-white/10 rounded-lg px-4 py-3 text-white focus:border-accent focus:outline-none transition-colors"
          />
        </div>

        <div>
          <label className="block text-sm uppercase tracking-widest font-bold mb-2">URL Slug</label>
          <div className="flex items-center gap-2">
            <span className="text-text-secondary text-sm">yourdomain.com/</span>
            <input
              type="text"
              value={profile.slug}
              onChange={(e) => handleChange('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
              className="flex-1 bg-dark-card border border-white/10 rounded-lg px-4 py-3 text-white focus:border-accent focus:outline-none transition-colors"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm uppercase tracking-widest font-bold mb-2">Tagline</label>
          <input
            type="text"
            value={profile.tagline}
            onChange={(e) => handleChange('tagline', e.target.value)}
            className="w-full bg-dark-card border border-white/10 rounded-lg px-4 py-3 text-white focus:border-accent focus:outline-none transition-colors"
            placeholder="e.g. Presskit / EPK"
          />
        </div>

        <div>
          <label className="block text-sm uppercase tracking-widest font-bold mb-2">Genres</label>
          <input
            type="text"
            value={(profile.genres || []).join(', ')}
            onChange={(e) => handleChange('genres', e.target.value.split(',').map((g: string) => g.trim()).filter(Boolean))}
            className="w-full bg-dark-card border border-white/10 rounded-lg px-4 py-3 text-white focus:border-accent focus:outline-none transition-colors"
            placeholder="House, Tech House, Melodic House"
          />
          <p className="text-xs text-text-secondary mt-1">Comma-separated</p>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-sm uppercase tracking-widest font-bold">Published</label>
          <button
            onClick={() => handleChange('published', !profile.published)}
            className={`w-12 h-6 rounded-full transition-colors relative ${profile.published ? 'bg-accent' : 'bg-white/10'}`}
          >
            <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${profile.published ? 'translate-x-6' : 'translate-x-0.5'}`} />
          </button>
          <span className="text-xs text-text-secondary">{profile.published ? 'Live' : 'Hidden'}</span>
        </div>
      </div>
    </div>
  )
}
```

**Step 3: Verify profile editing works**

**Step 4: Commit**

```bash
git add -A && git commit -m "feat: add profile editor with auto-save"
```

---

### Task 7: Bio Editor

**Files:**
- Create: `src/routes/_dashboard/dashboard.bio.tsx`

**Step 1: Create `src/routes/_dashboard/dashboard.bio.tsx`**

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { useState, useCallback } from 'react'
import { getProfile, updateProfile } from '~/server/profile'

export const Route = createFileRoute('/_dashboard/dashboard/bio')({
  loader: () => getProfile(),
  component: BioEditor,
})

function BioEditor() {
  const initialProfile = Route.useLoaderData()
  const [bioLeft, setBioLeft] = useState(initialProfile?.bio_left || '')
  const [bioRight, setBioRight] = useState(initialProfile?.bio_right || '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const [timer, setTimer] = useState<ReturnType<typeof setTimeout> | null>(null)
  const autoSave = useCallback((field: string, value: string) => {
    if (timer) clearTimeout(timer)
    const t = setTimeout(async () => {
      setSaving(true)
      setSaved(false)
      await updateProfile({ data: { [field]: value } })
      setSaving(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }, 800)
    setTimer(t)
  }, [timer])

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-black uppercase tracking-wider">Bio</h1>
        <span className="text-xs text-text-secondary">
          {saving ? 'Saving...' : saved ? 'Saved' : ''}
        </span>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm uppercase tracking-widest font-bold mb-2">Left Column</label>
          <textarea
            value={bioLeft}
            onChange={(e) => { setBioLeft(e.target.value); autoSave('bio_left', e.target.value) }}
            rows={15}
            className="w-full bg-dark-card border border-white/10 rounded-lg px-4 py-3 text-white placeholder-text-secondary/50 focus:border-accent focus:outline-none transition-colors resize-none text-sm leading-relaxed"
            placeholder="First half of your bio..."
          />
        </div>
        <div>
          <label className="block text-sm uppercase tracking-widest font-bold mb-2">Right Column</label>
          <textarea
            value={bioRight}
            onChange={(e) => { setBioRight(e.target.value); autoSave('bio_right', e.target.value) }}
            rows={15}
            className="w-full bg-dark-card border border-white/10 rounded-lg px-4 py-3 text-white placeholder-text-secondary/50 focus:border-accent focus:outline-none transition-colors resize-none text-sm leading-relaxed"
            placeholder="Second half of your bio..."
          />
        </div>
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add -A && git commit -m "feat: add bio editor with two-column layout and auto-save"
```

---

### Task 8: Dynamic Public EPK Page

**Files:**
- Create: `src/routes/$slug.tsx`
- Create: `src/server/public-profile.ts`

This is the key task — the public EPK page that reads from the database and renders using the existing components (refactored to accept data as props).

**Step 1: Create `src/server/public-profile.ts`**

```ts
import { createServerFn } from '@tanstack/react-start'
import { getSupabaseAdmin } from '~/utils/supabase'

export const getPublicProfile = createServerFn({ method: 'GET' })
  .validator((slug: string) => slug)
  .handler(async ({ data: slug }) => {
    const supabase = getSupabaseAdmin()

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('slug', slug)
      .eq('published', true)
      .single()

    if (!profile) return null

    const [
      { data: socialLinks },
      { data: mixes },
      { data: events },
      { data: technicalRider },
      { data: bookingContact },
      { data: pressAssets },
    ] = await Promise.all([
      supabase.from('social_links').select('*').eq('profile_id', profile.id).order('sort_order'),
      supabase.from('mixes').select('*').eq('profile_id', profile.id).order('sort_order'),
      supabase.from('events').select('*').eq('profile_id', profile.id).order('sort_order'),
      supabase.from('technical_rider').select('*').eq('profile_id', profile.id).single(),
      supabase.from('booking_contact').select('*').eq('profile_id', profile.id).single(),
      supabase.from('press_assets').select('*').eq('profile_id', profile.id).order('sort_order'),
    ])

    return {
      profile,
      socialLinks: socialLinks || [],
      mixes: mixes || [],
      events: events || [],
      technicalRider: technicalRider || null,
      bookingContact: bookingContact || null,
      pressAssets: pressAssets || [],
    }
  })
```

**Step 2: Create `src/routes/$slug.tsx`**

This route renders a public EPK from database data. It reuses the same visual structure as the existing static EPK.

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { getPublicProfile } from '~/server/public-profile'
import { Nav } from '~/components/Nav'
import { Footer } from '~/components/Footer'
import { FadeIn } from '~/components/FadeIn'

export const Route = createFileRoute('/$slug')({
  loader: ({ params }) => getPublicProfile({ data: params.slug }),
  head: ({ loaderData }) => {
    const name = loaderData?.profile?.display_name || 'DJ'
    return {
      meta: [
        { title: `${name} | DJ - Official Press Kit` },
        { name: 'description', content: `Official Electronic Press Kit for ${name}.` },
        { name: 'og:title', content: `${name} | DJ - Official Press Kit` },
        { name: 'og:type', content: 'website' },
      ],
    }
  },
  component: PublicEPK,
  notFoundComponent: () => (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center">
      <p className="text-text-secondary">This EPK page doesn't exist.</p>
    </div>
  ),
})

function PublicEPK() {
  const data = Route.useLoaderData()
  if (!data) return <div className="min-h-screen bg-dark-bg flex items-center justify-center"><p className="text-text-secondary">Page not found.</p></div>

  const { profile, socialLinks, mixes, events, technicalRider, bookingContact } = data

  return (
    <>
      <Nav />
      <main>
        {/* Hero */}
        <section className="relative h-screen flex items-center justify-center overflow-hidden">
          {profile.hero_image_url ? (
            <img src={profile.hero_image_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-b from-dark-bg via-dark-surface to-dark-bg" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-dark-bg/90 via-transparent to-dark-bg/60" />
          <div className="relative z-10 text-center">
            <h1 className="text-6xl md:text-8xl font-black tracking-tight mb-2">
              {profile.display_name.toUpperCase()}
            </h1>
            {profile.tagline && (
              <p className="text-lg md:text-xl tracking-[0.3em] text-text-secondary uppercase mb-8">
                {profile.tagline}
              </p>
            )}
          </div>
        </section>

        {/* Bio */}
        {(profile.bio_left || profile.bio_right) && (
          <FadeIn>
            <section id="bio" className="py-20 px-4">
              <div className="max-w-6xl mx-auto">
                <div className="w-20 h-1 bg-accent mb-8 shadow-[0_0_10px_var(--color-accent-glow)]" />
                <h2 className="text-4xl md:text-5xl font-black uppercase tracking-wider mb-12">Bio</h2>
                <div className="grid md:grid-cols-2 gap-8 md:gap-12 text-text-secondary leading-relaxed">
                  {profile.bio_left && <div className="whitespace-pre-line">{profile.bio_left}</div>}
                  {profile.bio_right && <div className="whitespace-pre-line">{profile.bio_right}</div>}
                </div>
              </div>
            </section>
          </FadeIn>
        )}

        {/* Events */}
        {events.length > 0 && (
          <FadeIn>
            <section id="events" className="py-20 px-4">
              <div className="max-w-6xl mx-auto">
                <div className="w-20 h-1 bg-accent mb-8 shadow-[0_0_10px_var(--color-accent-glow)]" />
                <h2 className="text-4xl md:text-5xl font-black uppercase tracking-wider mb-12">
                  Events <span className="text-accent">&amp;</span> Brands
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {events.map((event) => (
                    <a
                      key={event.id}
                      href={event.link_url || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group block rounded-lg overflow-hidden border border-white/5 hover:border-accent/30 transition-all hover:scale-105"
                    >
                      <div className="aspect-square overflow-hidden bg-dark-card">
                        {event.image_url && (
                          <img src={event.image_url} alt={event.name} className="w-full h-full object-cover object-center" loading="lazy" />
                        )}
                      </div>
                      <div className="bg-dark-card/80 backdrop-blur-sm px-3 py-2">
                        <p className="text-xs text-center text-text-secondary leading-tight">{event.name}</p>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            </section>
          </FadeIn>
        )}

        {/* Technical Rider */}
        {technicalRider && (technicalRider.preferred_setup || technicalRider.alternative_setup) && (
          <FadeIn>
            <section id="technical" className="py-20 px-4">
              <div className="max-w-4xl mx-auto">
                <div className="w-20 h-1 bg-accent mb-8 shadow-[0_0_10px_var(--color-accent-glow)]" />
                <h2 className="text-4xl md:text-5xl font-black uppercase tracking-wider mb-12">Technical Rider</h2>
                <div className="bg-dark-card backdrop-blur-sm rounded-xl border border-white/5 overflow-hidden">
                  {technicalRider.preferred_setup && (
                    <div className="px-6 py-4 border-b border-white/5">
                      <p className="text-sm uppercase tracking-widest font-bold mb-3">Preferred Setup</p>
                      <div className="text-text-secondary text-sm leading-relaxed whitespace-pre-line">{technicalRider.preferred_setup}</div>
                    </div>
                  )}
                  {technicalRider.alternative_setup && (
                    <div className="px-6 py-4">
                      <p className="text-sm uppercase tracking-widest font-bold mb-3">Alternative Setup</p>
                      <div className="text-text-secondary text-sm leading-relaxed whitespace-pre-line">{technicalRider.alternative_setup}</div>
                    </div>
                  )}
                </div>
              </div>
            </section>
          </FadeIn>
        )}

        {/* Contact */}
        {bookingContact && bookingContact.manager_name && (
          <FadeIn>
            <section id="contact" className="py-20 px-4">
              <div className="max-w-4xl mx-auto">
                <div className="w-20 h-1 bg-accent mb-8 shadow-[0_0_10px_var(--color-accent-glow)]" />
                <h2 className="text-4xl md:text-5xl font-black uppercase tracking-wider mb-12">Booking Contact</h2>
                <div className="text-text-secondary space-y-2">
                  <p><strong>Management:</strong> {bookingContact.manager_name}</p>
                  {bookingContact.email && <p><strong>Email:</strong> {bookingContact.email}</p>}
                  {bookingContact.phone && <p><strong>Phone:</strong> {bookingContact.phone}</p>}
                </div>
              </div>
            </section>
          </FadeIn>
        )}
      </main>
      <Footer />
    </>
  )
}
```

**Step 3: Verify public page renders from database**

1. Sign up, fill in some profile data
2. Set `published = true`
3. Visit `/:slug`

**Step 4: Commit**

```bash
git add -A && git commit -m "feat: add dynamic public EPK page rendering from Supabase"
```

---

### Task 9: Update Landing Page & Route Cleanup

**Files:**
- Modify: `src/routes/index.tsx`

**Step 1: Replace `src/routes/index.tsx`**

The root `/` becomes a simple landing/marketing page (since the EPK now lives at `/:slug`).

```tsx
import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: LandingPage,
})

function LandingPage() {
  return (
    <div className="min-h-screen bg-dark-bg">
      <nav className="max-w-6xl mx-auto px-4 py-6 flex items-center justify-between">
        <span className="text-lg font-bold tracking-wider">DJ EPK</span>
        <div className="flex gap-4">
          <Link to="/login" className="text-sm text-text-secondary hover:text-white transition-colors">Log in</Link>
          <Link to="/signup" className="text-sm bg-accent hover:bg-accent/80 text-white px-4 py-2 rounded-lg transition-colors">Sign up free</Link>
        </div>
      </nav>

      <section className="max-w-4xl mx-auto px-4 py-32 text-center">
        <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-6">
          Your DJ Press Kit,<br />Online.
        </h1>
        <p className="text-xl text-text-secondary mb-12 max-w-2xl mx-auto">
          Create a professional Electronic Press Kit in minutes. Share your bio, mixes, events, technical rider and booking info — all in one link.
        </p>
        <Link
          to="/signup"
          className="inline-block bg-accent hover:bg-accent/80 text-white font-bold uppercase tracking-widest px-8 py-4 rounded-lg transition-colors text-lg"
        >
          Get Started Free
        </Link>
      </section>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add -A && git commit -m "feat: replace static EPK with marketing landing page"
```

---

**Phase 1 is complete after these 9 tasks.** At this point you have:
- Supabase auth (signup/login/logout)
- Protected dashboard with sidebar
- Profile editor with auto-save
- Bio editor
- Dynamic public EPK page at `/:slug`
- Marketing landing page at `/`
