import { z } from 'zod'
import type { AIDesignTokens, TokenLockState } from '~/schemas/ai-design-tokens'
import { aiDesignTokensSchema } from '~/schemas/ai-design-tokens'

interface CMSContentSummary {
  hasBio: boolean
  bioWordCount: number
  mixCount: number
  eventCount: number
  photoCount: number
  hasHeroImage: boolean
  hasTechnicalRider: boolean
  hasBookingContact: boolean
  socialLinkCount: number
  displayName: string
  genres: string[]
}

export function buildSystemPrompt(
  currentTokens: AIDesignTokens,
  lockedTokens: TokenLockState,
  cmsContent: CMSContentSummary,
): string {
  const tokenSchema = z.toJSONSchema(aiDesignTokensSchema)

  const lockedEntries = Object.entries(lockedTokens)
    .filter(([, state]) => state === 'locked')
    .map(([path]) => path)

  return `You are an expert visual designer for DJ Electronic Press Kit (EPK) pages. Your job is to generate and refine design token configurations that produce stunning, professional EPK pages.

## Design Token Schema

You MUST return a valid JSON object matching this schema:

${JSON.stringify(tokenSchema, null, 2)}

## Current Design Tokens

${JSON.stringify(currentTokens, null, 2)}

## Locked Tokens (DO NOT CHANGE)

The user has explicitly locked these token paths. You MUST preserve their exact values:
${lockedEntries.length > 0 ? lockedEntries.map((p) => `- ${p}`).join('\n') : '(none locked)'}

## CMS Content Available

This DJ's EPK has the following content:
- Display name: ${cmsContent.displayName}
- Genres: ${cmsContent.genres.join(', ') || 'not set'}
- Bio: ${cmsContent.hasBio ? `yes (${cmsContent.bioWordCount} words)` : 'no'}
- Hero image: ${cmsContent.hasHeroImage ? 'yes' : 'no'}
- Mixes: ${cmsContent.mixCount}
- Events: ${cmsContent.eventCount}
- Photos: ${cmsContent.photoCount}
- Technical rider: ${cmsContent.hasTechnicalRider ? 'yes' : 'no'}
- Booking contact: ${cmsContent.hasBookingContact ? 'yes' : 'no'}
- Social links: ${cmsContent.socialLinkCount}

## Guidelines

1. Only include sections in sectionOrder that have content (e.g., skip 'photos' if photoCount is 0)
2. Set sectionVisibility to false for sections without content
3. Choose typography pairings that complement each other (display font + body font)
4. Ensure sufficient color contrast between text and background (WCAG AA minimum)
5. Use Google Fonts that are available and popular
6. When the user asks for changes, only modify relevant tokens — preserve everything else
7. Explain your design choices briefly in your message

## Response Format

Respond with:
1. A brief message explaining your design choices (2-3 sentences)
2. The complete or partial token object as a tool call

When generating a full design (wizard), return the COMPLETE token object.
When refining (chat), return ONLY the changed token paths.`
}

export function summarizeCMSContent(profile: Record<string, unknown>): CMSContentSummary {
  const mixes = (profile.mixes as unknown[]) || []
  const events = (profile.events as unknown[]) || []
  const photos = (profile.photos as unknown[]) || []
  const socialLinks = (profile.social_links as unknown[]) || []
  const bio = profile.bio as string | null

  return {
    hasBio: !!bio && bio.length > 0,
    bioWordCount: bio ? bio.split(/\s+/).length : 0,
    mixCount: mixes.length,
    eventCount: events.length,
    photoCount: photos.length,
    hasHeroImage: !!(profile.hero_image_url || profile.hero_bg_url),
    hasTechnicalRider: !!(profile.technical_rider as unknown),
    hasBookingContact: !!(profile.booking_email || profile.booking_phone),
    socialLinkCount: socialLinks.length,
    displayName: (profile.display_name as string) || '',
    genres: ((profile.genres as string[]) || []),
  }
}
