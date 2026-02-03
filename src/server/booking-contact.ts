import { createServerFn } from '@tanstack/react-start'
import { bookingContactUpdateSchema } from '~/schemas/booking-contact'
import { withAuth, withAuthOrNull } from './utils'

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
