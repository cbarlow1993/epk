# Booking Contact Form — Design

## Summary

Add a dual-mode booking contact feature. DJs choose between displaying their contact details publicly (current behavior) or showing a contact form that sends email inquiries via AWS SES — keeping their details private.

## Contact Modes

1. **Details mode** (default, current behavior): Shows manager name, email, phone, address on public EPK.
2. **Form mode**: Shows a contact form (Name, Email, Phone, Message) on public EPK. Submissions are emailed to the DJ's configured booking email via AWS SES.

## Database Changes

Add to `booking_contact` table:
- `contact_mode TEXT DEFAULT 'details'` — `'details'` or `'form'`
- `booking_email TEXT DEFAULT ''` — recipient for form submissions (falls back to auth email if empty)

New table `contact_submissions` for rate limiting:
- `id UUID PRIMARY KEY`
- `ip_hash TEXT NOT NULL` — hashed IP for privacy
- `profile_id UUID NOT NULL REFERENCES profiles(id)`
- `created_at TIMESTAMPTZ DEFAULT now()`

## Schema Changes

### `bookingContactUpdateSchema` (updated)
- Add `contact_mode: z.enum(['details', 'form'])`
- Add `booking_email: z.string().email().max(320).optional().or(z.literal(''))`

### `contactFormSubmissionSchema` (new)
- `name`: required string, max 200
- `email`: required email
- `phone`: optional string, max 50
- `message`: required string, max 2000
- `profile_id`: required UUID
- `_honey`: optional string (honeypot)

## Dashboard UI

Radio buttons at top of `dashboard.contact.tsx`:
- **Display contact details**: shows existing 4 fields (manager name, email, phone, address)
- **Show contact form**: shows a single "Booking Email" field with helper text "Leave blank to use your account email"

Both modes respect the existing section toggle (enable/disable contact section).

## Public EPK

- `contact_mode === 'details'`: current rendering (name, email, phone)
- `contact_mode === 'form'`: render contact form with Name, Email, Phone, Message + submit button

## Server Function: `submitContactForm`

1. Validate input with `contactFormSubmissionSchema`
2. Check honeypot field — silently reject if filled (return success to avoid tipping off bots)
3. Rate limit: max 5 submissions per IP per hour via `contact_submissions` table
4. Look up DJ's `booking_email` from `booking_contact` (fall back to auth email)
5. Send email via AWS SES `@aws-sdk/client-ses`
6. Return `{ success: true }` or `{ error: string }`

## Email Format

- **From:** `SES_FROM_EMAIL` env var (verified sender, e.g., `noreply@yourdomain.com`)
- **To:** DJ's booking email
- **Subject:** "New Booking Inquiry via [DJ Name] EPK"
- **Reply-To:** Sender's email
- **Body:** HTML with sender name, email, phone, message

## Spam Protection

- **Honeypot field:** Hidden input `_honey`, silently rejected if filled
- **Rate limit:** 5 submissions/IP/hour tracked in `contact_submissions` table with hashed IPs

## Environment Variables

Server-only (`process.env.*`, set in Vercel):
- `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` (or OIDC federation)
- `AWS_REGION`
- `SES_FROM_EMAIL`
