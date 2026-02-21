import { useState } from 'react'
import type { AIDesignTokens, TokenLockState } from '~/schemas/ai-design-tokens'

interface TokenInspectorProps {
  tokens: AIDesignTokens
  lockState: TokenLockState
  onToggleLock: (path: string) => void
}

// SVG icon components

function LockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0110 0v4" />
    </svg>
  )
}

function UnlockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 019.9-1" />
    </svg>
  )
}

function SparkleIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z" />
    </svg>
  )
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`transition-transform ${open ? 'rotate-90' : ''}`}
    >
      <path d="M9 18l6-6-6-6" />
    </svg>
  )
}

// Determines if a string value is a hex color
function isHexColor(value: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(value)
}

// Flattens a nested object into dot-path entries
function flattenTokens(
  obj: Record<string, unknown>,
  prefix: string,
): Array<{ path: string; value: unknown }> {
  const entries: Array<{ path: string; value: unknown }> = []

  for (const key of Object.keys(obj)) {
    const fullPath = prefix ? `${prefix}.${key}` : key
    const val = obj[key]

    if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
      entries.push(...flattenTokens(val as Record<string, unknown>, fullPath))
    } else {
      entries.push({ path: fullPath, value: val })
    }
  }

  return entries
}

// Format a value for display
function formatValue(value: unknown): string {
  if (typeof value === 'string') return value
  if (typeof value === 'number') return String(value)
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  if (Array.isArray(value)) return `[${value.length} items]`
  return JSON.stringify(value)
}

// Token category definitions with their root keys
const TOKEN_CATEGORIES = [
  { label: 'Colors', key: 'colors' },
  { label: 'Typography', key: 'typography' },
  { label: 'Layout', key: 'layout' },
  { label: 'Sections', key: 'sections' },
  { label: 'Decorative', key: 'decorative' },
  { label: 'Spacing', key: 'spacing' },
  { label: 'Radii', key: 'radii' },
  { label: 'Shadows', key: 'shadows' },
  { label: 'Animation', key: 'animation' },
] as const

function TokenRow({
  path,
  value,
  lockState,
  onToggleLock,
}: {
  path: string
  value: unknown
  lockState: TokenLockState
  onToggleLock: (path: string) => void
}) {
  const state = lockState[path] || 'default'
  const displayValue = formatValue(value)
  const showSwatch = typeof value === 'string' && isHexColor(value)

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-surface/80 group">
      {/* Lock / AI indicator */}
      <button
        type="button"
        onClick={() => onToggleLock(path)}
        className={`shrink-0 p-0.5 rounded transition-colors ${
          state === 'locked'
            ? 'text-accent'
            : state === 'generated'
              ? 'text-text-secondary/60'
              : 'text-text-secondary/30 opacity-0 group-hover:opacity-100'
        }`}
        title={
          state === 'locked'
            ? 'Locked (click to unlock)'
            : state === 'generated'
              ? 'AI generated (click to lock)'
              : 'Click to lock'
        }
      >
        {state === 'locked' ? (
          <LockIcon />
        ) : state === 'generated' ? (
          <SparkleIcon />
        ) : (
          <UnlockIcon />
        )}
      </button>

      {/* Dot-path */}
      <span className="text-text-secondary truncate min-w-0 flex-1 font-mono" title={path}>
        {path}
      </span>

      {/* Value with optional color swatch */}
      <span className="flex items-center gap-1.5 shrink-0 max-w-[40%]">
        {showSwatch && (
          <span
            className="inline-block w-3 h-3 rounded-sm border border-border shrink-0"
            style={{ backgroundColor: value as string }}
          />
        )}
        <span className="text-text-primary truncate font-mono" title={displayValue}>
          {displayValue}
        </span>
      </span>
    </div>
  )
}

function CategoryGroup({
  label,
  categoryKey,
  tokens,
  lockState,
  onToggleLock,
}: {
  label: string
  categoryKey: string
  tokens: AIDesignTokens
  lockState: TokenLockState
  onToggleLock: (path: string) => void
}) {
  const [open, setOpen] = useState(false)

  const categoryData = tokens[categoryKey as keyof AIDesignTokens]
  if (categoryData === undefined || categoryData === null) return null

  const entries =
    typeof categoryData === 'object' && !Array.isArray(categoryData)
      ? flattenTokens(categoryData as Record<string, unknown>, categoryKey)
      : [{ path: categoryKey, value: categoryData }]

  return (
    <div className="border-b border-border last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 w-full px-3 py-2 text-xs font-semibold uppercase tracking-wider text-text-secondary hover:text-text-primary hover:bg-surface/50 transition-colors"
      >
        <ChevronIcon open={open} />
        <span>{label}</span>
        <span className="ml-auto text-text-secondary/50 font-normal normal-case">
          {entries.length}
        </span>
      </button>

      {open && (
        <div className="pb-1">
          {entries.map((entry) => (
            <TokenRow
              key={entry.path}
              path={entry.path}
              value={entry.value}
              lockState={lockState}
              onToggleLock={onToggleLock}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function TokenInspector({ tokens, lockState, onToggleLock }: TokenInspectorProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className="border-t border-border bg-bg">
      {/* Toggle button */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 w-full px-4 py-2 text-xs font-semibold uppercase tracking-wider text-text-secondary hover:text-text-primary transition-colors"
      >
        <ChevronIcon open={open} />
        <span>Token Inspector</span>
        {Object.values(lockState).filter((s) => s === 'locked').length > 0 && (
          <span className="ml-2 px-1.5 py-0.5 bg-accent/10 text-accent rounded text-[10px] font-bold">
            {Object.values(lockState).filter((s) => s === 'locked').length} locked
          </span>
        )}
      </button>

      {/* Collapsible content */}
      {open && (
        <div className="max-h-80 overflow-y-auto border-t border-border">
          {TOKEN_CATEGORIES.map((cat) => (
            <CategoryGroup
              key={cat.key}
              label={cat.label}
              categoryKey={cat.key}
              tokens={tokens}
              lockState={lockState}
              onToggleLock={onToggleLock}
            />
          ))}
        </div>
      )}
    </div>
  )
}
