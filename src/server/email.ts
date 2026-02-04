// src/server/email.ts
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY!)
const FROM_EMAIL = process.env.EMAIL_FROM || 'DJ EPK <noreply@yourdomain.com>'

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

interface BookingInquiry {
  name: string
  email: string
  eventName?: string
  eventDate?: string
  venueLocation?: string
  budgetRange?: string
  message: string
  artistName: string
}

export async function sendBookingNotification(to: string, inquiry: BookingInquiry) {
  try {
    const name = escapeHtml(inquiry.name)
    const email = escapeHtml(inquiry.email)
    const artistName = escapeHtml(inquiry.artistName)
    const eventName = inquiry.eventName ? escapeHtml(inquiry.eventName) : ''
    const eventDate = inquiry.eventDate ? escapeHtml(inquiry.eventDate) : ''
    const venueLocation = inquiry.venueLocation ? escapeHtml(inquiry.venueLocation) : ''
    const budgetRange = inquiry.budgetRange ? escapeHtml(inquiry.budgetRange) : ''
    const message = escapeHtml(inquiry.message).replace(/\n/g, '<br>')

    await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: `New Booking Inquiry from ${name}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>New Booking Inquiry</h2>
          <p>You've received a new booking request for <strong>${artistName}</strong>.</p>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; color: #666;">Name</td><td style="padding: 8px 0;">${name}</td></tr>
            <tr><td style="padding: 8px 0; color: #666;">Email</td><td style="padding: 8px 0;"><a href="mailto:${inquiry.email}">${email}</a></td></tr>
            ${inquiry.eventName ? `<tr><td style="padding: 8px 0; color: #666;">Event</td><td style="padding: 8px 0;">${eventName}</td></tr>` : ''}
            ${inquiry.eventDate ? `<tr><td style="padding: 8px 0; color: #666;">Date</td><td style="padding: 8px 0;">${eventDate}</td></tr>` : ''}
            ${inquiry.venueLocation ? `<tr><td style="padding: 8px 0; color: #666;">Venue/Location</td><td style="padding: 8px 0;">${venueLocation}</td></tr>` : ''}
            ${inquiry.budgetRange ? `<tr><td style="padding: 8px 0; color: #666;">Budget</td><td style="padding: 8px 0;">${budgetRange}</td></tr>` : ''}
          </table>
          <div style="margin-top: 16px; padding: 16px; background: #f5f5f5; border-radius: 8px;">
            <p style="margin: 0; color: #666; font-size: 14px;">Message:</p>
            <p style="margin: 8px 0 0;">${message}</p>
          </div>
          <p style="margin-top: 24px; font-size: 12px; color: #999;">
            Reply directly to this email or contact ${email}
          </p>
        </div>
      `,
      replyTo: inquiry.email,
    })
  } catch (err) {
    console.error('[email] Failed to send booking notification:', err)
  }
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

export async function sendBookingConfirmation(to: string, artistName: string) {
  try {
    const escapedArtistName = escapeHtml(artistName)

    await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: `Booking inquiry received - ${escapedArtistName}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Thanks for your inquiry!</h2>
          <p>Your booking request for <strong>${escapedArtistName}</strong> has been received. The artist's management team will review your inquiry and get back to you.</p>
          <p style="margin-top: 24px; font-size: 12px; color: #999;">
            This is an automated message. Please do not reply to this email.
          </p>
        </div>
      `,
    })
  } catch (err) {
    console.error('[email] Failed to send booking confirmation:', err)
  }
}
