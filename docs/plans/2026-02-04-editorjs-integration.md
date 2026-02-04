# Editor.js Integration Plan

Replace TiptapEditor with Editor.js across the platform. Editor.js provides a block-based editing experience with native support for media, embeds, columns, and structured content — outputting clean JSON instead of HTML.

## Architecture Overview

Replace `TiptapEditor` with a new `BlockEditor` component wrapping Editor.js. The component accepts/emits Editor.js `OutputData` (JSON) instead of HTML strings, integrates with react-hook-form via `Controller`, and loads plugins for all supported block types.

**Data flow:**

1. User edits content in BlockEditor → produces `OutputData` JSON
2. Form submission sends JSON to server function
3. Server stores JSON in JSONB column in Postgres
4. Public EPK page reads JSON and renders via a `BlockRenderer` React component using structured JSON (not raw HTML injection)

**Database changes:**

- Merge `bio_left` + `bio_right` into a single `bio` column (JSONB)
- Change `preferred_setup`, `alternative_setup` from `text` to `jsonb`

File uploads (images, PDFs) go to the existing Supabase Storage bucket.

## Editor Component & Plugins

### Dependencies

**Add:**

- `@editorjs/editorjs`
- `@editorjs/header`
- `@editorjs/list`
- `@editorjs/quote`
- `@editorjs/delimiter`
- `@editorjs/image`
- `@editorjs/embed`
- `@editorjs/attaches`
- `@editorjs/table`
- `editorjs-layout` (columns)

**Remove:**

- `@tiptap/react`
- `@tiptap/starter-kit`
- `@tiptap/extension-link`
- `@tiptap/extension-placeholder`

### BlockEditor Component

**File:** `src/components/forms/BlockEditor.tsx`

```tsx
interface BlockEditorProps {
  label: string
  data: OutputData | null
  onChange: (data: OutputData) => void
  placeholder?: string
}
```

- Creates Editor.js instance on mount with all plugins configured
- Image plugin uses a custom `uploader` that POSTs to `/api/upload` → uploads to Supabase Storage → returns the public URL
- Attaches plugin uses the same upload endpoint for PDFs/documents
- Embed plugin configured to allow YouTube, SoundCloud, Mixcloud
- `onChange` fires via Editor.js's built-in `onChange` callback
- Handles external data changes (form reset) by calling `editor.render(data)`

**Form integration:**

```tsx
<Controller
  name="bio"
  control={control}
  render={({ field }) => (
    <BlockEditor
      label="Bio"
      data={field.value}
      onChange={field.onChange}
    />
  )}
/>
```

## Block Renderer

**File:** `src/components/BlockRenderer.tsx`

```tsx
interface BlockRendererProps {
  data: OutputData | null
  className?: string
}
```

Replaces raw HTML rendering on the public EPK page. Maps each block to a React element:

| Block type  | Renders as                                            |
| ----------- | ----------------------------------------------------- |
| `paragraph` | `<p>` with inline HTML sanitized (bold, italic, links)|
| `header`    | `<h2>` or `<h3>` based on level                      |
| `list`      | `<ul>` or `<ol>` with `<li>` children                |
| `quote`     | `<blockquote>` with optional caption                  |
| `delimiter` | `<hr>`                                                |
| `image`     | `<figure>` with `<img>` + optional `<figcaption>`    |
| `embed`     | Sandboxed `<iframe>` (YouTube/SoundCloud/Mixcloud)    |
| `attaches`  | Download link with file name and size                 |
| `table`     | `<table>` with rows/cells                             |
| `columns`   | CSS grid/flexbox layout wrapping child blocks         |

Unknown block types are skipped silently.

**Security:** Inline HTML within paragraph/list blocks still gets run through `sanitize()` with the existing allowlist. The structured JSON model reduces the attack surface compared to raw HTML storage.

**Usage on `$slug.tsx`** changes from raw HTML injection to:

```tsx
<BlockRenderer data={profile.bio} className={proseClass} />
```

## File Upload API Route

**File:** `src/routes/api/upload.ts`

Uses TanStack Start's `createAPIFileRoute` to handle POST requests from Editor.js plugins.

**Image plugin response shape:**

```json
{
  "success": 1,
  "file": { "url": "https://...supabase.co/storage/v1/..." }
}
```

**Attaches plugin response shape:**

```json
{
  "success": 1,
  "file": {
    "url": "https://...supabase.co/storage/v1/...",
    "name": "stage-plot.pdf",
    "size": 204800
  }
}
```

**Validation:**

- Images: max 5MB, allowed types `image/jpeg`, `image/png`, `image/webp`
- Attachments: max 10MB, allowed types `application/pdf`
- Files stored under `{user_id}/editor/{timestamp}-{filename}` in the existing Supabase Storage bucket
- Auth required — reject if no session

## Schema & Database Changes

### Zod Schema

Shared Editor.js data schema (e.g. `src/schemas/editorData.ts`):

```ts
const editorBlock = z.object({
  id: z.string().optional(),
  type: z.string(),
  data: z.record(z.unknown()),
})

const editorData = z.object({
  time: z.number().optional(),
  blocks: z.array(editorBlock),
  version: z.string().optional(),
}).nullable()
```

Profile schema: `bio_left` + `bio_right` replaced by single `bio` field using `editorData`.
Technical rider schema: `preferred_setup` and `alternative_setup` use `editorData`.

### Database Migration

Edit existing migration files directly (greenfield — no production data), then `supabase db reset --linked`:

- `profiles`: drop `bio_left`, drop `bio_right`, add `bio jsonb`
- `technical_riders`: change `preferred_setup` and `alternative_setup` from `text` to `jsonb`

## File Change Summary

### New files

- `src/components/forms/BlockEditor.tsx` — Editor.js wrapper component
- `src/components/BlockRenderer.tsx` — JSON-to-React renderer for public pages
- `src/routes/api/upload.ts` — file upload API route
- `src/schemas/editorData.ts` — shared Zod schema for Editor.js data

### Modified files

- `src/routes/_dashboard/dashboard.bio.tsx` — single BlockEditor replaces two TiptapEditors
- `src/routes/_dashboard/dashboard.technical.tsx` — swap TiptapEditor for BlockEditor
- `src/routes/$slug.tsx` — swap raw HTML rendering for BlockRenderer
- `src/schemas/profile.ts` — `bio_left`/`bio_right` → `bio` using `editorData`
- `src/schemas/technical.ts` (or equivalent) — setup fields use `editorData`
- `src/server/` — update server functions to handle JSONB instead of text
- `src/components/forms/index.ts` — export BlockEditor, remove TiptapEditor export
- `supabase/migrations/` — column type changes

### Deleted files

- `src/components/forms/TiptapEditor.tsx`
