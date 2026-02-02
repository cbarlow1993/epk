import { createServerFn } from '@tanstack/react-start'
import { getSupabaseServerClient } from '~/utils/supabase'
import { getRequest } from '@tanstack/react-start/server'

export const getCurrentUser = createServerFn({ method: 'GET' }).handler(async () => {
  const request = getRequest()
  const { supabase } = getSupabaseServerClient(request)
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return { user, profile }
})

export const loginWithEmail = createServerFn({ method: 'POST' })
  .inputValidator((data: { email: string; password: string }) => data)
  .handler(async ({ data }) => {
    const request = getRequest()
    const { supabase, headers } = getSupabaseServerClient(request)

    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    })

    if (error) {
      return { error: error.message, headers: Object.fromEntries(headers.entries()) }
    }

    return { user: authData.user, headers: Object.fromEntries(headers.entries()) }
  })

export const signupWithEmail = createServerFn({ method: 'POST' })
  .inputValidator((data: { email: string; password: string; displayName: string }) => data)
  .handler(async ({ data }) => {
    const request = getRequest()
    const { supabase, headers } = getSupabaseServerClient(request)

    const { data: authData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: { display_name: data.displayName },
      },
    })

    if (error) {
      return { error: error.message, headers: Object.fromEntries(headers.entries()) }
    }

    return { user: authData.user, headers: Object.fromEntries(headers.entries()) }
  })

export const logout = createServerFn({ method: 'POST' }).handler(async () => {
  const request = getRequest()
  const { supabase, headers } = getSupabaseServerClient(request)
  await supabase.auth.signOut()
  return { headers: Object.fromEntries(headers.entries()) }
})
