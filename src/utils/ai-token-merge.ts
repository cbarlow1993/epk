import type { AIDesignTokens, PartialAIDesignTokens, TokenLockState } from '~/schemas/ai-design-tokens'

/**
 * Deep merge partial token updates into current tokens, respecting locked paths.
 * Locked paths are never overwritten.
 */
export function mergeTokens(
  current: AIDesignTokens,
  updates: PartialAIDesignTokens,
  locks: TokenLockState,
): AIDesignTokens {
  return deepMerge(current, updates, locks, '') as AIDesignTokens
}

function deepMerge(
  target: Record<string, unknown>,
  source: Record<string, unknown>,
  locks: TokenLockState,
  path: string,
): Record<string, unknown> {
  const result = { ...target }

  for (const key of Object.keys(source)) {
    const fullPath = path ? `${path}.${key}` : key
    const sourceVal = source[key]
    const targetVal = target[key]

    // Skip locked paths
    if (locks[fullPath] === 'locked') continue

    // Recurse into nested objects (but not arrays)
    if (
      sourceVal !== null &&
      typeof sourceVal === 'object' &&
      !Array.isArray(sourceVal) &&
      targetVal !== null &&
      typeof targetVal === 'object' &&
      !Array.isArray(targetVal)
    ) {
      result[key] = deepMerge(
        targetVal as Record<string, unknown>,
        sourceVal as Record<string, unknown>,
        locks,
        fullPath,
      )
    } else {
      result[key] = sourceVal
    }
  }

  return result
}

/**
 * Compute a diff between two token objects (for displaying what changed).
 * Returns an array of { path, from, to } entries.
 */
export function diffTokens(
  before: AIDesignTokens,
  after: AIDesignTokens,
): Array<{ path: string; from: unknown; to: unknown }> {
  const changes: Array<{ path: string; from: unknown; to: unknown }> = []
  diffRecursive(before, after, '', changes)
  return changes
}

function diffRecursive(
  a: Record<string, unknown>,
  b: Record<string, unknown>,
  path: string,
  changes: Array<{ path: string; from: unknown; to: unknown }>,
): void {
  const allKeys = new Set([...Object.keys(a), ...Object.keys(b)])

  for (const key of allKeys) {
    const fullPath = path ? `${path}.${key}` : key
    const aVal = a[key]
    const bVal = b[key]

    if (
      aVal !== null &&
      typeof aVal === 'object' &&
      !Array.isArray(aVal) &&
      bVal !== null &&
      typeof bVal === 'object' &&
      !Array.isArray(bVal)
    ) {
      diffRecursive(
        aVal as Record<string, unknown>,
        bVal as Record<string, unknown>,
        fullPath,
        changes,
      )
    } else if (JSON.stringify(aVal) !== JSON.stringify(bVal)) {
      changes.push({ path: fullPath, from: aVal, to: bVal })
    }
  }
}
