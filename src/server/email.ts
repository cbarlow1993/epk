// src/server/email.ts
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY!)
const FROM_EMAIL = process.env.EMAIL_FROM || 'myEPK <noreply@myepk.bio>'

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export async function sendTeamInviteEmail(to: string, orgName: string, token: string, role: string) {
  try {
    const escapedOrgName = escapeHtml(orgName)
    const escapedRole = escapeHtml(role)
    const inviteUrl = `${process.env.APP_BASE_URL || 'http://localhost:3000'}/invite/${token}`

    await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: `You've been invited to join ${escapedOrgName}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Team Invite</h2>
          <p>You've been invited to join <strong>${escapedOrgName}</strong> as a <strong>${escapedRole}</strong>.</p>
          <a href="${inviteUrl}" style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 16px;">Accept Invite</a>
          <p style="margin-top: 24px; font-size: 12px; color: #999;">This invite expires in 7 days.</p>
        </div>
      `,
    })
  } catch (err) {
    console.error('[email] Failed to send team invite:', err)
  }
}

