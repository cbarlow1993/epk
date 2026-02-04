// src/server/email.ts
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY!)
const FROM_EMAIL = process.env.EMAIL_FROM || 'DJ EPK <noreply@yourdomain.com>'

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
  await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `New Booking Inquiry from ${inquiry.name}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>New Booking Inquiry</h2>
        <p>You've received a new booking request for <strong>${inquiry.artistName}</strong>.</p>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 8px 0; color: #666;">Name</td><td style="padding: 8px 0;">${inquiry.name}</td></tr>
          <tr><td style="padding: 8px 0; color: #666;">Email</td><td style="padding: 8px 0;"><a href="mailto:${inquiry.email}">${inquiry.email}</a></td></tr>
          ${inquiry.eventName ? `<tr><td style="padding: 8px 0; color: #666;">Event</td><td style="padding: 8px 0;">${inquiry.eventName}</td></tr>` : ''}
          ${inquiry.eventDate ? `<tr><td style="padding: 8px 0; color: #666;">Date</td><td style="padding: 8px 0;">${inquiry.eventDate}</td></tr>` : ''}
          ${inquiry.venueLocation ? `<tr><td style="padding: 8px 0; color: #666;">Venue/Location</td><td style="padding: 8px 0;">${inquiry.venueLocation}</td></tr>` : ''}
          ${inquiry.budgetRange ? `<tr><td style="padding: 8px 0; color: #666;">Budget</td><td style="padding: 8px 0;">${inquiry.budgetRange}</td></tr>` : ''}
        </table>
        <div style="margin-top: 16px; padding: 16px; background: #f5f5f5; border-radius: 8px;">
          <p style="margin: 0; color: #666; font-size: 14px;">Message:</p>
          <p style="margin: 8px 0 0;">${inquiry.message.replace(/\n/g, '<br>')}</p>
        </div>
        <p style="margin-top: 24px; font-size: 12px; color: #999;">
          Reply directly to this email or contact ${inquiry.email}
        </p>
      </div>
    `,
    replyTo: inquiry.email,
  })
}

export async function sendBookingConfirmation(to: string, artistName: string) {
  await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `Booking inquiry received - ${artistName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Thanks for your inquiry!</h2>
        <p>Your booking request for <strong>${artistName}</strong> has been received. The artist's management team will review your inquiry and get back to you.</p>
        <p style="margin-top: 24px; font-size: 12px; color: #999;">
          This is an automated message. Please do not reply to this email.
        </p>
      </div>
    `,
  })
}
