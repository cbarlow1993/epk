import { createServerFn } from '@tanstack/react-start'
import { getSupabaseServerClient } from '~/utils/supabase'
import { bookingContactUpdateSchema } from '~/schemas/booking-contact'

export const getBookingContact = createServerFn({ method: 'GET' }).handler(async () => {
  const supabase = getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('booking_contact').select('*').eq('profile_id', user.id).single()
  return data
})

export const updateBookingContact = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => bookingContactUpdateSchema.parse(data))
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }
    const { data: contact, error } = await supabase.from('booking_contact').update(data).eq('profile_id', user.id).select().single()
    if (error) return { error: error.message }
    return { contact }
  })
