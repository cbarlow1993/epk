import { createServerFn } from '@tanstack/react-start'

interface OEmbedResult {
  platform: string
  embedHtml: string | null
}

const PLATFORM_PATTERNS: [RegExp, string, string][] = [
  [/soundcloud\.com/, 'soundcloud', 'https://soundcloud.com/oembed?format=json&url='],
  [/open\.spotify\.com/, 'spotify', 'https://open.spotify.com/oembed?url='],
  [/mixcloud\.com/, 'mixcloud', 'https://www.mixcloud.com/oembed/?format=json&url='],
  [/(youtube\.com|youtu\.be)/, 'youtube', 'https://www.youtube.com/oembed?format=json&url='],
  [/bandcamp\.com/, 'bandcamp', ''],
]

function detectPlatform(url: string): { platform: string; oembedEndpoint: string } | null {
  for (const [pattern, platform, endpoint] of PLATFORM_PATTERNS) {
    if (pattern.test(url)) return { platform, oembedEndpoint: endpoint }
  }
  return null
}

export const resolveEmbed = createServerFn({ method: 'POST' })
  .inputValidator((data: { url: string }) => data)
  .handler(async ({ data: { url } }): Promise<OEmbedResult> => {
    const detected = detectPlatform(url)
    if (!detected) return { platform: 'other', embedHtml: null }

    const { platform, oembedEndpoint } = detected

    // Bandcamp doesn't support oEmbed — return platform only
    if (platform === 'bandcamp') {
      return { platform, embedHtml: null }
    }

    try {
      const response = await fetch(`${oembedEndpoint}${encodeURIComponent(url)}`)
      if (!response.ok) return { platform, embedHtml: null }

      const data = await response.json()
      return { platform, embedHtml: data.html || null }
    } catch {
      return { platform, embedHtml: null }
    }
  })
