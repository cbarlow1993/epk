import { createServerFn } from '@tanstack/react-start'
import { bookingContactUpdateSchema, contactFormSubmissionSchema } from '~/schemas/booking-contact'
import { withAuth, withAuthOrNull } from './utils'
import { getSupabaseAdmin } from '~/utils/supabase.server'
import { sendContactEmail } from '~/utils/ses'
import { createHash } from 'crypto'

export const getBookingContact = createServerFn({ method: 'GET' }).handler(async () => {
  const { supabase, user } = await withAuthOrNull()
  if (!user) return null
  const { data } = await supabase.from('booking_contact').select('*').eq('profile_id', user.id).single()
  return data
})

export const updateBookingContact = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => bookingContactUpdateSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabase, user } = await withAuth()
    const { data: contact, error } = await supabase.from('booking_contact').update(data).eq('profile_id', user.id).select().single()
    if (error) return { error: error.message }
    return { contact }
  })

export const submitContactForm = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => contactFormSubmissionSchema.parse(data))
  .handler(async ({ data }) => {
    // Honeypot check — silently reject
    if (data._honey) return { success: true }

    const admin = getSupabaseAdmin()

    // Rate limit: hash the request IP
    const { getRequestIP } = await import('@tanstack/react-start/server')
    const ip = getRequestIP({ xForwardedFor: true }) || 'unknown'
    const ipHash = createHash('sha256').update(ip).digest('hex')

    // Check rate limit: max 5 per IP per hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const { count } = await admin
      .from('contact_submissions')
      .select('*', { count: 'exact', head: true })
      .eq('ip_hash', ipHash)
      .gte('created_at', oneHourAgo)

    if ((count ?? 0) >= 5) {
      return { error: 'Too many submissions. Please try again later.' }
    }

    // Log the submission for rate limiting
    await admin.from('contact_submissions').insert({ ip_hash: ipHash, profile_id: data.profile_id })

    // Look up the DJ's booking email
    const { data: contact } = await admin
      .from('booking_contact')
      .select('booking_email')
      .eq('profile_id', data.profile_id)
      .single()

    // Fall back to auth email if booking_email is empty
    let toEmail = contact?.booking_email
    if (!toEmail) {
      const { data: authUser } = await admin.auth.admin.getUserById(data.profile_id)
      toEmail = authUser?.user?.email
    }

    if (!toEmail) return { error: 'Unable to deliver message. Please try again later.' }

    // Look up DJ name for the email subject
    const { data: profile } = await admin
      .from('profiles')
      .select('artist_name')
      .eq('id', data.profile_id)
      .single()

    const djName = profile?.artist_name || 'DJ'

    try {
      await sendContactEmail({
        toEmail,
        djName,
        senderName: data.name,
        senderEmail: data.email,
        senderPhone: data.phone || '',
        message: data.message,
      })
      return { success: true }
    } catch (err) {
      console.error('SES send error:', err)
      return { error: 'Failed to send message. Please try again later.' }
    }
  })
