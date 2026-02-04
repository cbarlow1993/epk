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
