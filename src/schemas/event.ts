import { z } from 'zod'

export const eventUpsertSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, 'Name is required').max(200, 'Max 200 characters'),
  category: z.string().min(1, 'Category is required').max(50, 'Max 50 characters'),
  image_url: z.string().url().optional(),
  link_url: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  sort_order: z.number().int().min(0).optional(),
  description: z.string().max(1000).optional().or(z.literal('')),
})

export type EventUpsert = z.infer<typeof eventUpsertSchema>
