import { z } from 'zod'

export const bookingContactUpdateSchema = z.object({
  manager_name: z.string().max(200, 'Max 200 characters').optional(),
  email: z.string().email('Invalid email address').max(320).optional().or(z.literal('')),
  phone: z.string().max(50, 'Max 50 characters').optional(),
  address: z.string().max(500, 'Max 500 characters').optional(),
})

export type BookingContactUpdate = z.infer<typeof bookingContactUpdateSchema>
