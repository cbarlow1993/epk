export function formatEventDate(start: string | null, end: string | null): string | null {
  if (!start) return null
  const s = new Date(start + 'T00:00:00')
  const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  const fmtShort = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  if (!end) return fmt(s)
  const e = new Date(end + 'T00:00:00')
  if (s.getFullYear() === e.getFullYear() && s.getMonth() === e.getMonth()) {
    return `${fmtShort(s)} – ${e.getDate()}, ${e.getFullYear()}`
  }
  if (s.getFullYear() === e.getFullYear()) {
    return `${fmtShort(s)} – ${fmtShort(e)}, ${e.getFullYear()}`
  }
  return `${fmt(s)} – ${fmt(e)}`
}
