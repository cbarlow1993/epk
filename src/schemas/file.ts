import { z } from 'zod'

export const fileUploadSchema = z.object({
  name: z.string().min(1).max(200),
  folder_id: z.string().uuid().nullable().optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
})

export const fileMoveSchema = z.object({
  id: z.string().uuid(),
  folder_id: z.string().uuid().nullable(),
})

export const fileTagsSchema = z.object({
  id: z.string().uuid(),
  tags: z.array(z.string().max(50)).max(20),
})
