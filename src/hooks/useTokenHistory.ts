import { useState, useCallback } from 'react'
import type { AIDesignTokens } from '~/schemas/ai-design-tokens'

const MAX_HISTORY = 20

export function useTokenHistory(initialTokens: AIDesignTokens) {
  const [tokens, setTokensInternal] = useState(initialTokens)
  const [undoStack, setUndoStack] = useState<AIDesignTokens[]>([])
  const [redoStack, setRedoStack] = useState<AIDesignTokens[]>([])

  const setTokens = useCallback((newTokens: AIDesignTokens) => {
    setUndoStack((prev) => [...prev.slice(-(MAX_HISTORY - 1)), tokens])
    setRedoStack([])
    setTokensInternal(newTokens)
  }, [tokens])

  const undo = useCallback(() => {
    if (undoStack.length === 0) return
    const prev = undoStack[undoStack.length - 1]
    setUndoStack((s) => s.slice(0, -1))
    setRedoStack((s) => [...s, tokens])
    setTokensInternal(prev)
  }, [undoStack, tokens])

  const redo = useCallback(() => {
    if (redoStack.length === 0) return
    const next = redoStack[redoStack.length - 1]
    setRedoStack((s) => s.slice(0, -1))
    setUndoStack((s) => [...s, tokens])
    setTokensInternal(next)
  }, [redoStack, tokens])

  return { tokens, setTokens, undo, redo, canUndo: undoStack.length > 0, canRedo: redoStack.length > 0 }
}
