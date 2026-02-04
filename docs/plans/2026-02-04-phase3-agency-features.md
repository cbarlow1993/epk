# Phase 3: Agency Features v1.2 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add multi-tenant agency features: organizations with role-based access, multi-artist management, team invites, agency branding, per-artist billing, and aggregated analytics.

**Architecture:** New `organizations` and `organization_members` tables. A `can_access_profile()` SQL function replaces all existing RLS policies. Profile switching via URL param. Agency landing page at `/agency/$orgSlug`.

**Tech Stack:** Existing stack + Resend (for team invites), PostHog API (for aggregated analytics)

**Depends on:** Phase 0, Phase 1, Phase 2 (analytics must exist for aggregation)

---

## Task 1: Organizations Database Schema

**Files:**
- Modify: `supabase/schema.sql`
- Modify: `src/types/database.ts`

**Step 1: Add organizations tables**

Append to `supabase/schema.sql`:

```sql
-- Organizations (agencies)
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  website_url TEXT,
  billing_email TEXT,
  stripe_customer_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'manager', 'artist')),
  assigned_profiles UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, user_id)
);

CREATE TABLE organization_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'manager', 'artist')),
  token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  accepted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT now() + interval '7 days',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add organization reference to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS managed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_invites ENABLE ROW LEVEL SECURITY;

-- Updated_at trigger for organizations
CREATE TRIGGER organizations_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

**Step 2: Add types**

In `src/types/database.ts`:

```typescript
export type OrgRole = 'owner' | 'admin' | 'manager' | 'artist'

export interface OrganizationRow {
  id: string
  name: string
  slug: string
  logo_url: string | null
  website_url: string | null
  billing_email: string | null
  stripe_customer_id: string | null
  created_at: string
  updated_at: string
}

export interface OrganizationMemberRow {
  id: string
  organization_id: string
  user_id: string
  role: OrgRole
  assigned_profiles: string[]
  created_at: string
}

export interface OrganizationInviteRow {
  id: string
  organization_id: string
  email: string
  role: OrgRole
  token: string
  accepted_at: string | null
  expires_at: string
  created_at: string
}
```

Update `ProfileRow` to add:
```typescript
  organization_id: string | null
  managed_by: string | null
```

**Step 3: Run migration and commit**

```bash
npm run db:migrate
git add supabase/schema.sql src/types/database.ts
git commit -m "feat: add organizations, members, and invites tables"
```

---

## Task 2: Replace RLS with can_access_profile()

**Files:**
- Modify: `supabase/schema.sql`

This is the most critical migration. It replaces all existing RLS policies with a unified `can_access_profile()` function that supports both individual users and organization members.

**Step 1: Create the function and update policies**

Append to `supabase/schema.sql`:

```sql
-- Unified profile access function
-- Checks: direct owner, org owner/admin, assigned manager, or artist managing own profile
CREATE OR REPLACE FUNCTION can_access_profile(p_profile_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    -- Direct owner (individual account — profile.id = auth.uid())
    SELECT 1 FROM profiles WHERE id = p_profile_id AND id = auth.uid()
    UNION ALL
    -- Org owner or admin
    SELECT 1 FROM profiles p
    JOIN organization_members om ON om.organization_id = p.organization_id
    WHERE p.id = p_profile_id
    AND om.user_id = auth.uid()
    AND om.role IN ('owner', 'admin')
    UNION ALL
    -- Manager with profile assigned
    SELECT 1 FROM profiles p
    JOIN organization_members om ON om.organization_id = p.organization_id
    WHERE p.id = p_profile_id
    AND om.user_id = auth.uid()
    AND om.role = 'manager'
    AND p_profile_id = ANY(om.assigned_profiles)
    UNION ALL
    -- Artist managing own profile
    SELECT 1 FROM profiles
    WHERE id = p_profile_id
    AND managed_by = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Update the existing is_profile_owner function to use can_access_profile
CREATE OR REPLACE FUNCTION is_profile_owner(p_profile_id UUID)
RETURNS BOOLEAN AS $$
  SELECT can_access_profile(p_profile_id);
$$ LANGUAGE sql SECURITY DEFINER;

-- Organization RLS policies
CREATE POLICY "Members can view own org" ON organizations FOR SELECT USING (
  EXISTS (SELECT 1 FROM organization_members WHERE organization_id = organizations.id AND user_id = auth.uid())
);
CREATE POLICY "Owner/admin can update org" ON organizations FOR UPDATE USING (
  EXISTS (SELECT 1 FROM organization_members WHERE organization_id = organizations.id AND user_id = auth.uid() AND role IN ('owner', 'admin'))
);

CREATE POLICY "Members can view org members" ON organization_members FOR SELECT USING (
  EXISTS (SELECT 1 FROM organization_members om WHERE om.organization_id = organization_members.organization_id AND om.user_id = auth.uid())
);
CREATE POLICY "Owner/admin can manage members" ON organization_members FOR ALL USING (
  EXISTS (SELECT 1 FROM organization_members om WHERE om.organization_id = organization_members.organization_id AND om.user_id = auth.uid() AND om.role IN ('owner', 'admin'))
);

CREATE POLICY "Owner/admin can manage invites" ON organization_invites FOR ALL USING (
  EXISTS (SELECT 1 FROM organization_members om WHERE om.organization_id = organization_invites.organization_id AND om.user_id = auth.uid() AND om.role IN ('owner', 'admin'))
);

-- Public can view org for agency landing pages
CREATE POLICY "Public can view organizations" ON organizations FOR SELECT USING (true);
```

**Key design decision:** By redefining `is_profile_owner()` to delegate to `can_access_profile()`, ALL existing RLS policies on child tables (mixes, events, social_links, press_assets, technical_rider, booking_contact, booking_requests, files, folders) automatically inherit agency access. No need to update those policies individually.

**Step 2: Run migration and commit**

```bash
npm run db:migrate
git add supabase/schema.sql
git commit -m "feat: replace RLS with can_access_profile() supporting org access"
```

---

## Task 3: Organization Schemas

**Files:**
- Create: `src/schemas/organization.ts`
- Modify: `src/schemas/index.ts`

**Step 1: Create schemas**

```typescript
// src/schemas/organization.ts
import { z } from 'zod'

export const organizationCreateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  slug: z.string()
    .min(2, 'Slug must be at least 2 characters')
    .max(50)
    .regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/, 'Lowercase alphanumeric and hyphens'),
  logo_url: z.string().url().optional().or(z.literal('')),
  website_url: z.string().url().optional().or(z.literal('')),
})

export const organizationUpdateSchema = organizationCreateSchema.partial()

export const inviteMemberSchema = z.object({
  email: z.string().email('Valid email required'),
  role: z.enum(['admin', 'manager', 'artist']),
})

export const updateMemberRoleSchema = z.object({
  member_id: z.string().uuid(),
  role: z.enum(['owner', 'admin', 'manager', 'artist']),
})

export const assignProfilesSchema = z.object({
  member_id: z.string().uuid(),
  profile_ids: z.array(z.string().uuid()),
})

export type OrganizationCreate = z.infer<typeof organizationCreateSchema>
export type InviteMember = z.infer<typeof inviteMemberSchema>
```

**Step 2: Add to barrel export**

```typescript
export * from './organization'
```

**Step 3: Commit**

```bash
git add src/schemas/organization.ts src/schemas/index.ts
git commit -m "feat: add organization and team member schemas"
```

---

## Task 4: Organization Server Functions

**Files:**
- Create: `src/server/organizations.ts`

```typescript
// src/server/organizations.ts
import { createServerFn } from '@tanstack/react-start'
import { organizationCreateSchema, organizationUpdateSchema } from '~/schemas/organization'
import { withAuth } from './utils'

export const createOrganization = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => organizationCreateSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabase, user } = await withAuth()

    // Create organization
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name: data.name,
        slug: data.slug,
        logo_url: data.logo_url || null,
        website_url: data.website_url || null,
      })
      .select()
      .single()

    if (orgError) return { error: orgError.message }

    // Add current user as owner
    const { error: memberError } = await supabase
      .from('organization_members')
      .insert({
        organization_id: org.id,
        user_id: user.id,
        role: 'owner',
      })

    if (memberError) return { error: memberError.message }

    return { organization: org }
  })

export const getOrganization = createServerFn({ method: 'GET' }).handler(async () => {
  const { supabase, user } = await withAuth()

  // Find org membership for current user
  const { data: membership } = await supabase
    .from('organization_members')
    .select('organization_id, role')
    .eq('user_id', user.id)
    .single()

  if (!membership) return null

  const { data: org } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', membership.organization_id)
    .single()

  return org ? { ...org, userRole: membership.role } : null
})

export const updateOrganization = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => organizationUpdateSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabase, user } = await withAuth()

    // Verify owner/admin
    const { data: membership } = await supabase
      .from('organization_members')
      .select('organization_id, role')
      .eq('user_id', user.id)
      .in('role', ['owner', 'admin'])
      .single()

    if (!membership) return { error: 'Not authorized' }

    const { data: org, error } = await supabase
      .from('organizations')
      .update(data)
      .eq('id', membership.organization_id)
      .select()
      .single()

    if (error) return { error: error.message }
    return { organization: org }
  })
```

**Commit:**
```bash
git add src/server/organizations.ts
git commit -m "feat: add organization CRUD server functions"
```

---

## Task 5: Team Management Server Functions

**Files:**
- Create: `src/server/team.ts`

```typescript
// src/server/team.ts
import { createServerFn } from '@tanstack/react-start'
import { inviteMemberSchema, updateMemberRoleSchema, assignProfilesSchema } from '~/schemas/organization'
import { withAuth } from './utils'
import { sendTeamInviteEmail } from './email'

export const getTeamMembers = createServerFn({ method: 'GET' }).handler(async () => {
  const { supabase, user } = await withAuth()

  const { data: membership } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id)
    .single()

  if (!membership) return []

  const { data: members } = await supabase
    .from('organization_members')
    .select('*, user:auth.users(email)')
    .eq('organization_id', membership.organization_id)
    .order('created_at')

  return members || []
})

export const inviteTeamMember = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => inviteMemberSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabase, user } = await withAuth()

    // Verify owner/admin
    const { data: membership } = await supabase
      .from('organization_members')
      .select('organization_id, role')
      .eq('user_id', user.id)
      .in('role', ['owner', 'admin'])
      .single()

    if (!membership) return { error: 'Not authorized' }

    // Get org name for email
    const { data: org } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', membership.organization_id)
      .single()

    // Create invite
    const { data: invite, error } = await supabase
      .from('organization_invites')
      .insert({
        organization_id: membership.organization_id,
        email: data.email,
        role: data.role,
      })
      .select()
      .single()

    if (error) return { error: error.message }

    // Send invite email (fire and forget)
    if (invite) {
      sendTeamInviteEmail(data.email, org?.name || 'An agency', invite.token, data.role).catch(console.error)
    }

    return { invite }
  })

export const acceptInvite = createServerFn({ method: 'POST' })
  .inputValidator((data: { token: string }) => data)
  .handler(async ({ data: { token } }) => {
    const { supabase, user } = await withAuth()

    // Find invite
    const { data: invite } = await supabase
      .from('organization_invites')
      .select('*')
      .eq('token', token)
      .is('accepted_at', null)
      .gte('expires_at', new Date().toISOString())
      .single()

    if (!invite) return { error: 'Invalid or expired invite' }

    // Add user to organization
    const { error: memberError } = await supabase
      .from('organization_members')
      .insert({
        organization_id: invite.organization_id,
        user_id: user.id,
        role: invite.role,
      })

    if (memberError) return { error: memberError.message }

    // Mark invite as accepted
    await supabase
      .from('organization_invites')
      .update({ accepted_at: new Date().toISOString() })
      .eq('id', invite.id)

    return { success: true, organization_id: invite.organization_id }
  })

export const updateMemberRole = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => updateMemberRoleSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabase, user } = await withAuth()

    // Verify owner/admin
    const { data: membership } = await supabase
      .from('organization_members')
      .select('organization_id, role')
      .eq('user_id', user.id)
      .in('role', ['owner', 'admin'])
      .single()

    if (!membership) return { error: 'Not authorized' }

    const { error } = await supabase
      .from('organization_members')
      .update({ role: data.role })
      .eq('id', data.member_id)
      .eq('organization_id', membership.organization_id)

    if (error) return { error: error.message }
    return { success: true }
  })

export const assignProfiles = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => assignProfilesSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabase, user } = await withAuth()

    const { data: membership } = await supabase
      .from('organization_members')
      .select('organization_id, role')
      .eq('user_id', user.id)
      .in('role', ['owner', 'admin'])
      .single()

    if (!membership) return { error: 'Not authorized' }

    const { error } = await supabase
      .from('organization_members')
      .update({ assigned_profiles: data.profile_ids })
      .eq('id', data.member_id)
      .eq('organization_id', membership.organization_id)

    if (error) return { error: error.message }
    return { success: true }
  })

export const removeMember = createServerFn({ method: 'POST' })
  .inputValidator((data: { member_id: string }) => data)
  .handler(async ({ data: { member_id } }) => {
    const { supabase, user } = await withAuth()

    const { data: membership } = await supabase
      .from('organization_members')
      .select('organization_id, role')
      .eq('user_id', user.id)
      .in('role', ['owner', 'admin'])
      .single()

    if (!membership) return { error: 'Not authorized' }

    // Prevent removing the last owner
    const { data: targetMember } = await supabase
      .from('organization_members')
      .select('role')
      .eq('id', member_id)
      .single()

    if (targetMember?.role === 'owner') {
      const { count } = await supabase
        .from('organization_members')
        .select('id', { count: 'exact' })
        .eq('organization_id', membership.organization_id)
        .eq('role', 'owner')

      if ((count || 0) <= 1) return { error: 'Cannot remove the last owner' }
    }

    const { error } = await supabase
      .from('organization_members')
      .delete()
      .eq('id', member_id)
      .eq('organization_id', membership.organization_id)

    if (error) return { error: error.message }
    return { success: true }
  })
```

**Step 2: Add team invite email to email.ts**

In `src/server/email.ts`, add:

```typescript
export async function sendTeamInviteEmail(to: string, orgName: string, token: string, role: string) {
  const inviteUrl = `${process.env.APP_BASE_URL || 'http://localhost:3000'}/invite/${token}`
  await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `You've been invited to join ${orgName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Team Invite</h2>
        <p>You've been invited to join <strong>${orgName}</strong> as a <strong>${role}</strong>.</p>
        <a href="${inviteUrl}" style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 16px;">Accept Invite</a>
        <p style="margin-top: 24px; font-size: 12px; color: #999;">This invite expires in 7 days.</p>
      </div>
    `,
  })
}
```

**Commit:**
```bash
git add src/server/team.ts src/server/email.ts
git commit -m "feat: add team management server functions with invite emails"
```

---

## Task 6: Profile Switching Hook

**Files:**
- Create: `src/hooks/useActiveProfile.ts`
- Modify: `src/server/list-helpers.ts`
- Modify: `src/server/utils.ts`

**Step 1: Create the hook**

Agency users need to switch between artist profiles. The active profile ID is stored in URL search params.

```typescript
// src/hooks/useActiveProfile.ts
import { useSearch, useNavigate } from '@tanstack/react-router'

export function useActiveProfile() {
  // Read ?profile=uuid from URL search params
  const search = useSearch({ strict: false }) as { profile?: string }
  const navigate = useNavigate()

  const activeProfileId = search.profile || null

  const setActiveProfile = (profileId: string | null) => {
    navigate({
      search: (prev: Record<string, unknown>) => {
        if (profileId) return { ...prev, profile: profileId }
        const { profile, ...rest } = prev
        return rest
      },
    })
  }

  return { activeProfileId, setActiveProfile }
}
```

**Step 2: Update withAuth to support profile switching**

In `src/server/utils.ts`, add a variant that accepts a profile ID:

```typescript
export async function withAuthForProfile(profileId?: string) {
  const supabase = getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // If a profileId is specified and it's different from user.id,
  // the RLS policies (via can_access_profile) will enforce authorization.
  // The server function just needs to use this profileId instead of user.id.
  const effectiveProfileId = profileId || user.id

  return { supabase, user, profileId: effectiveProfileId }
}
```

**Step 3: Update list-helpers to use profile ID**

In `src/server/list-helpers.ts`, update functions to accept an optional `profileId` parameter:

```typescript
export async function getListItems(table: string, profileId?: string) {
  const { supabase, user } = await withAuthOrNull()
  if (!user) return []
  const id = profileId || user.id
  const { data } = await supabase.from(table).select('*').eq('profile_id', id).order('sort_order')
  return data || []
}
```

Similarly update `upsertListItem`, `deleteListItem`, `reorderListItems`.

**Note:** The RLS policies (via `can_access_profile` / `is_profile_owner`) will enforce that the user actually has permission to access this profile. The server functions just need to query with the right `profile_id`.

**Step 4: Commit**

```bash
git add src/hooks/useActiveProfile.ts src/server/utils.ts src/server/list-helpers.ts
git commit -m "feat: add profile switching hook and update server utils for agency access"
```

---

## Task 7: Onboarding Flow

**Files:**
- Create: `src/routes/onboarding.tsx`
- Modify: `src/routes/_dashboard.tsx`

**Step 1: Create onboarding page**

```tsx
// src/routes/onboarding.tsx
import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { createOrganization } from '~/server/organizations'
import { FORM_INPUT, FORM_LABEL, BTN_PRIMARY, SETTINGS_CARD } from '~/components/forms'

export const Route = createFileRoute('/onboarding')({
  component: OnboardingPage,
})

function OnboardingPage() {
  const [accountType, setAccountType] = useState<'individual' | 'agency' | null>(null)
  const [orgName, setOrgName] = useState('')
  const [orgSlug, setOrgSlug] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!accountType) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center px-4">
        <div className="w-full max-w-lg">
          <h1 className="text-3xl font-black uppercase tracking-wider text-center mb-8">Welcome</h1>
          <p className="text-text-secondary text-center mb-8">How will you be using DJ EPK?</p>
          <div className="grid sm:grid-cols-2 gap-4">
            <button
              onClick={() => { window.location.href = '/dashboard' }}
              className={`${SETTINGS_CARD} text-left hover:border-accent/30 transition-colors`}
            >
              <p className="font-bold text-lg mb-2">Individual Artist</p>
              <p className="text-text-secondary text-sm">Manage your own DJ profile and EPK.</p>
            </button>
            <button
              onClick={() => setAccountType('agency')}
              className={`${SETTINGS_CARD} text-left hover:border-accent/30 transition-colors`}
            >
              <p className="font-bold text-lg mb-2">Agency / Management</p>
              <p className="text-text-secondary text-sm">Manage multiple artists with your team.</p>
            </button>
          </div>
        </div>
      </div>
    )
  }

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const result = await createOrganization({
      data: { name: orgName, slug: orgSlug },
    })

    if ('error' in result && result.error) {
      setError(result.error)
      setLoading(false)
      return
    }

    window.location.href = '/dashboard'
  }

  return (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-black uppercase tracking-wider text-center mb-8">Create Agency</h1>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 mb-6 text-red-400 text-sm">{error}</div>
        )}

        <form onSubmit={handleCreateOrg} className="space-y-6">
          <div>
            <label className={FORM_LABEL}>Agency Name</label>
            <input
              type="text"
              value={orgName}
              onChange={(e) => {
                setOrgName(e.target.value)
                setOrgSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''))
              }}
              className={FORM_INPUT}
              placeholder="Your Agency Name"
              required
            />
          </div>
          <div>
            <label className={FORM_LABEL}>Agency URL</label>
            <div className="flex items-center">
              <span className="text-text-secondary text-sm mr-2">djepk.com/agency/</span>
              <input
                type="text"
                value={orgSlug}
                onChange={(e) => setOrgSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                className={FORM_INPUT}
                required
              />
            </div>
          </div>
          <button type="submit" disabled={loading} className={`w-full ${BTN_PRIMARY} py-3`}>
            {loading ? 'Creating...' : 'Create Agency'}
          </button>
        </form>

        <button
          onClick={() => setAccountType(null)}
          className="text-text-secondary text-sm text-center mt-6 block mx-auto hover:text-white"
        >
          Go back
        </button>
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/routes/onboarding.tsx
git commit -m "feat: add onboarding page with individual/agency account selection"
```

---

## Task 8: Invite Accept Route

**Files:**
- Create: `src/routes/invite/$token.tsx`

```tsx
// src/routes/invite/$token.tsx
import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { acceptInvite } from '~/server/team'

export const Route = createFileRoute('/invite/$token')({
  component: InviteAcceptPage,
})

function InviteAcceptPage() {
  const { token } = Route.useParams()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [error, setError] = useState('')

  useEffect(() => {
    acceptInvite({ data: { token } }).then((result) => {
      if ('error' in result && result.error) {
        setError(result.error)
        setStatus('error')
      } else {
        setStatus('success')
        setTimeout(() => { window.location.href = '/dashboard' }, 2000)
      }
    })
  }, [token])

  return (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center px-4">
      <div className="text-center">
        {status === 'loading' && <p className="text-text-secondary">Accepting invite...</p>}
        {status === 'success' && (
          <>
            <p className="text-accent font-bold text-lg mb-2">Welcome to the team!</p>
            <p className="text-text-secondary text-sm">Redirecting to dashboard...</p>
          </>
        )}
        {status === 'error' && (
          <p className="text-red-400">{error}</p>
        )}
      </div>
    </div>
  )
}
```

**Commit:**
```bash
git add src/routes/invite/\$token.tsx
git commit -m "feat: add invite acceptance route"
```

---

## Task 9: Artist Roster Dashboard

**Files:**
- Create: `src/routes/_dashboard/dashboard.roster.tsx`
- Modify: `src/components/DashboardSidebar.tsx`

**Step 1: Create roster server function**

Add to `src/server/organizations.ts`:

```typescript
export const getOrgProfiles = createServerFn({ method: 'GET' }).handler(async () => {
  const { supabase, user } = await withAuth()

  const { data: membership } = await supabase
    .from('organization_members')
    .select('organization_id, role, assigned_profiles')
    .eq('user_id', user.id)
    .single()

  if (!membership) return []

  let query = supabase
    .from('profiles')
    .select('id, display_name, slug, profile_image_url, tier, published, updated_at')
    .eq('organization_id', membership.organization_id)

  // Managers only see assigned profiles
  if (membership.role === 'manager') {
    query = query.in('id', membership.assigned_profiles)
  }

  const { data } = await query.order('display_name')
  return data || []
})

export const createOrgProfile = createServerFn({ method: 'POST' })
  .inputValidator((data: { display_name: string; slug: string }) => data)
  .handler(async ({ data }) => {
    const { supabase, user } = await withAuth()

    const { data: membership } = await supabase
      .from('organization_members')
      .select('organization_id, role')
      .eq('user_id', user.id)
      .in('role', ['owner', 'admin'])
      .single()

    if (!membership) return { error: 'Not authorized' }

    // Use admin client to create profile (not tied to auth.uid())
    const { getSupabaseAdmin } = await import('~/utils/supabase')
    const admin = getSupabaseAdmin()

    // Create a new auth user for the profile or use a placeholder
    // For agency-created profiles, we create the profile directly
    const profileId = crypto.randomUUID()

    const { data: profile, error } = await admin
      .from('profiles')
      .insert({
        id: profileId,
        display_name: data.display_name,
        slug: data.slug,
        organization_id: membership.organization_id,
      })
      .select()
      .single()

    if (error) return { error: error.message }

    // Create associated rows
    await admin.from('technical_rider').insert({ profile_id: profileId })
    await admin.from('booking_contact').insert({ profile_id: profileId })

    return { profile }
  })
```

**Step 2: Create roster page**

```tsx
// src/routes/_dashboard/dashboard.roster.tsx
import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { getOrgProfiles, createOrgProfile, getOrganization } from '~/server/organizations'
import { FORM_INPUT, BTN_PRIMARY, BTN_BASE, CARD_SECTION } from '~/components/forms'

export const Route = createFileRoute('/_dashboard/dashboard/roster')({
  loader: async () => {
    const [profiles, org] = await Promise.all([getOrgProfiles(), getOrganization()])
    return { profiles, org }
  },
  component: RosterPage,
})

function RosterPage() {
  const { profiles: initialProfiles, org } = Route.useLoaderData()
  const [profiles, setProfiles] = useState(initialProfiles || [])
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [newSlug, setNewSlug] = useState('')

  if (!org) {
    return (
      <div>
        <h1 className="text-2xl font-black uppercase tracking-wider mb-8">Artist Roster</h1>
        <p className="text-text-secondary">You're not part of an agency. <Link to="/onboarding" className="text-accent hover:underline">Create one</Link></p>
      </div>
    )
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setAdding(true)
    const result = await createOrgProfile({ data: { display_name: newName, slug: newSlug } })
    if ('profile' in result && result.profile) {
      setProfiles(prev => [...prev, result.profile])
      setNewName('')
      setNewSlug('')
    }
    setAdding(false)
  }

  return (
    <div>
      <h1 className="text-2xl font-black uppercase tracking-wider mb-8">Artist Roster</h1>

      {/* Add Artist Form */}
      {(org.userRole === 'owner' || org.userRole === 'admin') && (
        <form onSubmit={handleAdd} className={CARD_SECTION}>
          <h2 className="text-sm uppercase tracking-widest font-bold mb-4">Add Artist</h2>
          <div className="grid sm:grid-cols-2 gap-4 mb-4">
            <input
              type="text"
              placeholder="Artist Name"
              value={newName}
              onChange={(e) => {
                setNewName(e.target.value)
                setNewSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''))
              }}
              className={FORM_INPUT}
              required
            />
            <input
              type="text"
              placeholder="url-slug"
              value={newSlug}
              onChange={(e) => setNewSlug(e.target.value)}
              className={FORM_INPUT}
              required
            />
          </div>
          <button type="submit" disabled={adding} className={BTN_PRIMARY}>
            {adding ? 'Adding...' : 'Add Artist'}
          </button>
        </form>
      )}

      {/* Artist Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {profiles.map((profile) => (
          <div key={profile.id} className="bg-dark-card border border-white/10 rounded-xl overflow-hidden">
            <div className="aspect-video bg-dark-surface flex items-center justify-center">
              {profile.profile_image_url ? (
                <img src={profile.profile_image_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-4xl font-black text-white/10">{(profile.display_name || '?')[0]}</span>
              )}
            </div>
            <div className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="font-bold truncate">{profile.display_name}</p>
                <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded ${
                  profile.tier === 'pro' ? 'bg-accent/20 text-accent' : 'bg-white/10 text-text-secondary'
                }`}>
                  {profile.tier}
                </span>
              </div>
              <p className="text-xs text-text-secondary mb-3">/{profile.slug}</p>
              <div className="flex gap-2">
                <Link
                  to="/dashboard"
                  search={{ profile: profile.id }}
                  className={`${BTN_BASE} text-xs bg-accent text-black hover:bg-accent/80`}
                >
                  Edit
                </Link>
                {profile.published && (
                  <a
                    href={`/${profile.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`${BTN_BASE} text-xs bg-white/10 text-white hover:bg-white/20`}
                  >
                    View
                  </a>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

**Step 3: Conditionally add Roster and Team to sidebar**

In `DashboardSidebar.tsx`, check if user belongs to an org and show Roster/Team items. This requires passing the org info to the sidebar. Update the sidebar to accept an `isAgency` prop:

Add to `NAV_ITEMS` conditionally or add a separate `AGENCY_NAV_ITEMS` array:

```typescript
const AGENCY_NAV_ITEMS = [
  { label: 'Roster', href: '/dashboard/roster' },
  { label: 'Team', href: '/dashboard/team' },
]
```

Render these in the nav if `isAgency` prop is true, inserted after "Profile" item.

**Step 4: Commit**

```bash
git add src/routes/_dashboard/dashboard.roster.tsx src/server/organizations.ts src/components/DashboardSidebar.tsx
git commit -m "feat: add artist roster dashboard for agency management"
```

---

## Task 10: Team Management Dashboard

**Files:**
- Create: `src/routes/_dashboard/dashboard.team.tsx`

```tsx
// src/routes/_dashboard/dashboard.team.tsx
import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { getTeamMembers, inviteTeamMember, updateMemberRole, removeMember } from '~/server/team'
import { getOrganization } from '~/server/organizations'
import { FORM_INPUT, BTN_PRIMARY, BTN_BASE, BTN_DELETE, CARD_SECTION } from '~/components/forms'
import type { OrgRole } from '~/types/database'

export const Route = createFileRoute('/_dashboard/dashboard/team')({
  loader: async () => {
    const [members, org] = await Promise.all([getTeamMembers(), getOrganization()])
    return { members, org }
  },
  component: TeamPage,
})

const ROLE_COLORS: Record<string, string> = {
  owner: 'bg-amber-500/20 text-amber-400',
  admin: 'bg-purple-500/20 text-purple-400',
  manager: 'bg-blue-500/20 text-blue-400',
  artist: 'bg-green-500/20 text-green-400',
}

const INVITABLE_ROLES: { value: OrgRole; label: string }[] = [
  { value: 'admin', label: 'Admin' },
  { value: 'manager', label: 'Manager' },
  { value: 'artist', label: 'Artist' },
]

function TeamPage() {
  const { members: initialMembers, org } = Route.useLoaderData()
  const [members, setMembers] = useState(initialMembers || [])
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<OrgRole>('manager')
  const [inviting, setInviting] = useState(false)

  const isAdmin = org?.userRole === 'owner' || org?.userRole === 'admin'

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    setInviting(true)
    const result = await inviteTeamMember({ data: { email: inviteEmail, role: inviteRole } })
    if ('invite' in result) {
      setInviteEmail('')
    }
    setInviting(false)
  }

  const handleRemove = async (memberId: string) => {
    const result = await removeMember({ data: { member_id: memberId } })
    if ('success' in result) {
      setMembers(prev => prev.filter((m: { id: string }) => m.id !== memberId))
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-black uppercase tracking-wider mb-8">Team</h1>

      {/* Invite Form */}
      {isAdmin && (
        <form onSubmit={handleInvite} className={CARD_SECTION}>
          <h2 className="text-sm uppercase tracking-widest font-bold mb-4">Invite Team Member</h2>
          <div className="flex gap-3">
            <input
              type="email"
              placeholder="Email address"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className={`${FORM_INPUT} flex-1`}
              required
            />
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as OrgRole)}
              className={`${FORM_INPUT} w-36`}
            >
              {INVITABLE_ROLES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
            <button type="submit" disabled={inviting} className={BTN_PRIMARY}>
              {inviting ? 'Sending...' : 'Invite'}
            </button>
          </div>
        </form>
      )}

      {/* Members List */}
      <div className="space-y-3">
        {members.map((member: { id: string; role: OrgRole; user: { email: string } | null }) => (
          <div key={member.id} className="bg-dark-card border border-white/10 rounded-xl p-4 flex items-center gap-4">
            <div className="flex-1">
              <p className="font-bold text-sm">{member.user?.email || 'Unknown'}</p>
            </div>
            <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded ${ROLE_COLORS[member.role]}`}>
              {member.role}
            </span>
            {isAdmin && member.role !== 'owner' && (
              <button
                onClick={() => handleRemove(member.id)}
                className={`${BTN_DELETE} text-xs`}
              >
                Remove
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
```

**Commit:**
```bash
git add src/routes/_dashboard/dashboard.team.tsx
git commit -m "feat: add team management dashboard with invite and role controls"
```

---

## Task 11: Agency Branding on Public EPK

**Files:**
- Modify: `src/server/public-profile.ts`
- Modify: `src/routes/$slug.tsx`

**Step 1: Include org data in public profile response**

In `src/server/public-profile.ts`, after fetching the profile, also fetch the organization if the profile belongs to one:

```typescript
    // Fetch organization if profile belongs to one
    let organization = null
    if (fullProfile.organization_id) {
      const { data: org } = await supabase
        .from('organizations')
        .select('name, logo_url, website_url, slug')
        .eq('id', fullProfile.organization_id)
        .single()
      organization = org
    }

    return {
      profile,
      socialLinks: socialLinks || [],
      mixes: mixes || [],
      events: events || [],
      technicalRider: technicalRider || null,
      bookingContact: bookingContact || null,
      pressAssets: pressAssets || [],
      organization,
    }
```

**Step 2: Render agency branding on public EPK**

In `$slug.tsx`, add before the footer:

```tsx
        {/* Agency Branding */}
        {data.organization && (
          <div className="py-6 text-center border-t border-white/5">
            <p className="text-xs text-text-secondary">
              Represented by{' '}
              {data.organization.website_url ? (
                <a href={data.organization.website_url} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                  {data.organization.name}
                </a>
              ) : (
                <span className="text-white">{data.organization.name}</span>
              )}
            </p>
          </div>
        )}
```

**Step 3: Commit**

```bash
git add src/server/public-profile.ts src/routes/\$slug.tsx
git commit -m "feat: show agency branding on public EPK for org-managed profiles"
```

---

## Task 12: Agency Landing Page

**Files:**
- Create: `src/routes/agency/$orgSlug.tsx`

```tsx
// src/routes/agency/$orgSlug.tsx
import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { getSupabaseServerClient } from '~/utils/supabase'

const getAgencyPage = createServerFn({ method: 'GET' })
  .inputValidator((slug: string) => slug)
  .handler(async ({ data: slug }) => {
    const supabase = getSupabaseServerClient()

    const { data: org } = await supabase
      .from('organizations')
      .select('*')
      .eq('slug', slug)
      .single()

    if (!org) return null

    const { data: profiles } = await supabase
      .from('profiles')
      .select('display_name, slug, profile_image_url, tagline, genres')
      .eq('organization_id', org.id)
      .eq('published', true)
      .order('display_name')

    return { organization: org, profiles: profiles || [] }
  })

export const Route = createFileRoute('/agency/$orgSlug')({
  loader: ({ params }) => getAgencyPage({ data: params.orgSlug }),
  component: AgencyPage,
  notFoundComponent: () => (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center">
      <p className="text-text-secondary">Agency not found.</p>
    </div>
  ),
})

function AgencyPage() {
  const data = Route.useLoaderData()
  if (!data) return null

  const { organization: org, profiles } = data

  return (
    <div className="min-h-screen bg-dark-bg text-white">
      {/* Header */}
      <header className="py-16 text-center border-b border-white/5">
        {org.logo_url && (
          <img src={org.logo_url} alt={org.name} className="h-16 mx-auto mb-6 object-contain" />
        )}
        <h1 className="text-4xl font-black uppercase tracking-wider mb-2">{org.name}</h1>
        {org.website_url && (
          <a href={org.website_url} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline text-sm">
            {org.website_url.replace(/^https?:\/\//, '')}
          </a>
        )}
      </header>

      {/* Artist Grid */}
      <main className="max-w-6xl mx-auto px-6 py-12">
        <h2 className="text-sm uppercase tracking-widest font-bold text-text-secondary mb-8">Artists</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {profiles.map((profile) => (
            <a
              key={profile.slug}
              href={`/${profile.slug}`}
              className="group block bg-dark-card border border-white/5 rounded-xl overflow-hidden hover:border-accent/30 transition-all hover:scale-105"
            >
              <div className="aspect-square bg-dark-surface overflow-hidden">
                {profile.profile_image_url ? (
                  <img src={profile.profile_image_url} alt={profile.display_name || ''} className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-6xl font-black text-white/10">{(profile.display_name || '?')[0]}</span>
                  </div>
                )}
              </div>
              <div className="p-4">
                <p className="font-bold truncate">{profile.display_name}</p>
                {profile.tagline && <p className="text-xs text-text-secondary truncate mt-1">{profile.tagline}</p>}
                {profile.genres && (profile.genres as string[]).length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {(profile.genres as string[]).slice(0, 3).map((g) => (
                      <span key={g} className="text-[10px] bg-white/10 rounded px-1.5 py-0.5">{g}</span>
                    ))}
                  </div>
                )}
              </div>
            </a>
          ))}
        </div>
      </main>
    </div>
  )
}
```

**Commit:**
```bash
git add src/routes/agency/\$orgSlug.tsx
git commit -m "feat: add public agency landing page with artist roster grid"
```

---

## Task 13: Per-Artist Billing

**Files:**
- Modify: `src/server/billing.ts`
- Create: `src/routes/_dashboard/dashboard.billing.tsx`

**Step 1: Update billing to support org-level billing**

In `src/server/billing.ts`, update `createCheckoutSession` to use org's Stripe customer for agency profiles:

```typescript
export const createCheckoutSession = createServerFn({ method: 'POST' })
  .inputValidator((data: { profileId?: string }) => data)
  .handler(async ({ data }) => {
    const { supabase, user } = await withAuth()

    const targetProfileId = data.profileId || user.id

    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id, slug, organization_id')
      .eq('id', targetProfileId)
      .single()

    if (!profile) return { error: 'Profile not found' }

    let customerId: string | undefined

    // For org profiles, use org's Stripe customer
    if (profile.organization_id) {
      const { data: org } = await supabase
        .from('organizations')
        .select('stripe_customer_id')
        .eq('id', profile.organization_id)
        .single()

      customerId = org?.stripe_customer_id || undefined

      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          metadata: { organization_id: profile.organization_id },
        })
        customerId = customer.id
        await supabase
          .from('organizations')
          .update({ stripe_customer_id: customerId })
          .eq('id', profile.organization_id)
      }
    } else {
      customerId = profile.stripe_customer_id || undefined
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          metadata: { supabase_user_id: user.id },
        })
        customerId = customer.id
        await supabase.from('profiles').update({ stripe_customer_id: customerId }).eq('id', user.id)
      }
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: process.env.STRIPE_PRO_PRICE_ID!, quantity: 1 }],
      success_url: `${BASE_URL}/dashboard/settings?upgraded=true`,
      cancel_url: `${BASE_URL}/dashboard/settings`,
      metadata: { supabase_user_id: user.id, profile_id: targetProfileId },
      subscription_data: {
        metadata: { supabase_user_id: user.id, profile_id: targetProfileId },
      },
    })

    return { url: session.url }
  })
```

Add an org billing overview function:

```typescript
export const getOrgBillingOverview = createServerFn({ method: 'GET' }).handler(async () => {
  const { supabase, user } = await withAuth()

  const { data: membership } = await supabase
    .from('organization_members')
    .select('organization_id, role')
    .eq('user_id', user.id)
    .in('role', ['owner', 'admin'])
    .single()

  if (!membership) return { error: 'Not authorized' }

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, display_name, slug, tier')
    .eq('organization_id', membership.organization_id)
    .order('display_name')

  const proCount = profiles?.filter((p: { tier: string }) => p.tier === 'pro').length || 0
  const freeCount = profiles?.filter((p: { tier: string }) => p.tier === 'free').length || 0

  return {
    profiles: profiles || [],
    proCount,
    freeCount,
    monthlyTotal: proCount * 9, // £9/month per pro profile
  }
})
```

**Step 2: Create billing overview page for agencies**

```tsx
// src/routes/_dashboard/dashboard.billing.tsx
// Agency billing overview page — shows per-artist billing breakdown
```

This page displays a table of all artist profiles with their tier, a total monthly cost, and buttons to upgrade/downgrade individual artists.

**Step 3: Commit**

```bash
git add src/server/billing.ts src/routes/_dashboard/dashboard.billing.tsx
git commit -m "feat: add per-artist billing with org-level Stripe customer"
```

---

## Task 14: Aggregated Analytics

**Files:**
- Create: `src/routes/_dashboard/dashboard.analytics-overview.tsx`

**Step 1: Add server function for aggregated analytics**

In `src/server/analytics.ts`, add:

```typescript
export const getAggregatedAnalytics = createServerFn({ method: 'POST' })
  .inputValidator((data: { days: number }) => data)
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

    const slugs = profiles.map((p: { slug: string }) => p.slug)

    // Query PostHog for all slugs
    // This would use PostHog's query API with a filter for slug IN [...]
    // Implementation similar to getAnalyticsSummary but across multiple slugs

    // Return per-artist breakdown + totals
    return {
      profiles: profiles.map((p: { slug: string; display_name: string }) => ({
        slug: p.slug,
        name: p.display_name,
        views: 0,     // Populated from PostHog query
        visitors: 0,  // Populated from PostHog query
      })),
      totalViews: 0,
      totalVisitors: 0,
    }
  })
```

**Step 2: Create overview page**

The aggregated analytics page shows combined metrics across all org artists, per-artist comparison bar chart, and top performing artists ranking.

**Step 3: Commit**

```bash
git add src/server/analytics.ts src/routes/_dashboard/dashboard.analytics-overview.tsx
git commit -m "feat: add aggregated analytics overview for agencies"
```

---

## Verification Checklist

- [ ] Organizations table created with RLS
- [ ] `can_access_profile()` replaces `is_profile_owner()` — existing individual accounts still work
- [ ] Organization can be created from onboarding page
- [ ] Team members can be invited via email
- [ ] Invite acceptance links user to organization
- [ ] Owner/admin can view all org profiles in roster
- [ ] Manager can only view assigned profiles
- [ ] Clicking "Edit" on a roster card opens dashboard with profile context
- [ ] All dashboard operations work with switched profile (via `?profile=uuid`)
- [ ] Team management page shows members with roles
- [ ] Members can be removed (except last owner)
- [ ] "Represented by [Agency]" badge shows on managed EPK pages
- [ ] Agency landing page at `/agency/slug` shows published artists grid
- [ ] Per-artist checkout creates subscriptions under org's Stripe customer
- [ ] Billing overview shows per-artist cost breakdown
- [ ] Aggregated analytics combines data across all org profiles
- [ ] Individual users (no org) are completely unaffected by all agency changes
