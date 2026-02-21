import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect, useRef, useCallback } from 'react'
import {
  getAIDesignData,
  checkAIUsage,
  saveAIDesignTokens,
  publishAIDesign,
  unpublishAIDesign,
} from '~/server/ai-designer'
import { useTokenHistory } from '~/hooks/useTokenHistory'
import { Wizard } from '~/components/ai-designer/Wizard'
import { ChatPanel } from '~/components/ai-designer/ChatPanel'
import { TokenInspector } from '~/components/ai-designer/TokenInspector'
import { ProGate } from '~/components/ProGate'
import { BTN_BASE, BTN_PRIMARY, FORM_LABEL } from '~/components/forms/styles'
import type {
  AIDesignTokens,
  PartialAIDesignTokens,
  TokenLockState,
  AIChatMessage,
} from '~/schemas/ai-design-tokens'

// ---------------------------------------------------------------------------
// Route
// ---------------------------------------------------------------------------

export const Route = createFileRoute('/_dashboard/dashboard/ai-designer')({
  loader: async () => {
    const [designData, usage] = await Promise.all([
      getAIDesignData(),
      checkAIUsage(),
    ])
    return { designData, usage }
  },
  component: AIDesignerPage,
})

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function AIDesignerPage() {
  const { designData, usage } = Route.useLoaderData()

  const profile = designData?.data?.profile
  const isPro = profile?.tier === 'pro'

  // Initial tokens from saved profile (if any)
  const savedTokens = profile?.ai_design_tokens as AIDesignTokens | null

  // Token history (undo/redo)
  const {
    tokens,
    setTokens,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useTokenHistory(savedTokens as AIDesignTokens)

  // Lock state
  const [lockState, setLockState] = useState<TokenLockState>({})

  // Chat history
  const [chatHistory, setChatHistory] = useState<AIChatMessage[]>(
    () => (profile?.ai_chat_history as AIChatMessage[]) || [],
  )

  // Wizard visibility — show wizard if no tokens exist yet
  const [showWizard, setShowWizard] = useState(!savedTokens)

  // Save state
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState('')

  // Publish state
  const [rendererMode, setRendererMode] = useState<'template' | 'ai'>(
    (profile?.renderer as 'template' | 'ai') || 'template',
  )
  const isPublished = rendererMode === 'ai'

  // Preview iframe ref
  const iframeRef = useRef<HTMLIFrameElement>(null)

  // ---------------------------------------------------------------------------
  // Send tokens to preview iframe via PostMessage
  // ---------------------------------------------------------------------------
  const sendTokensToPreview = useCallback((t: AIDesignTokens) => {
    iframeRef.current?.contentWindow?.postMessage(
      { type: 'ai-tokens-update', tokens: t },
      '*',
    )
  }, [])

  useEffect(() => {
    if (tokens) {
      sendTokensToPreview(tokens)
    }
  }, [tokens, sendTokensToPreview])

  // ---------------------------------------------------------------------------
  // Wizard complete handler
  // ---------------------------------------------------------------------------
  const handleWizardComplete = useCallback(
    (newTokens: AIDesignTokens, newLockState: TokenLockState) => {
      setTokens(newTokens)
      setLockState(newLockState)
      setShowWizard(false)
    },
    [setTokens],
  )

  // ---------------------------------------------------------------------------
  // Chat token update handler
  // ---------------------------------------------------------------------------
  const handleTokensUpdate = useCallback(
    (newTokens: AIDesignTokens, _changes: PartialAIDesignTokens) => {
      setTokens(newTokens)
    },
    [setTokens],
  )

  // ---------------------------------------------------------------------------
  // Lock toggle
  // ---------------------------------------------------------------------------
  const handleToggleLock = useCallback((path: string) => {
    setLockState((prev) => {
      const current = prev[path] || 'default'
      if (current === 'locked') {
        const next = { ...prev }
        delete next[path]
        return next
      }
      return { ...prev, [path]: 'locked' }
    })
  }, [])

  // ---------------------------------------------------------------------------
  // Save handler
  // ---------------------------------------------------------------------------
  const handleSave = useCallback(async () => {
    if (!tokens) return
    setSaving(true)
    setSaved(false)
    setSaveError('')
    try {
      const result = await saveAIDesignTokens({
        data: { tokens, chatHistory },
      })
      if (result && 'error' in result && typeof result.error === 'string') {
        setSaveError(result.error)
      } else {
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      }
    } catch {
      setSaveError('Failed to save. Please try again.')
    }
    setSaving(false)
  }, [tokens, chatHistory])

  // ---------------------------------------------------------------------------
  // Publish / Unpublish handlers
  // ---------------------------------------------------------------------------
  const handlePublish = useCallback(async () => {
    const result = await publishAIDesign()
    if (result && !('error' in result)) {
      setRendererMode('ai')
    }
  }, [])

  const handleUnpublish = useCallback(async () => {
    const result = await unpublishAIDesign()
    if (result && !('error' in result)) {
      setRendererMode('template')
    }
  }, [])

  // ---------------------------------------------------------------------------
  // Pro gate
  // ---------------------------------------------------------------------------
  if (!isPro) {
    return (
      <div>
        <div className="flex items-center justify-between mb-8 pb-6 border-b border-border">
          <h1 className="font-display font-extrabold text-2xl tracking-tight uppercase">
            AI Designer
          </h1>
        </div>
        <ProGate isPro={false} feature="AI Designer">
          <div className="h-96" />
        </ProGate>
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // Wizard mode
  // ---------------------------------------------------------------------------
  if (showWizard) {
    return (
      <div className="h-[calc(100vh-8rem)]">
        <Wizard
          onComplete={handleWizardComplete}
          onCancel={savedTokens ? () => setShowWizard(false) : undefined}
          profile={profile as Record<string, unknown>}
        />
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // Editor mode — requires tokens
  // ---------------------------------------------------------------------------
  if (!tokens) {
    return (
      <div className="text-center py-16">
        <p className="text-text-secondary mb-4">No design tokens found.</p>
        <button
          type="button"
          onClick={() => setShowWizard(true)}
          className={BTN_PRIMARY}
        >
          Start Wizard
        </button>
      </div>
    )
  }

  const usageData = usage?.data || { used: 0, limit: 200, remaining: 200 }

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)]">
      {/* Header */}
      <div className="flex-none flex items-center justify-between pb-4 border-b border-border mb-4">
        <div className="flex items-center gap-4">
          <h1 className="font-display font-extrabold text-2xl tracking-tight uppercase">
            AI Designer
          </h1>

          {/* Undo / Redo */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={undo}
              disabled={!canUndo}
              className={`${BTN_BASE} px-2 py-1 text-xs disabled:opacity-30`}
              title="Undo"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 7v6h6" /><path d="M3 13a9 9 0 0 1 15.36-6.36L21 9" />
              </svg>
            </button>
            <button
              type="button"
              onClick={redo}
              disabled={!canRedo}
              className={`${BTN_BASE} px-2 py-1 text-xs disabled:opacity-30`}
              title="Redo"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 7v6h-6" /><path d="M21 13a9 9 0 0 0-15.36-6.36L3 9" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Restart Wizard */}
          <button
            type="button"
            onClick={() => setShowWizard(true)}
            className={`${BTN_BASE} text-text-secondary hover:text-text-primary text-xs`}
          >
            Restart Wizard
          </button>

          {/* Publish / Unpublish toggle */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={isPublished ? handleUnpublish : handlePublish}
              className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
                isPublished ? 'bg-accent' : 'bg-text-secondary/30'
              }`}
              aria-label={isPublished ? 'Unpublish AI design' : 'Publish AI design'}
            >
              <span
                className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
                  isPublished ? 'translate-x-[18px]' : 'translate-x-[3px]'
                }`}
              />
            </button>
            <span className={`text-xs font-medium uppercase tracking-wider ${isPublished ? 'text-accent' : 'text-text-secondary'}`}>
              {isPublished ? 'Published' : 'Draft'}
            </span>
          </div>

          {/* Save status + button */}
          {saved && (
            <span className="text-xs font-semibold uppercase tracking-wider text-green-400">
              Saved
            </span>
          )}
          {saveError && (
            <span className="text-xs text-red-500">{saveError}</span>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 text-xs font-semibold uppercase tracking-wider bg-accent text-white hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {/* Editor split layout */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[2fr_3fr] gap-4">
        {/* Left: Chat panel */}
        <div className="min-h-0 overflow-hidden">
          <ChatPanel
            tokens={tokens}
            lockState={lockState}
            onTokensUpdate={handleTokensUpdate}
            profile={profile as Record<string, unknown>}
            usage={{ used: usageData.used, limit: usageData.limit }}
          />
        </div>

        {/* Right: Preview iframe */}
        <div className="hidden lg:flex flex-col min-h-0">
          <label className={FORM_LABEL}>Live Preview</label>
          {profile?.slug ? (
            <div className="flex-1 border border-border overflow-hidden bg-white">
              <iframe
                ref={iframeRef}
                src={`/${profile.slug}?preview=true`}
                className="w-full h-full"
                title="AI Design Preview"
              />
            </div>
          ) : (
            <div className="flex-1 border border-border flex items-center justify-center text-text-secondary text-sm">
              Set a URL slug on the Profile page to enable live preview.
            </div>
          )}
        </div>
      </div>

      {/* Bottom: Token inspector (collapsible) */}
      <div className="flex-none">
        <TokenInspector
          tokens={tokens}
          lockState={lockState}
          onToggleLock={handleToggleLock}
        />
      </div>
    </div>
  )
}
