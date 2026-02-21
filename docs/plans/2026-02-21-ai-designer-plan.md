# AI Designer Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build an AI-powered EPK design tool with a guided wizard, chat refinement interface, and a separate AI renderer that uses extended design tokens.

**Architecture:** Extended design token schema (~150 properties) stored as JSONB. Guided wizard establishes baseline via vibe presets + optional user locks, then AI (Claude via Vercel AI Gateway) generates the full token set. Chat interface refines tokens via streaming. Separate AI renderer interprets tokens to render public EPK pages. Bundled with pro tier, monthly usage cap.

**Tech Stack:** TanStack Start, Vercel AI SDK (`ai` + `@ai-sdk/anthropic`), Zod, Supabase (Postgres + RLS), Tailwind CSS v4, react-hook-form.

**Design Doc:** `docs/plans/2026-02-21-ai-designer-design.md`

---

## Task 1: Database Migration

Add new columns to `profiles` and create `ai_usage` table.

**Files:**
- Create: `supabase/migrations/20260221200000_ai_designer.sql`

**Step 1: Create the migration file**

```sql
-- AI Designer: new columns on profiles + usage tracking table

-- Renderer mode (template = existing, ai = new AI renderer)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS renderer text DEFAULT 'template'
  CHECK (renderer IN ('template', 'ai'));

-- AI design tokens (the full token object)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS ai_design_tokens jsonb;

-- Undo/redo history (array of token snapshots, capped at 20)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS ai_design_history jsonb DEFAULT '[]';

-- Chat conversation history for context continuity
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS ai_chat_history jsonb DEFAULT '[]';

-- AI usage tracking (monthly message count per user)
CREATE TABLE IF NOT EXISTS public.ai_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  month text NOT NULL,
  message_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, month)
);

ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own AI usage"
  ON public.ai_usage FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own AI usage"
  ON public.ai_usage FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own AI usage"
  ON public.ai_usage FOR UPDATE
  USING (user_id = auth.uid());
```

**Step 2: Push migration to remote**

Run: `npx supabase db push`
Expected: Migration applied successfully.

**Step 3: Commit**

```bash
git add supabase/migrations/20260221200000_ai_designer.sql
git commit -m "feat(ai-designer): add database migration for AI design tokens and usage tracking"
```

---

## Task 2: Install Vercel AI SDK Dependencies

**Files:**
- Modify: `package.json`

**Step 1: Install packages**

Run: `npm install ai @ai-sdk/anthropic`

**Step 2: Verify installation**

Run: `npm ls ai @ai-sdk/anthropic`
Expected: Both packages listed with versions.

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat(ai-designer): add Vercel AI SDK and Anthropic provider"
```

---

## Task 3: Design Token Zod Schema

Define the comprehensive design token schema with all 150+ properties.

**Files:**
- Create: `src/schemas/ai-design-tokens.ts`
- Modify: `src/schemas/index.ts` (add barrel export)

**Step 1: Create the token schema file**

Create `src/schemas/ai-design-tokens.ts`:

```typescript
import { z } from 'zod'

// --- Primitives ---

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/)

const gradientStop = z.object({
  color: hexColor,
  position: z.number().min(0).max(100),
})

const gradientDef = z.object({
  type: z.enum(['linear', 'radial', 'conic']),
  angle: z.number().min(0).max(360).optional(),
  stops: z.array(gradientStop).min(2),
})

const typographyTier = z.object({
  fontFamily: z.string(),
  fontSize: z.string(),
  fontWeight: z.string(),
  lineHeight: z.string().optional(),
  letterSpacing: z.string().optional(),
  textTransform: z.enum(['none', 'uppercase', 'lowercase', 'capitalize']).optional(),
})

// --- Section Variants ---

const heroVariant = z.enum(['fullscreen', 'split', 'minimal', 'video-bg', 'parallax'])
const bioVariant = z.enum(['centered', 'split-image', 'full-width', 'sidebar'])
const musicVariant = z.enum(['cards', 'list', 'waveform', 'featured'])
const eventsVariant = z.enum(['timeline', 'grid', 'list', 'calendar'])
const photosVariant = z.enum(['masonry', 'grid', 'carousel', 'lightbox'])
const contactVariant = z.enum(['form', 'minimal', 'card', 'split'])

// --- Section Tokens ---

const sectionTokens = z.object({
  background: z.string().optional(),
  textColor: hexColor.optional(),
  padding: z.string().optional(),
})

const heroTokens = sectionTokens.extend({
  variant: heroVariant,
  overlayOpacity: z.number().min(0).max(1).optional(),
  titleAlignment: z.enum(['left', 'center', 'right']).optional(),
  showSubtitle: z.boolean().optional(),
  showGenres: z.boolean().optional(),
})

const bioTokens = sectionTokens.extend({
  variant: bioVariant,
  showReadMore: z.boolean().optional(),
  maxLines: z.number().min(3).max(20).optional(),
})

const musicTokens = sectionTokens.extend({
  variant: musicVariant,
  columnsDesktop: z.number().min(1).max(4).optional(),
  showCoverArt: z.boolean().optional(),
  showDuration: z.boolean().optional(),
})

const eventsTokens = sectionTokens.extend({
  variant: eventsVariant,
  showPastEvents: z.boolean().optional(),
  maxVisible: z.number().min(3).max(20).optional(),
})

const photosTokens = sectionTokens.extend({
  variant: photosVariant,
  columnsDesktop: z.number().min(2).max(6).optional(),
  gap: z.string().optional(),
  aspectRatio: z.enum(['square', 'landscape', 'portrait', 'auto']).optional(),
})

const contactTokens = sectionTokens.extend({
  variant: contactVariant,
  showSocialLinks: z.boolean().optional(),
})

// --- Section Keys ---

export const SECTION_KEYS = [
  'hero', 'bio', 'music', 'events', 'photos', 'contact',
] as const
export type SectionKey = (typeof SECTION_KEYS)[number]

// --- Main Token Schema ---

export const aiDesignTokensSchema = z.object({
  // Global colors
  colors: z.object({
    primary: hexColor,
    secondary: hexColor,
    accent: hexColor,
    background: hexColor,
    surface: hexColor,
    text: hexColor,
    textMuted: hexColor,
    heading: hexColor,
    link: hexColor,
    border: hexColor,
  }),

  // Gradients
  gradients: z.array(gradientDef).optional(),

  // Typography
  typography: z.object({
    display: typographyTier,
    h1: typographyTier,
    h2: typographyTier,
    h3: typographyTier,
    h4: typographyTier,
    body: typographyTier,
    small: typographyTier,
    caption: typographyTier,
  }),

  // Font imports (Google Fonts names)
  fontImports: z.array(z.string()),

  // Spacing scale
  spacing: z.object({
    xs: z.string(),
    sm: z.string(),
    md: z.string(),
    lg: z.string(),
    xl: z.string(),
    '2xl': z.string(),
  }),

  // Border radii
  radii: z.object({
    none: z.string(),
    sm: z.string(),
    md: z.string(),
    lg: z.string(),
    full: z.string(),
  }),

  // Shadows
  shadows: z.object({
    none: z.string(),
    sm: z.string(),
    md: z.string(),
    lg: z.string(),
    xl: z.string(),
  }),

  // Animations
  animation: z.object({
    sectionEntrance: z.enum(['fade', 'slide-up', 'scale', 'none']),
    duration: z.string().optional(),
    easing: z.string().optional(),
  }),

  // Layout
  layout: z.object({
    contentWidth: z.string(),
    sectionPadding: z.string(),
    sectionOrder: z.array(z.enum(['hero', 'bio', 'music', 'events', 'photos', 'contact'])),
    sectionVisibility: z.record(z.enum(['hero', 'bio', 'music', 'events', 'photos', 'contact']), z.boolean()),
    navStyle: z.enum(['fixed', 'static', 'hidden']),
    footerStyle: z.enum(['minimal', 'detailed', 'hidden']),
  }),

  // Section-specific tokens
  sections: z.object({
    hero: heroTokens,
    bio: bioTokens,
    music: musicTokens,
    events: eventsTokens,
    photos: photosTokens,
    contact: contactTokens,
  }),

  // Decorative
  decorative: z.object({
    dividerStyle: z.enum(['none', 'line', 'gradient', 'wave', 'diagonal', 'dots']),
    backgroundPattern: z.enum(['none', 'dots', 'grid', 'noise', 'topography']),
    buttonStyle: z.enum(['rounded', 'square', 'pill']),
    linkStyle: z.enum(['underline', 'none', 'hover-underline']),
    cardBorder: z.enum(['none', 'subtle', 'solid']),
    shadow: z.enum(['none', 'sm', 'md', 'lg']),
  }),
})

export type AIDesignTokens = z.infer<typeof aiDesignTokensSchema>

// Partial schema for AI updates (only changed tokens)
export const partialAIDesignTokensSchema = aiDesignTokensSchema.deepPartial()
export type PartialAIDesignTokens = z.infer<typeof partialAIDesignTokensSchema>

// Lock state tracking — maps dot-path keys to 'locked' | 'generated' | 'default'
export type TokenLockState = Record<string, 'locked' | 'generated' | 'default'>

// Chat message schema
export const aiChatMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string(),
  tokenChanges: partialAIDesignTokensSchema.optional(),
  timestamp: z.string(),
})
export type AIChatMessage = z.infer<typeof aiChatMessageSchema>
```

**Step 2: Add barrel export**

Add to `src/schemas/index.ts`:

```typescript
export {
  aiDesignTokensSchema,
  partialAIDesignTokensSchema,
  aiChatMessageSchema,
  SECTION_KEYS,
  type AIDesignTokens,
  type PartialAIDesignTokens,
  type TokenLockState,
  type AIChatMessage,
  type SectionKey,
} from './ai-design-tokens'
```

**Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

**Step 4: Commit**

```bash
git add src/schemas/ai-design-tokens.ts src/schemas/index.ts
git commit -m "feat(ai-designer): add design token Zod schema with 150+ properties"
```

---

## Task 4: Vibe Presets

Define the 8–12 mood/aesthetic presets that map to starter token configurations. These are deterministic (no AI needed).

**Files:**
- Create: `src/utils/ai-vibe-presets.ts`

**Step 1: Create vibe presets file**

Create `src/utils/ai-vibe-presets.ts`:

Each vibe preset is a complete `AIDesignTokens` object. Define at minimum these vibes:
- `dark-moody` — deep blacks, deep reds/purples, dramatic shadows, fullscreen hero
- `clean-minimal` — whites, light grays, simple typography, lots of whitespace
- `neon-electric` — dark background, vibrant neon accents, glowing effects
- `warm-organic` — earth tones, serif fonts, warm shadows
- `retro-vintage` — muted colors, retro fonts, textured backgrounds
- `bold-graphic` — high contrast, display fonts, geometric shapes
- `ethereal-ambient` — soft pastels, light backgrounds, subtle animations
- `raw-underground` — dark, gritty, monospace fonts, minimal decoration

Each preset should be a full `AIDesignTokens` object with sensible defaults for all fields. Use fonts from the existing `GOOGLE_FONTS` list in `src/utils/theme-options.ts`.

```typescript
import type { AIDesignTokens } from '~/schemas/ai-design-tokens'

export interface VibePreset {
  id: string
  label: string
  description: string
  tokens: AIDesignTokens
}

export const VIBE_PRESETS: VibePreset[] = [
  {
    id: 'dark-moody',
    label: 'Dark & Moody',
    description: 'Deep shadows, dramatic lighting, rich dark tones',
    tokens: {
      colors: {
        primary: '#1a1a2e',
        secondary: '#16213e',
        accent: '#e94560',
        background: '#0f0f0f',
        surface: '#1a1a1a',
        text: '#e0e0e0',
        textMuted: '#888888',
        heading: '#ffffff',
        link: '#e94560',
        border: '#2a2a2a',
      },
      typography: {
        display: { fontFamily: 'Bebas Neue', fontSize: '5rem', fontWeight: '400', textTransform: 'uppercase' },
        h1: { fontFamily: 'Bebas Neue', fontSize: '2.5rem', fontWeight: '400', textTransform: 'uppercase' },
        h2: { fontFamily: 'Inter', fontSize: '1.5rem', fontWeight: '600' },
        h3: { fontFamily: 'Inter', fontSize: '1.25rem', fontWeight: '600' },
        h4: { fontFamily: 'Inter', fontSize: '1rem', fontWeight: '600' },
        body: { fontFamily: 'Inter', fontSize: '1rem', fontWeight: '400', lineHeight: '1.7' },
        small: { fontFamily: 'Inter', fontSize: '0.875rem', fontWeight: '400' },
        caption: { fontFamily: 'Inter', fontSize: '0.75rem', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.05em' },
      },
      fontImports: ['Bebas Neue', 'Inter'],
      spacing: { xs: '0.25rem', sm: '0.5rem', md: '1rem', lg: '2rem', xl: '4rem', '2xl': '6rem' },
      radii: { none: '0', sm: '0.25rem', md: '0.5rem', lg: '1rem', full: '9999px' },
      shadows: {
        none: 'none',
        sm: '0 1px 3px rgba(0,0,0,0.3)',
        md: '0 4px 12px rgba(0,0,0,0.4)',
        lg: '0 8px 24px rgba(0,0,0,0.5)',
        xl: '0 16px 48px rgba(0,0,0,0.6)',
      },
      animation: { sectionEntrance: 'fade', duration: '0.6s', easing: 'ease-out' },
      layout: {
        contentWidth: '72rem',
        sectionPadding: '5rem',
        sectionOrder: ['hero', 'bio', 'music', 'events', 'photos', 'contact'],
        sectionVisibility: { hero: true, bio: true, music: true, events: true, photos: true, contact: true },
        navStyle: 'fixed',
        footerStyle: 'minimal',
      },
      sections: {
        hero: { variant: 'fullscreen', overlayOpacity: 0.6, titleAlignment: 'center', showSubtitle: true, showGenres: true },
        bio: { variant: 'centered', showReadMore: true, maxLines: 6 },
        music: { variant: 'cards', columnsDesktop: 3, showCoverArt: true, showDuration: true },
        events: { variant: 'timeline', showPastEvents: false, maxVisible: 8 },
        photos: { variant: 'masonry', columnsDesktop: 3, gap: '0.5rem', aspectRatio: 'auto' },
        contact: { variant: 'form', showSocialLinks: true },
      },
      decorative: {
        dividerStyle: 'none',
        backgroundPattern: 'none',
        buttonStyle: 'square',
        linkStyle: 'hover-underline',
        cardBorder: 'subtle',
        shadow: 'lg',
      },
    },
  },
  // Define 7 more presets following the same pattern:
  // 'clean-minimal', 'neon-electric', 'warm-organic',
  // 'retro-vintage', 'bold-graphic', 'ethereal-ambient', 'raw-underground'
  //
  // Each preset must be a complete AIDesignTokens object.
  // Use fonts from GOOGLE_FONTS in src/utils/theme-options.ts.
  // Vary colors, typography, layout variants, decorative options.
]

export function getVibePreset(id: string): VibePreset | undefined {
  return VIBE_PRESETS.find((v) => v.id === id)
}
```

**NOTE:** The implementing agent should create all 8 presets with distinct, well-designed token configurations. The `dark-moody` example above is the template — follow the same structure for all. Use the font lists from `src/utils/theme-options.ts` (`GOOGLE_FONTS`) for available font names.

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

**Step 3: Commit**

```bash
git add src/utils/ai-vibe-presets.ts
git commit -m "feat(ai-designer): add 8 vibe presets for guided wizard"
```

---

## Task 5: AI System Prompt Builder

Build the utility that constructs the system prompt sent to Claude via Vercel AI Gateway.

**Files:**
- Create: `src/utils/ai-prompts.ts`

**Step 1: Create the prompt builder**

Create `src/utils/ai-prompts.ts`:

```typescript
import type { AIDesignTokens, TokenLockState } from '~/schemas/ai-design-tokens'
import { aiDesignTokensSchema } from '~/schemas/ai-design-tokens'
import { zodToJsonSchema } from 'zod-to-json-schema'

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
  const tokenSchema = zodToJsonSchema(aiDesignTokensSchema)

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
```

**Step 2: Install zod-to-json-schema dependency**

Run: `npm install zod-to-json-schema`

**Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

**Step 4: Commit**

```bash
git add src/utils/ai-prompts.ts package.json package-lock.json
git commit -m "feat(ai-designer): add AI system prompt builder with CMS content summary"
```

---

## Task 6: Server Functions

Server functions for AI designer: generate tokens, refine via chat, save/load tokens, check usage.

**Files:**
- Create: `src/server/ai-designer.ts`

**Step 1: Create server functions file**

Create `src/server/ai-designer.ts`. This file needs:

### `getAIDesignData` (GET)
- Auth guard with `withAuth()`
- Fetches profile with AI columns + all CMS content (mixes, events, photos, social_links)
- Returns `{ data: { profile, mixes, events, photos, socialLinks } }` or `null` if not authed

### `saveAIDesignTokens` (POST)
- Auth guard
- Input: `{ tokens: AIDesignTokens, chatHistory: AIChatMessage[], lockState: TokenLockState }`
- Validates tokens with `aiDesignTokensSchema.parse()`
- Updates `profiles` table: `ai_design_tokens`, `ai_chat_history`
- Pushes current tokens to `ai_design_history` array (cap at 20 entries)
- Returns `{ data: { saved: true } }`

### `publishAIDesign` (POST)
- Auth guard
- Sets `renderer = 'ai'` on the profile
- Returns `{ data: { published: true } }`

### `unpublishAIDesign` (POST)
- Auth guard
- Sets `renderer = 'template'` on the profile
- Returns `{ data: { unpublished: true } }`

### `checkAIUsage` (GET)
- Auth guard
- Queries `ai_usage` for current month
- Returns `{ data: { used: number, limit: number, remaining: number } }`

### `incrementAIUsage` (POST)
- Auth guard
- Upserts into `ai_usage` with increment
- Returns `{ data: { used: number } }` or `{ error: 'Monthly AI limit reached' }`

**Server function pattern** (from `src/server/profile.ts`):

```typescript
import { createServerFn } from '@tanstack/react-start'
import { withAuth } from '~/utils/supabase-server'
import { aiDesignTokensSchema } from '~/schemas'

const AI_MONTHLY_LIMIT = 200

export const getAIDesignData = createServerFn({ method: 'GET' })
  .handler(async () => {
    const { supabase, user } = await withAuth()
    if (!user) return null

    const [profileRes, mixesRes, eventsRes, photosRes, socialRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('mixes').select('*').eq('user_id', user.id).order('order'),
      supabase.from('events').select('*').eq('user_id', user.id).order('order'),
      supabase.from('press_assets').select('*').eq('user_id', user.id), // photos from press_assets or separate table
      supabase.from('social_links').select('*').eq('user_id', user.id).order('order'),
    ])

    return {
      data: {
        profile: profileRes.data,
        mixes: mixesRes.data || [],
        events: eventsRes.data || [],
        photos: photosRes.data || [],
        socialLinks: socialRes.data || [],
      },
    }
  })

// ... more server functions following the same pattern
```

**NOTE for implementing agent:** Check how photos are actually stored — might be `press_assets` or a dedicated photos table. Read the existing `src/server/` files to find the correct table name and pattern. Follow the exact `withAuth()` + `createServerFn` pattern from existing server files.

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

**Step 3: Commit**

```bash
git add src/server/ai-designer.ts
git commit -m "feat(ai-designer): add server functions for AI design CRUD and usage tracking"
```

---

## Task 7: AI Chat API Route

Create the streaming API endpoint that connects to Vercel AI Gateway / Claude.

**Files:**
- Create: `src/server/ai-chat.ts`

**Step 1: Create the AI chat streaming handler**

This server function handles the chat interaction with Claude. It uses the Vercel AI SDK to stream responses.

```typescript
import { createServerFn } from '@tanstack/react-start'
import { anthropic } from '@ai-sdk/anthropic'
import { streamText, tool } from 'ai'
import { withAuth } from '~/utils/supabase-server'
import { partialAIDesignTokensSchema } from '~/schemas'
import { buildSystemPrompt, summarizeCMSContent } from '~/utils/ai-prompts'
import type { AIDesignTokens, TokenLockState } from '~/schemas/ai-design-tokens'

// NOTE: The Vercel AI Gateway is configured via the base URL in the anthropic provider.
// If using AI Gateway, set ANTHROPIC_BASE_URL env var to the gateway URL.
// Otherwise, set ANTHROPIC_API_KEY for direct Anthropic access.

interface ChatInput {
  message: string
  currentTokens: AIDesignTokens
  lockedTokens: TokenLockState
  profile: Record<string, unknown>
}

export const streamAIDesignChat = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => {
    // Validate shape loosely here — full token validation happens in the prompt builder
    const d = data as ChatInput
    if (!d.message || !d.currentTokens) throw new Error('Invalid input')
    return d
  })
  .handler(async ({ data }) => {
    const { user } = await withAuth()
    if (!user) return { error: 'Not authenticated' }

    const systemPrompt = buildSystemPrompt(
      data.currentTokens,
      data.lockedTokens,
      summarizeCMSContent(data.profile),
    )

    const result = streamText({
      model: anthropic('claude-sonnet-4-20250514'),
      system: systemPrompt,
      messages: [{ role: 'user', content: data.message }],
      tools: {
        updateDesignTokens: tool({
          description: 'Update the design tokens for the EPK page. Only include tokens that changed.',
          parameters: partialAIDesignTokensSchema,
        }),
      },
      maxSteps: 2,
    })

    return result.toDataStreamResponse()
  })
```

**IMPORTANT NOTE for implementing agent:** The Vercel AI SDK streaming with TanStack Start server functions may need a custom integration approach. The `streamText` returns a stream that needs to be forwarded to the client. Research how TanStack Start handles streaming responses — you may need to use `getH3Event()` from `@tanstack/react-start/server` to get the raw H3 event and pipe the stream. Alternatively, you may need to create a Nitro API route at `src/routes/api/ai-chat.ts` instead of a `createServerFn`. Check the Vercel AI SDK docs for TanStack Start / Nitro integration.

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors (or type issues identified for streaming approach).

**Step 3: Commit**

```bash
git add src/server/ai-chat.ts
git commit -m "feat(ai-designer): add AI chat streaming server function"
```

---

## Task 8: Token Merge Utility

Client-side utility for merging partial token updates while respecting locks.

**Files:**
- Create: `src/utils/ai-token-merge.ts`

**Step 1: Create the merge utility**

```typescript
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
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

**Step 3: Commit**

```bash
git add src/utils/ai-token-merge.ts
git commit -m "feat(ai-designer): add token merge and diff utilities"
```

---

## Task 9: AI Renderer — Core Provider + Section Components

Build the new rendering pipeline: the AIRenderer provider that injects CSS variables, and all 6 section components with their variants.

**Files:**
- Create: `src/components/ai-renderer/AIRenderer.tsx`
- Create: `src/components/ai-renderer/AITokenProvider.tsx`
- Create: `src/components/ai-renderer/sections/AIHero.tsx`
- Create: `src/components/ai-renderer/sections/AIBio.tsx`
- Create: `src/components/ai-renderer/sections/AIMusic.tsx`
- Create: `src/components/ai-renderer/sections/AIEvents.tsx`
- Create: `src/components/ai-renderer/sections/AIPhotos.tsx`
- Create: `src/components/ai-renderer/sections/AIContact.tsx`
- Create: `src/components/ai-renderer/sections/AINav.tsx`
- Create: `src/components/ai-renderer/sections/AIFooter.tsx`
- Create: `src/components/ai-renderer/sections/index.ts`

This is a large task. Break it into sub-steps:

### Step 1: Create AITokenProvider

`src/components/ai-renderer/AITokenProvider.tsx`:

This React context provider:
- Takes `AIDesignTokens` as a prop
- Converts tokens to CSS custom properties and injects them via `style` on a wrapper div
- Generates a `<link>` tag for Google Font imports
- Provides tokens via React context for child components

```typescript
import { createContext, useContext, useMemo } from 'react'
import type { AIDesignTokens } from '~/schemas/ai-design-tokens'

const AITokenContext = createContext<AIDesignTokens | null>(null)

export function useAITokens(): AIDesignTokens {
  const ctx = useContext(AITokenContext)
  if (!ctx) throw new Error('useAITokens must be used within AITokenProvider')
  return ctx
}

export function AITokenProvider({ tokens, children }: { tokens: AIDesignTokens; children: React.ReactNode }) {
  const cssVars = useMemo(() => tokensToCSSVars(tokens), [tokens])
  const fontUrl = useMemo(() => buildGoogleFontsUrl(tokens.fontImports), [tokens.fontImports])

  return (
    <AITokenContext.Provider value={tokens}>
      {fontUrl && <link rel="stylesheet" href={fontUrl} />}
      <div style={cssVars}>
        {children}
      </div>
    </AITokenContext.Provider>
  )
}
```

The `tokensToCSSVars` function converts the token object into a flat CSS variable map:
- `--ai-color-primary`, `--ai-color-accent`, etc.
- `--ai-font-display`, `--ai-font-body`, etc.
- `--ai-spacing-xs`, `--ai-spacing-md`, etc.

### Step 2: Create AIRenderer orchestrator

`src/components/ai-renderer/AIRenderer.tsx`:

Reads `layout.sectionOrder` and `layout.sectionVisibility` from tokens and renders sections in order. Wraps everything in `AITokenProvider`.

### Step 3: Create section components

Each section component (AIHero, AIBio, AIMusic, AIEvents, AIPhotos, AIContact) should:
- Accept its CMS data as props (e.g., AIMusic receives the `mixes` array)
- Read its section-specific tokens via `useAITokens()`
- Render the correct variant based on `tokens.sections.<section>.variant`
- Apply section-level overrides (background, textColor, padding)
- Use CSS variables from the provider for consistent theming

**Start with simple implementations** — each variant should have a basic but complete layout. These can be enhanced later. Focus on getting the structure right with correct token application.

For example, AIHero `fullscreen` variant:
```tsx
function HeroFullscreen({ profile, tokens }: { profile: Profile; tokens: AIDesignTokens }) {
  const heroTokens = tokens.sections.hero
  return (
    <section
      className="relative min-h-screen flex items-center justify-center"
      style={{
        background: heroTokens.background || `var(--ai-color-background)`,
        color: heroTokens.textColor || `var(--ai-color-heading)`,
      }}
    >
      {profile.hero_image_url && (
        <img src={profile.hero_image_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
      )}
      <div
        className="absolute inset-0"
        style={{ background: `rgba(0,0,0,${heroTokens.overlayOpacity ?? 0.5})` }}
      />
      <div className="relative z-10 text-center" style={{ textAlign: heroTokens.titleAlignment || 'center' }}>
        <h1 style={{ fontFamily: `var(--ai-font-display)`, fontSize: `var(--ai-size-display)` }}>
          {profile.display_name}
        </h1>
        {heroTokens.showGenres && profile.genres?.length > 0 && (
          <p style={{ fontFamily: `var(--ai-font-caption)` }}>{profile.genres.join(' / ')}</p>
        )}
      </div>
    </section>
  )
}
```

### Step 4: Create AINav and AIFooter

Simple navigation and footer that read from tokens.

### Step 5: Create barrel export

`src/components/ai-renderer/sections/index.ts`:
```typescript
export { AIHero } from './AIHero'
export { AIBio } from './AIBio'
// ... etc
```

### Step 6: Verify TypeScript compiles

Run: `npx tsc --noEmit`
Expected: No errors.

### Step 7: Commit

```bash
git add src/components/ai-renderer/
git commit -m "feat(ai-designer): add AI renderer with token provider and 6 section components"
```

---

## Task 10: Integrate AI Renderer into Public Page

Branch the `$slug.tsx` loader and component to support the AI renderer.

**Files:**
- Modify: `src/routes/$slug.tsx`

**Step 1: Read the current `$slug.tsx`**

Read `src/routes/$slug.tsx` in full to understand the current structure before modifying.

**Step 2: Add AI renderer branch**

In the `$slug.tsx` component function, add a branch:

```typescript
import { AIRenderer } from '~/components/ai-renderer/AIRenderer'

function PublicProfile() {
  const { profile, mixes, events, photos, ... } = Route.useLoaderData()

  // AI renderer branch
  if (profile?.renderer === 'ai' && profile?.ai_design_tokens) {
    return (
      <AIRenderer
        tokens={profile.ai_design_tokens}
        content={{ profile, mixes, events, photos, socialLinks }}
      />
    )
  }

  // Existing template renderer continues below...
  // (all existing code unchanged)
}
```

In the loader, ensure `ai_design_tokens` and `renderer` are included in the profile data. The existing `getPublicProfile` server function already fetches `*` from profiles, so these new columns should be included automatically.

**Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

**Step 4: Test manually**

Run: `npm run dev`
Visit a profile page. With `renderer = 'template'` (default), existing behavior should be unchanged.

**Step 5: Commit**

```bash
git add src/routes/$slug.tsx
git commit -m "feat(ai-designer): integrate AI renderer branch into public EPK page"
```

---

## Task 11: Wizard Component

Build the guided wizard UI.

**Files:**
- Create: `src/components/ai-designer/Wizard.tsx`

**Step 1: Build the wizard component**

The wizard is a multi-step component with 4 visible steps (step 5 = transition to chat):

```typescript
interface WizardProps {
  onComplete: (tokens: AIDesignTokens, lockState: TokenLockState) => void
  profile: Record<string, unknown>
}
```

**Step 1 (Vibe Selection):** Grid of 8 cards, each showing the vibe name + description + a color swatch preview. Clicking selects the vibe. Uses `VIBE_PRESETS` from `src/utils/ai-vibe-presets.ts`.

**Step 2 (Colors):** Shows the selected vibe's color palette. 3 color pickers for primary/accent/background. "Let AI decide" button to skip. Use native `<input type="color">` for simplicity.

**Step 3 (Typography):** Shows 4-6 font pairing options based on the vibe. Each option shows a preview of the display + body font. "Let AI decide" to skip.

**Step 4 (Generate):** Loading state while AI generates. Shows preview after generation.

Use CSS from `src/components/forms/styles.ts` for consistent styling (BTN_PRIMARY, CARD_SECTION, etc.).

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`

**Step 3: Commit**

```bash
git add src/components/ai-designer/Wizard.tsx
git commit -m "feat(ai-designer): add guided wizard component with vibe/color/font steps"
```

---

## Task 12: Chat Panel Component

Build the chat interface with streaming support.

**Files:**
- Create: `src/components/ai-designer/ChatPanel.tsx`

**Step 1: Build the chat panel**

```typescript
interface ChatPanelProps {
  tokens: AIDesignTokens
  lockState: TokenLockState
  onTokensUpdate: (newTokens: AIDesignTokens, changes: PartialAIDesignTokens) => void
  profile: Record<string, unknown>
  usage: { used: number; limit: number }
}
```

Features:
- Message list (scrollable, auto-scroll to bottom)
- Input field with send button (disabled when streaming or limit reached)
- Streaming responses with typing indicator
- After each AI response, show a token diff summary (e.g., "Changed: colors.accent, sections.hero.variant")
- Quick action buttons above the input: "Randomize colors", "Try different layout", "Make it darker", "Make it lighter"
- Usage indicator: "42 / 200 messages used this month"

Use the Vercel AI SDK `useChat` hook for streaming. If `useChat` doesn't work with TanStack Start server functions, use a manual fetch + ReadableStream approach.

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`

**Step 3: Commit**

```bash
git add src/components/ai-designer/ChatPanel.tsx
git commit -m "feat(ai-designer): add chat panel component with streaming and token diffs"
```

---

## Task 13: Token Inspector Component

Build the collapsible token inspector panel.

**Files:**
- Create: `src/components/ai-designer/TokenInspector.tsx`

**Step 1: Build the token inspector**

```typescript
interface TokenInspectorProps {
  tokens: AIDesignTokens
  lockState: TokenLockState
  onToggleLock: (path: string) => void
}
```

Features:
- Collapsible panel (toggle button)
- Grouped by token category (Colors, Typography, Layout, Sections, Decorative)
- Each token shows: path, current value, lock icon (toggle)
- Color tokens show a color swatch
- Locked tokens show a lock icon, generated tokens show a robot/AI icon
- Clicking a token value allows inline editing (sets to locked state)

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`

**Step 3: Commit**

```bash
git add src/components/ai-designer/TokenInspector.tsx
git commit -m "feat(ai-designer): add token inspector component with lock/unlock toggles"
```

---

## Task 14: Dashboard Route — AI Designer Page

Wire everything together into the dashboard route.

**Files:**
- Create: `src/routes/_dashboard/dashboard.ai-designer.tsx`
- Modify: `src/components/DashboardSidebar.tsx` (add nav item)

**Step 1: Create the dashboard route**

`src/routes/_dashboard/dashboard.ai-designer.tsx`:

```typescript
import { createFileRoute } from '@tanstack/react-router'
import { getAIDesignData, checkAIUsage, saveAIDesignTokens } from '~/server/ai-designer'

export const Route = createFileRoute('/_dashboard/dashboard/ai-designer')({
  loader: async () => {
    const [designData, usage] = await Promise.all([
      getAIDesignData(),
      checkAIUsage(),
    ])
    return { designData, usage }
  },
  component: AIDesignerPage,
})

function AIDesignerPage() {
  const { designData, usage } = Route.useLoaderData()

  // State management:
  // - tokens: AIDesignTokens (current working state)
  // - lockState: TokenLockState
  // - chatHistory: AIChatMessage[]
  // - wizardComplete: boolean (show wizard vs chat)
  // - undoStack / redoStack for undo/redo

  // If no AI tokens exist yet, show wizard
  // After wizard completes, show chat + preview layout

  // Preview iframe pointing to /$slug?preview=true
  // PostMessage to iframe on token changes

  // Save button persists to database via saveAIDesignTokens
  // Publish/Unpublish toggles renderer mode
}
```

The page has two modes:
1. **Wizard mode** — if no `ai_design_tokens` exist on profile
2. **Editor mode** — split layout with chat panel (40%) + preview iframe (60%) + token inspector (collapsible bottom)

**Pro tier gate:** If user is on free tier, show an upgrade prompt instead of the wizard. Check `profile.tier === 'pro'`.

**Step 2: Add nav item to sidebar**

In `src/components/DashboardSidebar.tsx`, add to `NAV_ITEMS` array:

```typescript
{ label: 'AI Designer', href: '/dashboard/ai-designer' },
```

Add it after the 'Theme' entry (since they're related).

**Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`

**Step 4: Run dev server and test manually**

Run: `npm run dev`
- Navigate to `/dashboard/ai-designer`
- Verify the page loads (even if placeholder content)
- Verify sidebar shows the new link with active state

**Step 5: Commit**

```bash
git add src/routes/_dashboard/dashboard.ai-designer.tsx src/components/DashboardSidebar.tsx
git commit -m "feat(ai-designer): add dashboard route and sidebar navigation"
```

---

## Task 15: Preview Integration

Wire the live preview iframe to update when tokens change.

**Files:**
- Modify: `src/routes/_dashboard/dashboard.ai-designer.tsx`
- Modify: `src/routes/$slug.tsx` (extend PostMessage handler for AI tokens)

**Step 1: Add PostMessage sender to dashboard page**

In the AI designer dashboard page, when tokens change:

```typescript
const iframeRef = useRef<HTMLIFrameElement>(null)

function sendTokensToPreview(tokens: AIDesignTokens) {
  iframeRef.current?.contentWindow?.postMessage(
    { type: 'ai-tokens-update', tokens },
    '*',
  )
}

// Call sendTokensToPreview whenever tokens state changes
useEffect(() => {
  sendTokensToPreview(tokens)
}, [tokens])
```

**Step 2: Add PostMessage listener to $slug.tsx**

In `$slug.tsx`, extend the existing preview PostMessage handler to also listen for AI token updates:

```typescript
// Inside the existing preview useEffect:
if (e.data?.type === 'ai-tokens-update' && e.data.tokens) {
  setPreviewAITokens(e.data.tokens)
}
```

When `previewAITokens` is set, render the AIRenderer with those tokens instead of the template.

**Step 3: Verify with dev server**

Run: `npm run dev`
- Open AI designer in dashboard
- Verify the preview iframe shows the EPK
- Verify token changes update the preview in real-time

**Step 4: Commit**

```bash
git add src/routes/_dashboard/dashboard.ai-designer.tsx src/routes/$slug.tsx
git commit -m "feat(ai-designer): add live preview via PostMessage for AI tokens"
```

---

## Task 16: Undo/Redo System

Add undo/redo for token changes.

**Files:**
- Create: `src/hooks/useTokenHistory.ts`

**Step 1: Create the history hook**

```typescript
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

  return {
    tokens,
    setTokens,
    undo,
    redo,
    canUndo: undoStack.length > 0,
    canRedo: redoStack.length > 0,
  }
}
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`

**Step 3: Commit**

```bash
git add src/hooks/useTokenHistory.ts
git commit -m "feat(ai-designer): add undo/redo hook for token history"
```

---

## Task 17: Environment Variables & Configuration

Set up the required environment variables for the Vercel AI Gateway / Anthropic connection.

**Files:**
- Modify: `.env.local` (or `.env`)

**Step 1: Add environment variables**

Add to `.env.local`:

```
# AI Designer - Vercel AI Gateway / Anthropic
# For direct Anthropic access:
ANTHROPIC_API_KEY=sk-ant-...

# For Vercel AI Gateway (optional, overrides direct):
# ANTHROPIC_BASE_URL=https://gateway.ai.vercel.sh/v1
```

These are server-only variables (no `VITE_` prefix), accessed via `process.env` in Nitro server context. The `@ai-sdk/anthropic` package reads `ANTHROPIC_API_KEY` automatically.

**Step 2: Verify the AI SDK can initialize**

Add a temporary test in a server function or run a quick node script to verify the Anthropic provider initializes without errors.

**Step 3: Commit** (do NOT commit .env files)

No commit needed — `.env.local` should be in `.gitignore`.

---

## Task 18: End-to-End Integration Testing

Test the full flow manually: wizard → generate → chat → save → preview → publish.

**Step 1: Start dev server**

Run: `npm run dev`

**Step 2: Test wizard flow**
- Navigate to `/dashboard/ai-designer`
- Select a vibe
- Optionally pick colors / fonts
- Click "Generate" — verify AI returns tokens and preview updates

**Step 3: Test chat refinement**
- Type "Make the hero section more dramatic"
- Verify streaming response
- Verify token diff shown
- Verify preview updates

**Step 4: Test save/publish**
- Click Save — verify tokens persist to database
- Click Publish — verify public page renders with AI renderer
- Visit the public URL — verify it uses the AI renderer

**Step 5: Test undo/redo**
- Make several changes via chat
- Click Undo — verify previous state restores
- Click Redo — verify forward state restores

**Step 6: Test rate limiting**
- Verify usage counter increments
- Verify approaching limit shows warning

**Step 7: Commit any fixes**

```bash
git add -A
git commit -m "fix(ai-designer): address issues found in integration testing"
```

---

## Dependency Graph

```
Task 1 (DB Migration) ─────────────────────────────────────┐
Task 2 (Install AI SDK) ───────────────────────────────────┤
Task 3 (Token Schema) ──┬──────────────────────────────────┤
                         │                                  │
Task 4 (Vibe Presets) ───┤                                  │
Task 5 (AI Prompts) ─────┤                                  │
Task 8 (Token Merge) ────┤                                  │
                         │                                  │
Task 6 (Server Fns) ─────┼── depends on: 1, 3              │
Task 7 (AI Chat) ────────┼── depends on: 2, 3, 5           │
                         │                                  │
Task 9 (AI Renderer) ────┼── depends on: 3                 │
Task 10 (Public Page) ───┼── depends on: 9                 │
                         │                                  │
Task 11 (Wizard) ────────┼── depends on: 4                 │
Task 12 (Chat Panel) ────┼── depends on: 7, 8              │
Task 13 (Token Inspector)┼── depends on: 3                 │
                         │                                  │
Task 14 (Dashboard Route)┼── depends on: 6, 11, 12, 13    │
Task 15 (Preview) ───────┼── depends on: 9, 14             │
Task 16 (Undo/Redo) ─────┼── depends on: 3                 │
                         │                                  │
Task 17 (Env Vars) ──────┼── depends on: 2                 │
Task 18 (E2E Testing) ───┘── depends on: ALL               │
```

## Parallelizable Groups

These tasks can be worked on in parallel within each group:

**Group A (foundations, no deps):** Tasks 1, 2, 3
**Group B (utilities, depends on A):** Tasks 4, 5, 8, 16
**Group C (server + renderer, depends on A):** Tasks 6, 7, 9
**Group D (UI components, depends on B+C):** Tasks 11, 12, 13
**Group E (integration, depends on D):** Tasks 10, 14, 15, 17
**Group F (testing):** Task 18
