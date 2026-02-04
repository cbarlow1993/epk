import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { getTeamMembers, inviteTeamMember, removeMember } from '~/server/team'
import { getOrganization } from '~/server/organizations'
import { FORM_INPUT, BTN_PRIMARY, BTN_DELETE, CARD_SECTION } from '~/components/forms'
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
  artist: 'bg-green-500/10 text-green-600',
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
      setMembers((prev: typeof members) => prev.filter((m: { id: string }) => m.id !== memberId))
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-display font-extrabold tracking-tight uppercase mb-8">Team</h1>

      {/* Invite Form */}
      {isAdmin && (
        <form onSubmit={handleInvite} className={CARD_SECTION}>
          <h2 className="font-medium text-text-secondary mb-4">Invite Team Member</h2>
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
        {members.map((member: { id: string; role: string; user_id: string }) => (
          <div key={member.id} className="bg-white border border-border p-4 flex items-center gap-4">
            <div className="flex-1">
              <p className="font-bold text-sm">{member.user_id.slice(0, 8)}...</p>
            </div>
            <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded ${ROLE_COLORS[member.role] || 'bg-bg text-text-secondary'}`}>
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
