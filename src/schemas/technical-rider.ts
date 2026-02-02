import { z } from 'zod'

export const technicalRiderUpdateSchema = z.object({
  preferred_setup: z.string().max(2000, 'Max 2000 characters').optional(),
  alternative_setup: z.string().max(2000, 'Max 2000 characters').optional(),
})

export type TechnicalRiderUpdate = z.infer<typeof technicalRiderUpdateSchema>
