import { useState, useRef, useEffect } from 'react'
import { GOOGLE_FONTS, ALL_GOOGLE_FONTS } from '~/utils/theme-options'
import { FORM_LABEL } from './styles'

interface FontPickerProps {
  label: string
  value: string
  onChange: (font: string) => void
}

export function FontPicker({ label, value, onChange }: FontPickerProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Load Google Fonts for preview when dropdown opens
  useEffect(() => {
    if (!open) return
    // Load all fonts visible in dropdown for preview
    const fontsToLoad = ALL_GOOGLE_FONTS.filter(f =>
      !search || f.toLowerCase().includes(search.toLowerCase())
    ).slice(0, 20) // Only load first 20 visible for performance

    if (fontsToLoad.length === 0) return

    const families = fontsToLoad.map(f => `family=${f.replace(/ /g, '+')}:wght@400;700`).join('&')
    const linkId = 'font-picker-preview'
    let link = document.getElementById(linkId) as HTMLLinkElement | null
    if (!link) {
      link = document.createElement('link')
      link.id = linkId
      link.rel = 'stylesheet'
      document.head.appendChild(link)
    }
    link.href = `https://fonts.googleapis.com/css2?${families}&display=swap`
  }, [open, search])

  const filteredCategories = Object.entries(GOOGLE_FONTS)
    .map(([category, fonts]) => ({
      category,
      fonts: (fonts as readonly string[]).filter(f =>
        !search || f.toLowerCase().includes(search.toLowerCase())
      ),
    }))
    .filter(c => c.fonts.length > 0)

  return (
    <div ref={containerRef} className="relative">
      <label className={FORM_LABEL}>{label}</label>
      <button
        type="button"
        onClick={() => { setOpen(!open); setTimeout(() => inputRef.current?.focus(), 50) }}
        className="w-full flex items-center justify-between bg-card border border-border px-4 py-3 text-sm text-text-primary focus:border-accent focus:outline-none"
      >
        <span style={{ fontFamily: `'${value}', sans-serif` }}>{value}</span>
        <svg className={`h-4 w-4 text-text-secondary transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full max-h-80 overflow-y-auto border border-border bg-surface shadow-lg">
          {/* Search input */}
          <div className="sticky top-0 bg-surface border-b border-border p-2">
            <input
              ref={inputRef}
              type="text"
              placeholder="Search fonts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent px-2 py-1.5 text-sm text-text-primary placeholder-text-secondary/50 focus:outline-none"
            />
          </div>

          {/* Google Fonts by category */}
          {filteredCategories.map(({ category, fonts }) => (
            <div key={category}>
              <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-text-secondary bg-bg">
                {category}
              </div>
              {fonts.map((font) => (
                <button
                  key={font}
                  type="button"
                  onClick={() => { onChange(font); setOpen(false); setSearch('') }}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-accent/10 transition-colors ${
                    value === font ? 'bg-accent/5 text-accent' : 'text-text-primary'
                  }`}
                  style={{ fontFamily: `'${font}', sans-serif` }}
                >
                  {font}
                </button>
              ))}
            </div>
          ))}

          {filteredCategories.length === 0 && (
            <div className="px-3 py-4 text-center text-xs text-text-secondary">
              No fonts found
            </div>
          )}
        </div>
      )}
    </div>
  )
}
