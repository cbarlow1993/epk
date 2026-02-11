import { useState } from 'react'
import { FORM_INPUT, FORM_INPUT_ERROR, FORM_ERROR_MSG, FORM_LABEL, BTN_PRIMARY, CARD_SECTION } from '~/components/forms/styles'
import { sanitizeEmbed } from '~/utils/sanitize'

interface FieldConfig {
  name: string
  label: string
  type: 'text' | 'password' | 'url' | 'textarea'
  placeholder?: string
}

interface IntegrationCardProps {
  title: string
  type: string
  fields: FieldConfig[]
  initialConfig: Record<string, string>
  initialEnabled: boolean
  onSave: (config: Record<string, string>, enabled: boolean) => Promise<{ error?: string }>
  onResolveEmbed?: (url: string) => Promise<{ data?: { embed_html: string }; error?: string }>
  previewHtml?: string
}

export function IntegrationCard({
  title,
  fields,
  initialConfig,
  initialEnabled,
  onSave,
  onResolveEmbed,
  previewHtml: initialPreview,
}: IntegrationCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [enabled, setEnabled] = useState(initialEnabled)
  const [config, setConfig] = useState<Record<string, string>>(initialConfig)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [previewHtml, setPreviewHtml] = useState(initialPreview || '')
  const [resolving, setResolving] = useState(false)

  const handleFieldChange = (name: string, value: string) => {
    setConfig((prev) => ({ ...prev, [name]: value }))
    setSaved(false)
    setError('')
    setFieldErrors((prev) => ({ ...prev, [name]: '' }))
  }

  const handleResolve = async () => {
    if (!onResolveEmbed || !config.embed_url) return
    setResolving(true)
    setError('')
    const result = await onResolveEmbed(config.embed_url)
    if (result.error) {
      setError(result.error)
    } else if (result.data?.embed_html) {
      setConfig((prev) => ({ ...prev, embed_html: result.data!.embed_html }))
      setPreviewHtml(result.data.embed_html)
    }
    setResolving(false)
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')
    setSaved(false)
    const result = await onSave(config, enabled)
    if (result.error) {
      setError(result.error)
    } else {
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }
    setSaving(false)
  }

  // Sanitize embed HTML through the allowlisted sanitizeEmbed utility
  const sanitizedPreview = previewHtml ? sanitizeEmbed(previewHtml) : ''

  return (
    <div className={CARD_SECTION}>
      {/* Header - always visible */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <span className="font-semibold text-text-primary">{title}</span>
          <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 ${
            enabled ? 'bg-green-500/10 text-green-400' : 'bg-surface text-text-secondary'
          }`}>
            {enabled ? 'Active' : 'Inactive'}
          </span>
        </div>
        <span className="text-text-secondary text-sm">{expanded ? '\u25B2' : '\u25BC'}</span>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="mt-6 space-y-4">
          {/* Enable toggle */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => { setEnabled(e.target.checked); setSaved(false) }}
              className="w-4 h-4 accent-accent"
            />
            <span className="text-sm text-text-secondary">Enable on public EPK</span>
          </label>

          {/* Config fields */}
          {fields.map((field) => (
            <div key={field.name}>
              <label className={FORM_LABEL}>{field.label}</label>
              {field.type === 'textarea' ? (
                <textarea
                  value={config[field.name] || ''}
                  onChange={(e) => handleFieldChange(field.name, e.target.value)}
                  placeholder={field.placeholder}
                  rows={4}
                  className={fieldErrors[field.name] ? FORM_INPUT_ERROR : FORM_INPUT}
                />
              ) : (
                <input
                  type={field.type}
                  value={config[field.name] || ''}
                  onChange={(e) => handleFieldChange(field.name, e.target.value)}
                  placeholder={field.placeholder}
                  className={fieldErrors[field.name] ? FORM_INPUT_ERROR : FORM_INPUT}
                />
              )}
              {fieldErrors[field.name] && <p className={FORM_ERROR_MSG}>{fieldErrors[field.name]}</p>}
            </div>
          ))}

          {/* Resolve embed button (for music embeds) */}
          {onResolveEmbed && (
            <button
              type="button"
              onClick={handleResolve}
              disabled={resolving || !config.embed_url}
              className={`${BTN_PRIMARY} text-xs`}
            >
              {resolving ? 'Resolving...' : 'Preview Embed'}
            </button>
          )}

          {/* Embed preview - HTML is sanitized through sanitizeEmbed allowlist */}
          {sanitizedPreview && (
            <div className="border border-border p-2">
              <p className={`${FORM_LABEL} mb-2`}>Preview</p>
              <div
                className="[&_iframe]:w-full [&_iframe]:rounded-none"
                dangerouslySetInnerHTML={{ __html: sanitizedPreview }}
              />
            </div>
          )}

          {/* Save / status */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className={BTN_PRIMARY}
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
            {saved && <span className="text-xs font-semibold uppercase tracking-wider text-green-400">Saved</span>}
            {error && <span className="text-xs text-red-500">{error}</span>}
          </div>
        </div>
      )}
    </div>
  )
}
