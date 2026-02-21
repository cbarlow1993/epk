import { z } from 'zod'

export const DECK_MODELS = [
  'CDJ-3000X', 'CDJ-3000', 'CDJ-2000NXS2', 'SC6000', 'SC6000M',
  'XDJ-XZ', 'XDJ-1000MK2', 'Turntables', 'Other',
] as const

export const MIXER_MODELS = [
  'DJM-900NXS2', 'DJM-A9', 'DJM-V10',
  'Xone:96', 'Model 1', 'MP2015', 'Other',
] as const

export const MONITOR_TYPES = [
  'Booth Monitors', 'In-Ear Monitors', 'Both', 'No Preference',
] as const

export const technicalRiderUpdateSchema = z.object({
  deck_model: z.enum(DECK_MODELS).nullable().optional(),
  deck_model_other: z.string().max(100).nullable().optional(),
  deck_quantity: z.coerce.number().int().min(1).max(8).nullable().optional(),
  mixer_model: z.enum(MIXER_MODELS).nullable().optional(),
  mixer_model_other: z.string().max(100).nullable().optional(),
  monitor_type: z.enum(MONITOR_TYPES).nullable().optional(),
  monitor_quantity: z.coerce.number().int().min(1).max(10).nullable().optional(),
  monitor_notes: z.string().max(500).nullable().optional(),
  additional_notes: z.string().max(5000).nullable().optional(),
})

export type TechnicalRiderUpdate = z.infer<typeof technicalRiderUpdateSchema>
