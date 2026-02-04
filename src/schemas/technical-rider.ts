import { z } from 'zod'
import { editorDataSchema } from './editorData'

export const technicalRiderUpdateSchema = z.object({
  preferred_setup: editorDataSchema.optional(),
  alternative_setup: editorDataSchema.optional(),
})

export type TechnicalRiderUpdate = z.infer<typeof technicalRiderUpdateSchema>
