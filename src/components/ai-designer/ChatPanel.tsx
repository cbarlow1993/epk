import { useState, useRef, useEffect, useCallback } from 'react'
import { readUIMessageStream } from 'ai'
import type {
  AIDesignTokens,
  PartialAIDesignTokens,
  TokenLockState,
} from '~/schemas/ai-design-tokens'
import { mergeTokens, diffTokens } from '~/utils/ai-token-merge'
import { BTN_BASE, FORM_INPUT } from '~/components/forms/styles'

// --- Types ---

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  tokenChanges?: PartialAIDesignTokens
  diffSummary?: string[]
}

export interface ChatPanelProps {
  tokens: AIDesignTokens
  lockState: TokenLockState
  onTokensUpdate: (newTokens: AIDesignTokens, changes: PartialAIDesignTokens) => void
  onChatMessage?: (msg: { role: 'user' | 'assistant'; content: string; tokenChanges?: PartialAIDesignTokens }) => void
  profile: Record<string, unknown>
  usage: { used: number; limit: number }
}

// --- Quick Actions ---

const QUICK_ACTIONS = [
  { label: 'Randomize colors', message: 'Randomize the color palette while keeping the overall vibe' },
  { label: 'Try different layout', message: 'Try a different layout variant for each section' },
  { label: 'Make it darker', message: 'Make the overall design darker and moodier' },
  { label: 'Make it lighter', message: 'Make the overall design lighter and more airy' },
]

// --- Component ---

export function ChatPanel({
  tokens,
  lockState,
  onTokensUpdate,
  onChatMessage,
  profile,
  usage,
}: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingText, setStreamingText] = useState('')
  const [localUsage, setLocalUsage] = useState(usage.used)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const tokensRef = useRef(tokens)

  // Keep tokensRef current so streaming callback sees latest tokens
  useEffect(() => {
    tokensRef.current = tokens
  }, [tokens])

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingText])

  const limitReached = localUsage >= usage.limit

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isStreaming || limitReached) return

      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: text.trim(),
      }

      setMessages((prev) => [...prev, userMessage])
      onChatMessage?.({ role: 'user', content: text.trim() })
      setInput('')
      setIsStreaming(true)
      setStreamingText('')

      // Build conversation history for the API (exclude current message)
      const conversationHistory = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }))

      const controller = new AbortController()
      abortRef.current = controller

      try {
        const response = await fetch('/api/ai-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          signal: controller.signal,
          body: JSON.stringify({
            message: text.trim(),
            conversationHistory,
            currentTokens: tokensRef.current,
            lockedTokens: lockState,
            profile,
          }),
        })

        if (!response.ok) {
          const errorText = await response.text()
          throw new Error(errorText || `Request failed (${response.status})`)
        }

        if (!response.body) {
          throw new Error('No response body')
        }

        // Use the Vercel AI SDK readUIMessageStream to parse the SSE stream
        let fullText = ''
        let tokenChanges: PartialAIDesignTokens | undefined

        const stream = response.body as ReadableStream<Uint8Array>

        // readUIMessageStream expects a ReadableStream<UIMessageChunk>.
        // toUIMessageStreamResponse sends SSE-formatted JSON lines. We need to
        // parse the SSE envelope first into UIMessageChunk objects.
        const sseStream = parseSseToChunks(stream)

        for await (const uiMessage of readUIMessageStream({ stream: sseStream })) {
          // uiMessage is a UIMessage with parts array that grows as stream progresses
          fullText = ''
          for (const part of uiMessage.parts) {
            if (part.type === 'text') {
              fullText += part.text
            } else if ('toolCallId' in part) {
              // Tool call part — extract token changes from input when available.
              // In AI SDK v6 tool parts have states: input-streaming, input-available,
              // output-available, etc. We grab the input as soon as it's finalized.
              const toolPart = part as { state: string; input?: unknown }
              if (
                toolPart.state === 'input-available' ||
                toolPart.state === 'output-available'
              ) {
                tokenChanges = toolPart.input as PartialAIDesignTokens
              }
            }
          }
          setStreamingText(fullText)
        }

        // Compute diff summary if tokens changed
        let diffSummary: string[] | undefined
        if (tokenChanges) {
          const currentTokens = tokensRef.current
          const newTokens = mergeTokens(currentTokens, tokenChanges, lockState)
          const changes = diffTokens(currentTokens, newTokens)
          diffSummary = changes.map((c) => c.path)
          onTokensUpdate(newTokens, tokenChanges)
        }

        const assistantMessage: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: fullText,
          tokenChanges,
          diffSummary,
        }

        setMessages((prev) => [...prev, assistantMessage])
        onChatMessage?.({ role: 'assistant', content: fullText, tokenChanges })
        setLocalUsage((prev) => prev + 1)
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          // User cancelled, add partial message if any
          if (streamingText) {
            setMessages((prev) => [
              ...prev,
              {
                id: crypto.randomUUID(),
                role: 'assistant',
                content: streamingText + ' [cancelled]',
              },
            ])
          }
        } else {
          const errorMsg = err instanceof Error ? err.message : 'Unknown error'
          setMessages((prev) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              role: 'assistant',
              content: `Error: ${errorMsg}`,
            },
          ])
        }
      } finally {
        setIsStreaming(false)
        setStreamingText('')
        abortRef.current = null
      }
    },
    [isStreaming, limitReached, messages, lockState, profile, onTokensUpdate, onChatMessage, streamingText],
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    sendMessage(input)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  const handleStop = () => {
    abortRef.current?.abort()
  }

  return (
    <div className="flex h-full flex-col bg-surface border border-border">
      {/* Header with usage */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-text-primary">
          AI Chat
        </h3>
        <span
          className={`text-xs ${limitReached ? 'text-red-400' : 'text-text-secondary'}`}
        >
          {localUsage} / {usage.limit} messages
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {messages.length === 0 && !isStreaming && (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-text-secondary text-center">
              Ask the AI to refine your design.
              <br />
              Try the quick actions below to get started.
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        {/* Streaming indicator */}
        {isStreaming && (
          <div className="flex flex-col gap-1">
            <div className="max-w-[85%] rounded-lg bg-card px-4 py-3 text-sm text-text-primary">
              {streamingText || (
                <span className="inline-flex items-center gap-1 text-text-secondary">
                  <TypingDots />
                  Thinking...
                </span>
              )}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-2 border-t border-border px-4 py-2">
        {QUICK_ACTIONS.map((action) => (
          <button
            key={action.label}
            type="button"
            className={`${BTN_BASE} rounded-full border border-border bg-card px-3 py-1 text-xs text-text-secondary hover:bg-surface hover:text-text-primary disabled:opacity-40 disabled:cursor-not-allowed`}
            disabled={isStreaming || limitReached}
            onClick={() => sendMessage(action.message)}
          >
            {action.label}
          </button>
        ))}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="border-t border-border p-4">
        {limitReached && (
          <p className="mb-2 text-xs text-red-400">
            Monthly message limit reached. Upgrade for more.
          </p>
        )}
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={limitReached ? 'Limit reached' : 'Describe changes...'}
            disabled={limitReached}
            className={`${FORM_INPUT} flex-1 rounded-lg`}
          />
          {isStreaming ? (
            <button
              type="button"
              onClick={handleStop}
              className={`${BTN_BASE} rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30`}
            >
              Stop
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim() || limitReached}
              className={`${BTN_BASE} rounded-lg bg-accent text-white hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              Send
            </button>
          )}
        </div>
      </form>
    </div>
  )
}

// --- Sub-components ---

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
      <div
        className={`max-w-[85%] rounded-lg px-4 py-3 text-sm ${
          isUser
            ? 'bg-accent/20 text-text-primary'
            : 'bg-card text-text-primary'
        }`}
      >
        <p className="whitespace-pre-wrap">{message.content}</p>
      </div>

      {/* Token diff summary */}
      {message.diffSummary && message.diffSummary.length > 0 && (
        <div className="mt-1 max-w-[85%] rounded bg-accent/10 px-3 py-1.5 text-xs text-accent">
          Changed: {formatDiffPaths(message.diffSummary)}
        </div>
      )}
    </div>
  )
}

function TypingDots() {
  return (
    <span className="inline-flex gap-0.5">
      <span className="animate-bounce text-text-secondary" style={{ animationDelay: '0ms' }}>.</span>
      <span className="animate-bounce text-text-secondary" style={{ animationDelay: '150ms' }}>.</span>
      <span className="animate-bounce text-text-secondary" style={{ animationDelay: '300ms' }}>.</span>
    </span>
  )
}

// --- Helpers ---

/**
 * Collapse deep paths into their top-level group for readability.
 * e.g., ["colors.accent", "colors.primary", "sections.hero.variant"] => "colors (2), sections.hero.variant"
 */
function formatDiffPaths(paths: string[]): string {
  if (paths.length <= 3) return paths.join(', ')

  // Group by first two segments
  const groups = new Map<string, number>()
  for (const p of paths) {
    const segments = p.split('.')
    const key = segments.length > 2 ? segments.slice(0, 2).join('.') : segments[0]
    groups.set(key, (groups.get(key) ?? 0) + 1)
  }

  const parts: string[] = []
  for (const [key, count] of groups) {
    parts.push(count > 1 ? `${key} (${count})` : key)
  }
  return parts.join(', ')
}

/**
 * Parse an SSE byte stream into a ReadableStream of UIMessageChunk objects.
 * The Vercel AI SDK toUIMessageStreamResponse sends newline-delimited JSON over SSE.
 */
function parseSseToChunks(byteStream: ReadableStream<Uint8Array>): ReadableStream {
  const decoder = new TextDecoder()
  let buffer = ''

  return new ReadableStream({
    async start(controller) {
      const reader = byteStream.getReader()
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })

          // SSE format: lines starting with "data: " followed by JSON, separated by blank lines.
          // Process complete SSE events from buffer.
          const lines = buffer.split('\n')
          buffer = ''

          for (let i = 0; i < lines.length; i++) {
            const line = lines[i]

            // If this is the last line and doesn't end with newline, it's incomplete
            if (i === lines.length - 1 && !buffer) {
              buffer = line
              continue
            }

            if (line.startsWith('d:')) {
              // UI message stream format: "d:{json}"
              const jsonStr = line.slice(2)
              try {
                const chunk = JSON.parse(jsonStr)
                controller.enqueue(chunk)
              } catch {
                // Skip malformed JSON
              }
            } else if (line.startsWith('e:')) {
              // Error event
              const jsonStr = line.slice(2)
              try {
                const errorData = JSON.parse(jsonStr)
                controller.enqueue({ type: 'error', errorText: errorData.errorText ?? String(errorData) })
              } catch {
                // Skip
              }
            }
            // Ignore other SSE lines (comments, empty lines, etc.)
          }
        }
      } catch (err) {
        controller.error(err)
      } finally {
        controller.close()
      }
    },
  })
}
