import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
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
    .select('*')
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
  .inputValidator((data: unknown) => z.object({ token: z.string().min(1) }).parse(data))
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

    // Verify the invite was sent to this user's email
    if (invite.email !== user.email) {
      return { error: 'This invite was sent to a different email address' }
    }

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
  .inputValidator((data: unknown) => z.object({ member_id: z.string().uuid() }).parse(data))
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
