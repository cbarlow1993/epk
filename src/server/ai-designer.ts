import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { aiDesignTokensSchema, aiChatMessageSchema } from '~/schemas/ai-design-tokens'
import { withAuth } from './utils'

const AI_MONTHLY_LIMIT = 200
const HISTORY_CAP = 20

// --- GET: Fetch profile + CMS content for AI designer ---

export const getAIDesignData = createServerFn({ method: 'GET' }).handler(async () => {
  let auth: Awaited<ReturnType<typeof withAuth>>
  try {
    auth = await withAuth()
  } catch {
    return null
  }
  const { supabase, user } = auth

  const [profileRes, mixesRes, eventsRes, photosRes, socialRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single(),
    supabase.from('mixes').select('*').eq('profile_id', user.id).order('sort_order'),
    supabase.from('events').select('*').eq('profile_id', user.id).order('sort_order'),
    supabase.from('photos').select('*').eq('profile_id', user.id).order('sort_order'),
    supabase.from('social_links').select('*').eq('profile_id', user.id).order('sort_order'),
  ])

  return {
    data: {
      profile: profileRes.data,
      mixes: mixesRes.data || [],
      events: eventsRes.data || [],
      photos: photosRes.data || [],
      socialLinks: socialRes.data || [],
    },
  }
})

// --- POST: Save design tokens + chat history ---

const saveTokensInput = z.object({
  tokens: aiDesignTokensSchema,
  chatHistory: z.array(aiChatMessageSchema),
})

export const saveAIDesignTokens = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => saveTokensInput.parse(data))
  .handler(async ({ data }) => {
    const { supabase, user } = await withAuth()

    // Fetch current history to push new entry
    const { data: profile } = await supabase
      .from('profiles')
      .select('ai_design_history')
      .eq('id', user.id)
      .single()

    const history = Array.isArray(profile?.ai_design_history) ? profile.ai_design_history : []
    // Push current tokens to history, cap at HISTORY_CAP
    const updatedHistory = [...history, data.tokens].slice(-HISTORY_CAP)

    const { error } = await supabase
      .from('profiles')
      .update({
        ai_design_tokens: data.tokens,
        ai_design_history: updatedHistory,
        ai_chat_history: data.chatHistory,
      })
      .eq('id', user.id)

    if (error) return { error: error.message }
    return { data: { saved: true } }
  })

// --- POST: Publish AI design (set renderer='ai') ---

export const publishAIDesign = createServerFn({ method: 'POST' }).handler(async () => {
  const { supabase, user } = await withAuth()

  const { error } = await supabase
    .from('profiles')
    .update({ renderer: 'ai' })
    .eq('id', user.id)

  if (error) return { error: error.message }
  return { data: { published: true } }
})

// --- POST: Unpublish AI design (set renderer='template') ---

export const unpublishAIDesign = createServerFn({ method: 'POST' }).handler(async () => {
  const { supabase, user } = await withAuth()

  const { error } = await supabase
    .from('profiles')
    .update({ renderer: 'template' })
    .eq('id', user.id)

  if (error) return { error: error.message }
  return { data: { unpublished: true } }
})

// --- GET: Check AI usage for current month ---

function getCurrentMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export const checkAIUsage = createServerFn({ method: 'GET' }).handler(async () => {
  let auth: Awaited<ReturnType<typeof withAuth>>
  try {
    auth = await withAuth()
  } catch {
    return null
  }
  const { supabase, user } = auth
  const month = getCurrentMonth()

  const { data: usage } = await supabase
    .from('ai_usage')
    .select('message_count')
    .eq('user_id', user.id)
    .eq('month', month)
    .maybeSingle()

  const used = usage?.message_count ?? 0
  return {
    data: {
      used,
      limit: AI_MONTHLY_LIMIT,
      remaining: Math.max(0, AI_MONTHLY_LIMIT - used),
    },
  }
})

// --- POST: Increment AI usage ---

export const incrementAIUsage = createServerFn({ method: 'POST' }).handler(async () => {
  const { supabase, user } = await withAuth()
  const month = getCurrentMonth()

  const { data: newCount, error } = await supabase.rpc('increment_ai_usage', {
    p_user_id: user.id,
    p_month: month,
    p_limit: AI_MONTHLY_LIMIT,
  })

  if (error) return { error: 'Monthly AI limit reached' }
  return { data: { used: newCount as number } }
})
