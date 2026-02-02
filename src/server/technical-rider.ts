import { createServerFn } from '@tanstack/react-start'
import { getSupabaseServerClient } from '~/utils/supabase'
import { technicalRiderUpdateSchema } from '~/schemas/technical-rider'

export const getTechnicalRider = createServerFn({ method: 'GET' }).handler(async () => {
  const supabase = getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('technical_rider').select('*').eq('profile_id', user.id).single()
  return data
})

export const updateTechnicalRider = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => technicalRiderUpdateSchema.parse(data))
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }
    const { data: rider, error } = await supabase.from('technical_rider').update(data).eq('profile_id', user.id).select().single()
    if (error) return { error: error.message }
    return { rider }
  })
