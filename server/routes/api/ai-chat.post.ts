// server/routes/api/ai-chat.post.ts
//
// Nitro API route for AI design chat streaming.
// Uses a Nitro route instead of createServerFn because TanStack Start server
// functions cannot return streaming Response objects. Nitro/h3 v2 handlers
// can return a standard web Response directly, which lets us stream the
// Vercel AI SDK output to the client.

import { createServerClient } from '@supabase/ssr'
import { defineHandler, readBody, createError, parseCookies, setCookie } from 'h3'
import { anthropic } from '@ai-sdk/anthropic'
import { streamText, tool } from 'ai'
import { z } from 'zod'
import { buildSystemPrompt, summarizeCMSContent } from '~/utils/ai-prompts'
import type { AIDesignTokens, TokenLockState } from '~/schemas/ai-design-tokens'
import { partialAIDesignTokensSchema } from '~/schemas/ai-design-tokens'

const inputSchema = z.object({
  message: z.string().min(1),
  conversationHistory: z.array(
    z.object({
      role: z.enum(['user', 'assistant']),
      content: z.string(),
    }),
  ).default([]),
  currentTokens: z.record(z.string(), z.unknown()),
  lockedTokens: z.record(z.string(), z.enum(['locked', 'generated', 'default'])).default({}),
  profile: z.record(z.string(), z.unknown()),
})

export default defineHandler(async (event) => {
  // --- Auth: create Supabase client from request cookies ---
  const cookies = parseCookies(event)
  const supabase = createServerClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return Object.entries(cookies).map(([name, value]) => ({
            name,
            value: decodeURIComponent(value),
          }))
        },
        setAll(cookiesToSet) {
          for (const cookie of cookiesToSet) {
            setCookie(event, cookie.name, cookie.value, cookie.options)
          }
        },
      },
    },
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw createError({ statusCode: 401, message: 'Not authenticated' })
  }

  // --- Rate limit: check monthly AI usage before calling Claude ---
  const AI_MONTHLY_LIMIT = 200
  const now = new Date()
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const { data: usageRow } = await supabase
    .from('ai_usage')
    .select('message_count')
    .eq('user_id', user.id)
    .eq('month', month)
    .maybeSingle()

  const currentCount = usageRow?.message_count ?? 0
  if (currentCount >= AI_MONTHLY_LIMIT) {
    throw createError({ statusCode: 429, message: 'Monthly AI message limit reached' })
  }

  // Increment usage atomically via RPC (created in migration)
  const { error: usageError } = await supabase.rpc('increment_ai_usage', {
    p_user_id: user.id,
    p_month: month,
    p_limit: AI_MONTHLY_LIMIT,
  })
  if (usageError) {
    // If the RPC returns an error (limit exceeded race condition), reject
    throw createError({ statusCode: 429, message: 'Monthly AI message limit reached' })
  }

  // --- Parse & validate request body ---
  const rawBody = await readBody(event)
  const parseResult = inputSchema.safeParse(rawBody)
  if (!parseResult.success) {
    throw createError({
      statusCode: 400,
      message: `Invalid input: ${parseResult.error.issues.map((i) => i.message).join(', ')}`,
    })
  }
  const data = parseResult.data

  // --- Build system prompt from current tokens + CMS content ---
  const systemPrompt = buildSystemPrompt(
    data.currentTokens as AIDesignTokens,
    data.lockedTokens as TokenLockState,
    summarizeCMSContent(data.profile),
  )

  // --- Build message list: previous conversation + new user message ---
  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [
    ...data.conversationHistory,
    { role: 'user' as const, content: data.message },
  ]

  // --- Stream response from Claude via Vercel AI SDK ---
  const result = streamText({
    model: anthropic('claude-sonnet-4-20250514'),
    system: systemPrompt,
    messages,
    tools: {
      updateDesignTokens: tool({
        description:
          'Update the design tokens for the EPK page. Only include tokens that changed.',
        parameters: partialAIDesignTokensSchema,
      }),
    },
    maxSteps: 2,
  })

  // h3 v2 supports returning a standard web Response directly.
  // toUIMessageStreamResponse() returns a Response with SSE streaming body
  // that the Vercel AI SDK useChat hook can consume on the client.
  return result.toUIMessageStreamResponse()
})
