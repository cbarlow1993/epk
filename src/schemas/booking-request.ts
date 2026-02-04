import { z } from 'zod'

export const bookingRequestSubmitSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  email: z.string().email('Valid email required'),
  event_name: z.string().max(200).optional(),
  event_date: z.string().optional(),
  venue_location: z.string().max(200).optional(),
  budget_range: z.string().max(100).optional(),
  message: z.string().min(1, 'Message is required').max(2000, 'Max 2000 characters'),
  honeypot: z.string().max(0, 'Bot detected').optional(),
})

export const bookingRequestStatusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(['new', 'read', 'replied', 'archived']),
})

export type BookingRequestSubmit = z.infer<typeof bookingRequestSubmitSchema>
