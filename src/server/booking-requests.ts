import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { bookingRequestSubmitSchema, bookingRequestStatusSchema } from '~/schemas/booking-request'
import { getSupabaseServerClient } from '~/utils/supabase.server'
import { withAuth } from './utils'
import { sendBookingNotification, sendBookingConfirmation } from './email'

const submitBookingInput = z.object({
  slug: z.string().min(1).max(100),
  request: bookingRequestSubmitSchema,
})

// Public — accepts slug to find the profile
export const submitBookingRequestForSlug = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => submitBookingInput.parse(data))
  .handler(async ({ data: { slug, request } }) => {
    const supabase = getSupabaseServerClient()

    // Look up profile by slug
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, display_name')
      .eq('slug', slug)
      .eq('published', true)
      .single()

    if (!profile) return { error: 'Profile not found' }

    // Look up booking contact email for forwarding
    const { data: contact } = await supabase
      .from('booking_contact')
      .select('email')
      .eq('profile_id', profile.id)
      .single()

    const { honeypot, ...fields } = request

    // Insert booking request
    const { error } = await supabase
      .from('booking_requests')
      .insert({ profile_id: profile.id, ...fields })

    if (error) return { error: error.message }

    // Send email notifications (fire and forget — don't block response)
    const artistName = profile.display_name || 'Artist'
    if (contact?.email) {
      sendBookingNotification(contact.email, {
        name: fields.name,
        email: fields.email,
        eventName: fields.event_name,
        eventDate: fields.event_date,
        venueLocation: fields.venue_location,
        budgetRange: fields.budget_range,
        message: fields.message,
        artistName,
      }).catch(console.error)
    }
    sendBookingConfirmation(fields.email, artistName).catch(console.error)

    return { success: true }
  })

// Auth required — dashboard
export const getBookingRequests = createServerFn({ method: 'GET' }).handler(async () => {
  const { supabase, user } = await withAuth()
  const { data } = await supabase
    .from('booking_requests')
    .select('*')
    .eq('profile_id', user.id)
    .order('created_at', { ascending: false })
  return data || []
})

export const updateBookingRequestStatus = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => bookingRequestStatusSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabase, user } = await withAuth()
    const { error } = await supabase
      .from('booking_requests')
      .update({ status: data.status })
      .eq('id', data.id)
      .eq('profile_id', user.id)
    if (error) return { error: error.message }
    return { success: true }
  })
