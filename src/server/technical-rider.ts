import { createServerFn } from '@tanstack/react-start'
import { technicalRiderUpdateSchema } from '~/schemas/technical-rider'
import { withAuth, withAuthOrNull } from './utils'

export const getTechnicalRider = createServerFn({ method: 'GET' }).handler(async () => {
  const { supabase, user } = await withAuthOrNull()
  if (!user) return null
  const { data } = await supabase.from('technical_rider').select('*').eq('profile_id', user.id).single()
  return data
})

export const updateTechnicalRider = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => technicalRiderUpdateSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabase, user } = await withAuth()
    const { data: rider, error } = await supabase.from('technical_rider').update(data).eq('profile_id', user.id).select().single()
    if (error) return { error: error.message }
    return { rider }
  })
