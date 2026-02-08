import { z } from 'zod'

// Full domain format: requires at least one dot. e.g. "my-site.com"
export const domainRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/

// Search allows bare names (no dot) — the server function generates TLD candidates
const domainSearchRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/

export const domainSearchSchema = z.object({
  domain: z.string().min(1).max(253).regex(domainSearchRegex, 'Invalid domain format'),
})

export const contactInfoSchema = z.object({
  firstName: z.string().min(1, 'Required'),
  lastName: z.string().min(1, 'Required'),
  email: z.string().email(),
  phone: z.string().min(1, 'Required'),
  address1: z.string().min(1, 'Required'),
  address2: z.string().optional(),
  city: z.string().min(1, 'Required'),
  state: z.string().min(1, 'Required'),
  zip: z.string().min(1, 'Required'),
  country: z.string().length(2, 'Use 2-letter country code'),
})

export const domainPurchaseSchema = z.object({
  domain: z.string().min(1).max(253).regex(domainRegex, 'Invalid domain format'),
  contactInfo: contactInfoSchema,
})

export type DomainSearch = z.infer<typeof domainSearchSchema>
export type ContactInfo = z.infer<typeof contactInfoSchema>
export type DomainPurchase = z.infer<typeof domainPurchaseSchema>
