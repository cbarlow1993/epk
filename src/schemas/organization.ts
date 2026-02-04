import { z } from 'zod'

export const organizationCreateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  slug: z.string()
    .min(2, 'Slug must be at least 2 characters')
    .max(50)
    .regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/, 'Lowercase alphanumeric and hyphens'),
  logo_url: z.string().url().optional().or(z.literal('')),
  website_url: z.string().url().optional().or(z.literal('')),
})

export const organizationUpdateSchema = organizationCreateSchema.partial()

export const inviteMemberSchema = z.object({
  email: z.string().email('Valid email required'),
  role: z.enum(['admin', 'manager', 'artist']),
})

export const updateMemberRoleSchema = z.object({
  member_id: z.string().uuid(),
  role: z.enum(['owner', 'admin', 'manager', 'artist']),
})

export const assignProfilesSchema = z.object({
  member_id: z.string().uuid(),
  profile_ids: z.array(z.string().uuid()),
})

export type OrganizationCreate = z.infer<typeof organizationCreateSchema>
export type InviteMember = z.infer<typeof inviteMemberSchema>
