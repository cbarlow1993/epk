import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses'

const ses = new SESClient({
  region: process.env.AWS_REGION || 'eu-west-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

interface SendContactEmailParams {
  toEmail: string
  djName: string
  senderName: string
  senderEmail: string
  senderPhone: string
  message: string
}

export async function sendContactEmail({ toEmail, djName, senderName, senderEmail, senderPhone, message }: SendContactEmailParams) {
  const fromEmail = process.env.SES_FROM_EMAIL
  if (!fromEmail) throw new Error('SES_FROM_EMAIL not configured')

  const htmlBody = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="margin-bottom: 24px;">New Booking Inquiry</h2>
      <table style="width: 100%; border-collapse: collapse;">
        <tr><td style="padding: 8px 0; font-weight: bold; width: 100px;">Name:</td><td style="padding: 8px 0;">${escapeHtml(senderName)}</td></tr>
        <tr><td style="padding: 8px 0; font-weight: bold;">Email:</td><td style="padding: 8px 0;"><a href="mailto:${escapeHtml(senderEmail)}">${escapeHtml(senderEmail)}</a></td></tr>
        ${senderPhone ? `<tr><td style="padding: 8px 0; font-weight: bold;">Phone:</td><td style="padding: 8px 0;">${escapeHtml(senderPhone)}</td></tr>` : ''}
      </table>
      <div style="margin-top: 24px; padding: 16px; background: #f5f5f5; white-space: pre-wrap;">${escapeHtml(message)}</div>
      <p style="margin-top: 24px; color: #666; font-size: 12px;">Sent via ${escapeHtml(djName)} EPK contact form</p>
    </div>
  `

  const textBody = `New Booking Inquiry\n\nName: ${senderName}\nEmail: ${senderEmail}${senderPhone ? `\nPhone: ${senderPhone}` : ''}\n\nMessage:\n${message}\n\n---\nSent via ${djName} EPK contact form`

  await ses.send(new SendEmailCommand({
    Source: `"${djName} EPK" <${fromEmail}>`,
    Destination: { ToAddresses: [toEmail] },
    ReplyToAddresses: [senderEmail],
    Message: {
      Subject: { Data: `New Booking Inquiry via ${djName} EPK` },
      Body: {
        Html: { Data: htmlBody },
        Text: { Data: textBody },
      },
    },
  }))
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
