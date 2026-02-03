# DJ EPK Platform - Claude Code Guidelines

## Project Overview

Multi-tenant DJ Electronic Press Kit SaaS. TanStack Start (SSR on Nitro/Vite) + Supabase (Postgres, Auth, Storage, RLS) + Tailwind CSS v4 + Stripe.

## Tech Stack

- **Framework:** TanStack Start (file-based routing via `@tanstack/react-router`)
- **Database:** Supabase (Postgres + RLS + Auth + Storage)
- **Styling:** Tailwind CSS v4 (no tailwind.config — uses `@theme` in CSS)
- **Forms:** react-hook-form + @hookform/resolvers/zod
- **Validation:** Zod (shared schemas for client + server)
- **Payments:** Stripe
- **Language:** TypeScript (strict)

## Critical Rules

### Environment Variables
- `VITE_` prefixed vars MUST use `import.meta.env.VITE_*` everywhere (client AND server functions compiled by Vite)
- `process.env.*` is ONLY available for non-VITE vars in true Node.js server contexts (Nitro middleware, webhook routes)
- NEVER use `process.env.VITE_*` — it will be `undefined` at runtime

### Supabase Client
- `getSupabaseServerClient()` takes NO parameters — uses TanStack Start cookie utilities internally
- `getSupabaseAdmin()` is for server-only operations that bypass RLS — prefer `getSupabaseServerClient()` unless RLS must be bypassed
- Auth cookies: `setCookie`/`getCookies`/`deleteCookie` from `@tanstack/react-start/server` use `getH3Event()` internally

### TanStack Router
- Dot notation in filenames = route nesting: `dashboard.bio.tsx` is a CHILD of `dashboard.tsx`
- Layout routes render `<Outlet />` — do NOT put page content in a layout route
- Index routes use `dashboard.index.tsx` for the `/dashboard` page content
- Use `isRedirect(e)` from `@tanstack/react-router` to detect redirects in catch blocks — NOT `instanceof Error`
- After auth state changes (login/logout), use `window.location.href` for navigation, NOT `navigate()` — ensures cookies are sent

## Code Patterns

### Server Functions — Auth Guard
Use the `requireAuth()` helper (when created) or this 3-line pattern:
```ts
const supabase = getSupabaseServerClient()
const { data: { user } } = await supabase.auth.getUser()
if (!user) return { error: 'Not authenticated' }
```
GET handlers return `null` or `[]` on auth failure. POST handlers return `{ error: string }`.

### Server Functions — Return Types
- Success: `{ data: T }` (use `data` as the universal key)
- Error: `{ error: string }`
- Never mix different key names for the success payload

### Server Functions — Input Validation
ALWAYS use Zod schema `.parse()` in `.inputValidator()`:
```ts
.inputValidator((data: unknown) => mySchema.parse(data))
```
NEVER use TypeScript-only type annotations as validation — they provide zero runtime safety.

### Form Pages — Save Button Pattern
All dashboard form pages use this pattern:
```ts
const [saving, setSaving] = useState(false)
const [saved, setSaved] = useState(false)
const [error, setError] = useState('')
```
With a `<DashboardHeader>` component for the title + save button + status indicators.

### Form Pages — react-hook-form
- Use `zodResolver(schema)` for all forms
- Use `isDirty` from `formState` to disable Save when no changes
- Use `setValue(field, value, { shouldDirty: true })` for programmatic updates

### Tailwind Classes — Shared Constants
Use the shared form styles from `~/components/forms/styles.ts`:
- `FORM_LABEL` — label element styling
- `FORM_INPUT_BASE` — base input/textarea/select styling
- `FORM_ERROR` — error message styling
- `INPUT_CLASS` / `INPUT_ERROR_CLASS` / `BTN_CLASS` — list page inline form styling

Do NOT hardcode these class strings in route files. Import them.

### Components
- Use `FormInput`, `FormTextarea`, `FormSelect` from `~/components/forms` for all form fields
- Use `<DashboardHeader>` for page title + save button on form pages
- Use `<Section>` for public EPK page sections (accent bar + heading + wrapper)
- Use `<ReorderButtons>` for drag-to-reorder UI in list pages

### Schemas
- One schema file per entity in `src/schemas/`
- Export types via `z.infer<typeof schema>`
- Use shared helpers: `reorderSchema`, `hexColor`, `optionalUrl`, `optionalEmail`
- Barrel export from `src/schemas/index.ts`

## Type Safety
- NEVER use `any` — always type loop variables, map callbacks, and loader data
- Derive types from Zod schemas or Supabase types
- Use `Pick<>` for partial types rather than redeclaring interfaces

## File Structure
```
src/
  components/
    forms/          # Reusable form components + shared styles
    DashboardSidebar.tsx
    Nav.tsx
    FadeIn.tsx
  hooks/            # Shared React hooks (useDashboardSave, useListEditor)
  routes/
    _dashboard/     # Dashboard routes (nested under _dashboard layout)
    $slug.tsx       # Public EPK page
    login.tsx
    signup.tsx
  schemas/          # Zod schemas (one per entity + index barrel)
  server/           # TanStack Start server functions
  utils/            # Shared utilities (supabase client, upload helper)
```

## Commands
- `npm run dev` — Start dev server
- `npm run build` — Production build (vite build + tsc --noEmit)
- `npm run db:migrate` — Run schema.sql against DATABASE_URL
- `npm start` — Run production server
