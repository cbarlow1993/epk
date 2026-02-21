# AI Designer — Design Document

**Date:** 2026-02-21
**Status:** Approved

## Overview

An AI-powered design tool that lets DJs generate and refine custom EPK page designs through a guided wizard and chat interface. The AI produces extended design tokens that a dedicated renderer interprets to build the public EPK page. Users lock the properties they care about (colors, fonts, etc.) and let AI fill in the rest. Content always comes from the existing CMS.

## Requirements

- **Design system:** Extended design tokens + layout DSL (~150+ properties)
- **Content source:** Always pulled from CMS (bio, events, mixes, photos, etc.)
- **Interaction model:** Guided wizard establishes baseline, chat refines
- **AI provider:** Claude via Vercel AI Gateway
- **Billing:** Bundled with pro tier, monthly usage cap (no separate credit system)
- **Rendering:** Separate AI renderer coexists alongside current template-based renderer
- **Preview:** Live preview using existing PostMessage/iframe architecture

## Architecture: Extended Design Token Schema

### Token Categories

#### 1. Global Tokens (page-wide)

- **Color palette:** `primary`, `secondary`, `accent`, `background`, `surface`, `text`, `textMuted`, `heading`, `link`, `border`, `error`, `success`
- **Gradient definitions:** Array of `{ type, angle, stops[] }` for reusable gradients
- **Typography scales:** `display`, `h1`–`h4`, `body`, `small`, `caption` — each with `fontFamily`, `fontSize`, `fontWeight`, `lineHeight`, `letterSpacing`, `textTransform`
- **Font imports:** Array of Google Font names to load
- **Spacing scale:** `xs`, `sm`, `md`, `lg`, `xl`, `2xl` mapped to rem values
- **Border radii:** `none`, `sm`, `md`, `lg`, `full` mapped to values
- **Shadows:** `none`, `sm`, `md`, `lg`, `xl` mapped to box-shadow values
- **Animations:** Section entrance animation (`fade`, `slide-up`, `scale`, `none`), duration, easing

#### 2. Layout Tokens (page structure)

- `contentWidth`: Max-width for content area
- `sectionPadding`: Vertical padding between sections
- `sectionOrder`: Ordered array of section keys
- `sectionVisibility`: Which sections to show/hide
- `navStyle`: `fixed`, `static`, `hidden`
- `footerStyle`: `minimal`, `detailed`, `hidden`

#### 3. Section-Specific Tokens (per section overrides)

Each section (hero, bio, music, events, photos, contact) gets its own token group:

- `variant`: Section layout variant (e.g., hero: `fullscreen`, `split`, `minimal`, `video-bg`)
- `background`: Override — color, gradient reference, or image URL
- `textColor`: Override for this section
- `padding`: Override spacing
- Section-specific layout options (e.g., events: `timeline`/`grid`/`list`; music: `cards`/`list`/`player`)

#### 4. Decorative Tokens

- `dividerStyle`: Between sections — `none`, `line`, `gradient`, `wave`, `diagonal`, `dots`
- `backgroundPattern`: Subtle pattern overlay — `none`, `dots`, `grid`, `noise`, `topography`
- `accentElements`: Decorative elements — glows, blurs, geometric shapes
- `cursorStyle`, `scrollbarStyle`: Micro-interactions

### Lock & Generate Model

Each token has three states:

- **Locked** — User explicitly set this value, AI must respect it
- **Generated** — AI produced this value, user can override
- **Default** — Neither set, falls back to renderer defaults

When the user runs the wizard or chats, the AI receives locked tokens as constraints and returns a complete token object. Only non-locked tokens get updated.

## Guided Wizard Flow

### Step 1: "What's your vibe?"

Present 8–12 mood/aesthetic cards with visual previews: `dark & moody`, `clean & minimal`, `neon & electric`, `warm & organic`, `retro & vintage`, `bold & graphic`, `ethereal & ambient`, `raw & underground`. Each maps to a starter token preset. Deterministic — no AI credits used.

### Step 2: "Pick your colors" (optional, skippable)

Show the vibe's default palette with option to override via color picker. "Let AI decide" option to skip. Selected colors become locked tokens.

### Step 3: "Choose your typography" (optional, skippable)

4–6 font pairing suggestions based on the vibe. "Let AI decide" option. Selected fonts become locked tokens.

### Step 4: "Generate your EPK"

AI takes locked tokens + vibe preset + CMS content summary. Generates complete token set. Shows full-page live preview. First AI credit consumption.

### Step 5: "Refine with chat"

Transitions into chat interface with preview. User can say things like "make the hero section more dramatic" or "I want a timeline layout for events."

## Chat Interface

### Layout

```
┌─────────────────────────────────────────────────┐
│  Dashboard Header: "AI Designer"    [Save] [↻]  │
├──────────────────────┬──────────────────────────┤
│   Chat Panel (40%)   │   Live Preview (60%)     │
│                      │   (iframe)               │
│   Message history    │                          │
│   with streaming     │   Renders with current   │
│                      │   design tokens          │
│   Token diffs after  │                          │
│   each AI response   │                          │
│                      │                          │
│   [Type message...]  │                          │
├──────────────────────┴──────────────────────────┤
│  Token Inspector (collapsible bottom panel)     │
│  [🔒 primary: #ff0066] [🤖 bg: #0a0a0a] ...    │
└─────────────────────────────────────────────────┘
```

### Features

- **Streaming responses** via Vercel AI SDK `useChat` hook
- **Token diffs** — show what tokens changed after each AI response
- **Undo/redo** — each AI generation creates a snapshot; user can step back
- **Token inspector** — collapsible panel with lock/unlock toggles per token
- **Quick actions** — preset buttons: "Randomize colors", "Try a different layout", "Make it darker"

## AI Integration Architecture

### Request Flow

```
User message
  → TanStack Server Function (auth + rate limit check)
  → Vercel AI Gateway → Claude (streaming)
  → Returns: { message: string, tokens: Partial<DesignTokens> }
  → Client merges tokens (respecting locks)
  → PostMessage to preview iframe → re-renders
```

### System Prompt Includes

1. Full design token schema (what AI can set)
2. Current locked tokens (constraints)
3. Current generated tokens (context)
4. CMS content summary (what sections have data)
5. Conversation history

### AI Response Format

Structured output — a message explaining what it did + a partial token object with only changed values. Uses Vercel AI SDK's `generateObject` or tool-call pattern.

### Rate Limiting

- Monthly cap (e.g., 200 AI messages/month) for pro tier
- Tracked via `ai_usage` table: `user_id`, `month`, `message_count`
- Server function checks before forwarding to AI
- Remaining usage shown in chat UI header

## AI Renderer

### Routing

The current `$slug.tsx` branches based on a flag:

- `profile.renderer === 'ai'` → load AI tokens, render with AIRenderer
- `profile.renderer === 'template'` → existing `resolveTheme()` path

### Component Structure

```tsx
<AIRenderer tokens={tokens} content={cmsContent}>
  <AINav />
  <AIHero variant={tokens.sections.hero.variant} />
  <AIBio variant={tokens.sections.bio.variant} />
  <AIMusic variant={tokens.sections.music.variant} />
  <AIEvents variant={tokens.sections.events.variant} />
  <AIPhotos variant={tokens.sections.photos.variant} />
  <AIContact variant={tokens.sections.contact.variant} />
  <AIFooter />
</AIRenderer>
```

### Section Variants

**AIHero:** `fullscreen`, `split`, `minimal`, `video-bg`, `parallax`
**AIMusic:** `cards`, `list`, `waveform`, `featured`
**AIEvents:** `timeline`, `grid`, `list`, `calendar`
**AIPhotos:** `masonry`, `grid`, `carousel`, `lightbox`
**AIBio:** `centered`, `split-image`, `full-width`, `sidebar`
**AIContact:** `form`, `minimal`, `card`, `split`

### Token Application

`<AIRenderer>` wraps everything in a provider that:

1. Injects CSS custom properties from tokens (`--color-primary`, `--font-display`, etc.)
2. Loads Google Fonts from the token font list
3. Applies global background, patterns, and decorative elements
4. Sets section order and visibility

## Database Changes

```sql
-- On profiles table
ALTER TABLE profiles ADD COLUMN renderer text DEFAULT 'template'
  CHECK (renderer IN ('template', 'ai'));
ALTER TABLE profiles ADD COLUMN ai_design_tokens jsonb;
ALTER TABLE profiles ADD COLUMN ai_design_history jsonb DEFAULT '[]';
ALTER TABLE profiles ADD COLUMN ai_chat_history jsonb DEFAULT '[]';

-- Usage tracking
CREATE TABLE ai_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  month text NOT NULL,
  message_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, month)
);
ALTER TABLE ai_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own usage" ON ai_usage
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can update own usage" ON ai_usage
  FOR ALL USING (user_id = auth.uid());
```

## New Files

| File | Purpose |
|------|---------|
| `src/schemas/ai-design-tokens.ts` | Zod schema for the full token schema |
| `src/server/ai-designer.ts` | Server functions: generate, refine, save, load |
| `src/routes/_dashboard/ai-designer.tsx` | Dashboard route: wizard + chat UI |
| `src/components/ai-renderer/AIRenderer.tsx` | Top-level renderer with CSS variable injection |
| `src/components/ai-renderer/sections/` | AIHero, AIBio, AIMusic, AIEvents, AIPhotos, AIContact |
| `src/components/ai-designer/ChatPanel.tsx` | Chat UI with streaming |
| `src/components/ai-designer/Wizard.tsx` | Guided wizard steps |
| `src/components/ai-designer/TokenInspector.tsx` | Token lock/unlock panel |
| `src/utils/ai-prompts.ts` | System prompt builder for Claude |
| `supabase/migrations/XXXX_ai_design.sql` | Migration for new columns + table |

## Technical Choices

- **Vercel AI SDK** `useChat` for streaming, `generateObject` for structured token output
- **PostMessage** to preview iframe (reuses existing pattern)
- **JSONB storage** for tokens — flexible schema evolution without migrations
- **Zod validation** on client and server for token integrity
- **CSR for AI-designer page** — complex interactive UI, SSR unnecessary for dashboard
- **Rate limiting** checked server-side before AI calls, enforced per calendar month

## Out of Scope (V1)

- Image generation (hero images, backgrounds)
- Multi-page EPKs
- Collaborative editing
- A/B testing different designs
- Export to external formats (PDF, etc.)
