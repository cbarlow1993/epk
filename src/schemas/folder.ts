import { z } from 'zod'

export const folderCreateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  parent_id: z.string().uuid().nullable().optional(),
})

export const folderRenameSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
})
