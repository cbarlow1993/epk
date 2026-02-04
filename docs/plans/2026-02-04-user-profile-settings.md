# User Profile & Security Settings

## Summary

Add Profile and Security cards to the existing Settings page (`dashboard.settings.tsx`) so users can update their display name, email, and password.

## Design

### Profile Card
- **Display Name** — text input, updates `profiles.display_name` via existing `updateProfile` server function
- **Email** — text input, pre-populated from Supabase auth user email. Updates via new `updateUserEmail` server function which calls `supabase.auth.updateUser({ email })`. Supabase sends a confirmation email automatically.
- Helper text: "A confirmation email will be sent to your new address."
- Own Save button with saving/saved/error states.

### Security Card
- **New Password** — password input, initially empty
- **Confirm Password** — password input, initially empty
- Client-side validation: passwords must match, min 8 characters
- Updates via new `updateUserPassword` server function which calls `supabase.auth.updateUser({ password })`
- Fields clear on success
- Own Save button with saving/saved/error states.

### Card Order on Settings Page
1. Profile (new)
2. Security (new)
3. Account (existing)
4. Billing (existing)
5. Branding (existing)
6. Custom Domain (existing)

## Server Functions (in `src/server/profile.ts`)

- `updateUserEmail({ email })` — auth guard, Zod validation (`z.string().email()`), calls `supabase.auth.updateUser({ email })`
- `updateUserPassword({ password })` — auth guard, Zod validation (`z.string().min(8)`), calls `supabase.auth.updateUser({ password })`

## Loader Change

Settings route loader returns both profile data and auth user email (via `supabase.auth.getUser()`).

## No Database Migration Required

- Display name already exists in `profiles` table
- Email/password managed by Supabase Auth
