import { z } from 'zod'

export const CONTACT_MODES = ['details', 'form'] as const

export const bookingContactUpdateSchema = z.object({
  contact_mode: z.enum(CONTACT_MODES).optional(),
  manager_name: z.string().max(200, 'Max 200 characters').optional(),
  email: z.string().email('Invalid email address').max(320).optional().or(z.literal('')),
  phone: z.string().max(50, 'Max 50 characters').optional(),
  address: z.string().max(500, 'Max 500 characters').optional(),
  booking_email: z.string().email('Invalid email address').max(320).optional().or(z.literal('')),
})

export type BookingContactUpdate = z.infer<typeof bookingContactUpdateSchema>

export const contactFormSubmissionSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200, 'Max 200 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().max(50, 'Max 50 characters').optional().or(z.literal('')),
  message: z.string().min(1, 'Message is required').max(2000, 'Max 2000 characters'),
  profile_id: z.string().uuid(),
  _honey: z.string().optional(),
})

export type ContactFormSubmission = z.infer<typeof contactFormSubmissionSchema>
