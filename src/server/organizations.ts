import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
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
    .select('id, display_name, slug, profile_image_url, tier, published')
    .eq('organization_id', membership.organization_id)

  // Managers only see assigned profiles
  if (membership.role === 'manager') {
    query = query.in('id', membership.assigned_profiles || [])
  }

  const { data } = await query.order('display_name')
  return data || []
})

export const createOrgProfile = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => z.object({
    display_name: z.string().min(1).max(100),
    slug: z.string().min(2).max(50).regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/),
  }).parse(data))
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
