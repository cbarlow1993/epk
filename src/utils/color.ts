/**
 * Determine whether a hex color is light (perceived brightness > 50%).
 * Uses the W3C relative luminance formula for sRGB.
 */
export function isLightBackground(hex: string): boolean {
  const cleaned = hex.replace('#', '')
  const r = parseInt(cleaned.substring(0, 2), 16)
  const g = parseInt(cleaned.substring(2, 4), 16)
  const b = parseInt(cleaned.substring(4, 6), 16)
  // Perceived brightness (YIQ formula)
  const brightness = (r * 299 + g * 587 + b * 114) / 1000
  return brightness > 128
}
