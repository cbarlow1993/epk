import { z } from 'zod'

export const technicalRiderUpdateSchema = z.object({
  preferred_setup: z.string().max(5000, 'Max 5000 characters').optional(),
  alternative_setup: z.string().max(5000, 'Max 5000 characters').optional(),
})

export type TechnicalRiderUpdate = z.infer<typeof technicalRiderUpdateSchema>
