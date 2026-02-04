import { z } from 'zod'

const editorBlock = z.object({
  id: z.string().optional(),
  type: z.string(),
  data: z.record(z.string(), z.unknown()),
})

export const editorDataSchema = z.object({
  time: z.number().optional(),
  blocks: z.array(editorBlock),
  version: z.string().optional(),
}).nullable()

export type EditorData = z.infer<typeof editorDataSchema>
