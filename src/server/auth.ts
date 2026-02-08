import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { getSupabaseServerClient } from '~/utils/supabase.server'

export const getCurrentUser = createServerFn({ method: 'GET' }).handler(async () => {
  const supabase = getSupabaseServerClient()
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
  .inputValidator((data: unknown) => z.object({ email: z.string().email(), password: z.string().min(1) }).parse(data))
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()

    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    })

    if (error) {
      return { error: error.message }
    }

    return { user: authData.user }
  })

export const signupWithEmail = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => z.object({ email: z.string().email(), password: z.string().min(6), displayName: z.string().min(1).max(100) }).parse(data))
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()

    const { data: authData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: { display_name: data.displayName },
        emailRedirectTo: `${import.meta.env.VITE_SITE_URL || 'http://localhost:3000'}/auth/callback?next=/dashboard`,
      },
    })

    if (error) {
      return { error: error.message }
    }

    // If identities array is empty, email is already taken (Supabase returns fake success)
    if (authData.user && authData.user.identities?.length === 0) {
      return { error: 'An account with this email already exists' }
    }

    // If email_confirmed_at is null, user needs to confirm email
    const needsConfirmation = !authData.user?.email_confirmed_at

    return { user: authData.user, needsConfirmation }
  })

export const exchangeAuthCode = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => z.object({ code: z.string() }).parse(data))
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const { error } = await supabase.auth.exchangeCodeForSession(data.code)
    if (error) return { error: error.message }
    return { success: true }
  })

export const logout = createServerFn({ method: 'POST' }).handler(async () => {
  const supabase = getSupabaseServerClient()
  await supabase.auth.signOut()
  return { success: true }
})
