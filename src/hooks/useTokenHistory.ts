import { useState, useCallback } from 'react'
import type { AIDesignTokens } from '~/schemas/ai-design-tokens'

const MAX_HISTORY = 20

export function useTokenHistory(initialTokens: AIDesignTokens | null) {
  const [tokens, setTokensInternal] = useState<AIDesignTokens | null>(initialTokens)
  const [undoStack, setUndoStack] = useState<AIDesignTokens[]>([])
  const [redoStack, setRedoStack] = useState<AIDesignTokens[]>([])

  const setTokens = useCallback((newTokens: AIDesignTokens) => {
    setTokensInternal((prev) => {
      if (prev) setUndoStack((stack) => [...stack.slice(-(MAX_HISTORY - 1)), prev])
      setRedoStack([])
      return newTokens
    })
  }, [])

  const undo = useCallback(() => {
    setUndoStack((stack) => {
      if (stack.length === 0) return stack
      const prev = stack[stack.length - 1]
      setTokensInternal((current) => {
        if (current) setRedoStack((s) => [...s, current])
        return prev
      })
      return stack.slice(0, -1)
    })
  }, [])

  const redo = useCallback(() => {
    setRedoStack((stack) => {
      if (stack.length === 0) return stack
      const next = stack[stack.length - 1]
      setTokensInternal((current) => {
        if (current) setUndoStack((s) => [...s, current])
        return next
      })
      return stack.slice(0, -1)
    })
  }, [])

  return { tokens, setTokens, undo, redo, canUndo: undoStack.length > 0, canRedo: redoStack.length > 0 }
}
