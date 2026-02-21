# Booking Contact Form Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a dual-mode booking contact section — DJs choose between displaying contact details publicly or showing a contact form that sends email via AWS SES.

**Architecture:** New columns on `booking_contact` table (`contact_mode`, `booking_email`). New `contact_submissions` table for rate limiting. Dashboard radio toggle switches between "details" fields and "form" config. Public EPK renders either static details or a contact form. New server function calls AWS SES via `@aws-sdk/client-ses`.

**Tech Stack:** AWS SES (`@aws-sdk/client-ses`), Zod, react-hook-form, TanStack Start server functions, Supabase

---

### Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/20260221000000_booking_contact_form.sql`

**Step 1: Write the migration SQL**

```sql
-- Add contact mode and booking email to booking_contact
ALTER TABLE booking_contact
  ADD COLUMN IF NOT EXISTS contact_mode TEXT DEFAULT 'details',
  ADD COLUMN IF NOT EXISTS booking_email TEXT DEFAULT '';

-- Rate limiting table for contact form submissions
CREATE TABLE contact_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_hash TEXT NOT NULL,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for efficient rate limit lookups
CREATE INDEX idx_contact_submissions_ip_created
  ON contact_submissions(ip_hash, created_at);

-- Auto-cleanup: delete submissions older than 24 hours (cron or manual)
-- For now, the server function handles cleanup inline

-- RLS: contact_submissions is server-only (no client access needed)
ALTER TABLE contact_submissions ENABLE ROW LEVEL SECURITY;

-- Public can insert (the server function runs as authenticated via service role or RLS bypass)
-- We'll use getSupabaseAdmin() for rate limit checks, so no public policies needed.
-- Owner can read their own submissions (optional, for future analytics)
CREATE POLICY "Owner select on contact_submissions"
  ON contact_submissions FOR SELECT
  USING (is_profile_owner(profile_id));
```

**Step 2: Push the migration**

Run: `npx supabase db push`
Expected: Migration applied successfully

**Step 3: Commit**

```bash
git add supabase/migrations/20260221000000_booking_contact_form.sql
git commit -m "feat: add contact_mode and booking_email columns, contact_submissions table"
```

---

### Task 2: Update Schema

**Files:**
- Modify: `src/schemas/booking-contact.ts`
- Modify: `src/schemas/index.ts`

**Step 1: Update the booking contact schema**

Replace `src/schemas/booking-contact.ts` with:

```ts
import { z } from 'zod'

export const CONTACT_MODES = ['details', 'form'] as const

export const bookingContactUpdateSchema = z.object({
  contact_mode: z.enum(CONTACT_MODES).optional(),
  manager_name: z.string().max(200, 'Max 200 characters').optional(),
  email: z.string().email('Invalid email address').max(320).optional().or(z.literal('')),
  phone: z.string().max(50, 'Max 50 characters').optional(),
  address: z.string().max(500, 'Max 500 characters').optional(),
  booking_email: z.string().email('Invalid email address').max(320).optional().or(z.literal('')),
})

export type BookingContactUpdate = z.infer<typeof bookingContactUpdateSchema>

export const contactFormSubmissionSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200, 'Max 200 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().max(50, 'Max 50 characters').optional().or(z.literal('')),
  message: z.string().min(1, 'Message is required').max(2000, 'Max 2000 characters'),
  profile_id: z.string().uuid(),
  _honey: z.string().optional(),
})

export type ContactFormSubmission = z.infer<typeof contactFormSubmissionSchema>
```

**Step 2: Update barrel export**

In `src/schemas/index.ts`, change line 4 to:

```ts
export { bookingContactUpdateSchema, CONTACT_MODES, contactFormSubmissionSchema, type BookingContactUpdate, type ContactFormSubmission } from './booking-contact'
```

**Step 3: Verify build**

Run: `npx tsc --noEmit`
Expected: No type errors

**Step 4: Commit**

```bash
git add src/schemas/booking-contact.ts src/schemas/index.ts
git commit -m "feat: add contact_mode, booking_email, and contact form submission schemas"
```

---

### Task 3: Install AWS SES SDK

**Files:**
- Modify: `package.json`

**Step 1: Install the package**

Run: `npm install @aws-sdk/client-ses`

**Step 2: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: add @aws-sdk/client-ses dependency"
```

---

### Task 4: Create Email Sending Utility

**Files:**
- Create: `src/utils/ses.ts`

**Step 1: Create the SES utility**

```ts
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses'

const ses = new SESClient({
  region: process.env.AWS_REGION || 'eu-west-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

interface SendContactEmailParams {
  toEmail: string
  djName: string
  senderName: string
  senderEmail: string
  senderPhone: string
  message: string
}

export async function sendContactEmail({ toEmail, djName, senderName, senderEmail, senderPhone, message }: SendContactEmailParams) {
  const fromEmail = process.env.SES_FROM_EMAIL
  if (!fromEmail) throw new Error('SES_FROM_EMAIL not configured')

  const htmlBody = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="margin-bottom: 24px;">New Booking Inquiry</h2>
      <table style="width: 100%; border-collapse: collapse;">
        <tr><td style="padding: 8px 0; font-weight: bold; width: 100px;">Name:</td><td style="padding: 8px 0;">${escapeHtml(senderName)}</td></tr>
        <tr><td style="padding: 8px 0; font-weight: bold;">Email:</td><td style="padding: 8px 0;"><a href="mailto:${escapeHtml(senderEmail)}">${escapeHtml(senderEmail)}</a></td></tr>
        ${senderPhone ? `<tr><td style="padding: 8px 0; font-weight: bold;">Phone:</td><td style="padding: 8px 0;">${escapeHtml(senderPhone)}</td></tr>` : ''}
      </table>
      <div style="margin-top: 24px; padding: 16px; background: #f5f5f5; white-space: pre-wrap;">${escapeHtml(message)}</div>
      <p style="margin-top: 24px; color: #666; font-size: 12px;">Sent via ${escapeHtml(djName)} EPK contact form</p>
    </div>
  `

  const textBody = `New Booking Inquiry\n\nName: ${senderName}\nEmail: ${senderEmail}${senderPhone ? `\nPhone: ${senderPhone}` : ''}\n\nMessage:\n${message}\n\n---\nSent via ${djName} EPK contact form`

  await ses.send(new SendEmailCommand({
    Source: `"${djName} EPK" <${fromEmail}>`,
    Destination: { ToAddresses: [toEmail] },
    ReplyToAddresses: [senderEmail],
    Message: {
      Subject: { Data: `New Booking Inquiry via ${djName} EPK` },
      Body: {
        Html: { Data: htmlBody },
        Text: { Data: textBody },
      },
    },
  }))
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
```

**Step 2: Verify build**

Run: `npx tsc --noEmit`
Expected: No type errors

**Step 3: Commit**

```bash
git add src/utils/ses.ts
git commit -m "feat: add SES email utility for contact form submissions"
```

---

### Task 5: Create Contact Form Server Function

**Files:**
- Modify: `src/server/booking-contact.ts`

**Step 1: Add the submitContactForm server function**

Add these imports to the top of `src/server/booking-contact.ts`:

```ts
import { contactFormSubmissionSchema } from '~/schemas/booking-contact'
import { getSupabaseAdmin } from '~/utils/supabase.server'
import { sendContactEmail } from '~/utils/ses'
import { createHash } from 'crypto'
```

Then add after the existing `updateBookingContact` function:

```ts
export const submitContactForm = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => contactFormSubmissionSchema.parse(data))
  .handler(async ({ data }) => {
    // Honeypot check — silently reject
    if (data._honey) return { success: true }

    const admin = getSupabaseAdmin()

    // Rate limit: hash the request IP (we'll pass a placeholder for now)
    // In Nitro/H3, the IP comes from the request context
    const { getH3Event } = await import('@tanstack/react-start/server')
    const event = getH3Event()
    const ip = event.node.req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() || event.node.req.socket.remoteAddress || 'unknown'
    const ipHash = createHash('sha256').update(ip).digest('hex')

    // Check rate limit: max 5 per IP per hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const { count } = await admin
      .from('contact_submissions')
      .select('*', { count: 'exact', head: true })
      .eq('ip_hash', ipHash)
      .gte('created_at', oneHourAgo)

    if ((count ?? 0) >= 5) {
      return { error: 'Too many submissions. Please try again later.' }
    }

    // Log the submission for rate limiting
    await admin.from('contact_submissions').insert({ ip_hash: ipHash, profile_id: data.profile_id })

    // Look up the DJ's booking email
    const { data: contact } = await admin
      .from('booking_contact')
      .select('booking_email')
      .eq('profile_id', data.profile_id)
      .single()

    // Fall back to auth email if booking_email is empty
    let toEmail = contact?.booking_email
    if (!toEmail) {
      const { data: authUser } = await admin.auth.admin.getUserById(data.profile_id)
      toEmail = authUser?.user?.email
    }

    if (!toEmail) return { error: 'Unable to deliver message. Please try again later.' }

    // Look up DJ name for the email subject
    const { data: profile } = await admin
      .from('profiles')
      .select('artist_name')
      .eq('id', data.profile_id)
      .single()

    const djName = profile?.artist_name || 'DJ'

    try {
      await sendContactEmail({
        toEmail,
        djName,
        senderName: data.name,
        senderEmail: data.email,
        senderPhone: data.phone || '',
        message: data.message,
      })
      return { success: true }
    } catch (err) {
      console.error('SES send error:', err)
      return { error: 'Failed to send message. Please try again later.' }
    }
  })
```

**Step 2: Verify build**

Run: `npx tsc --noEmit`
Expected: No type errors

**Step 3: Commit**

```bash
git add src/server/booking-contact.ts
git commit -m "feat: add submitContactForm server function with rate limiting and SES"
```

---

### Task 6: Update Dashboard Contact Page

**Files:**
- Modify: `src/routes/_dashboard/dashboard.contact.tsx`

**Step 1: Rewrite the dashboard contact page**

Replace the entire file with:

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { getBookingContact, updateBookingContact } from '~/server/booking-contact'
import { getProfile } from '~/server/profile'
import { bookingContactUpdateSchema, type BookingContactUpdate } from '~/schemas/booking-contact'
import { FormInput } from '~/components/forms'
import { FORM_LABEL } from '~/components/forms/styles'
import { useDashboardSave } from '~/hooks/useDashboardSave'
import { DashboardHeader } from '~/components/DashboardHeader'
import { useSectionToggle } from '~/hooks/useSectionToggle'

export const Route = createFileRoute('/_dashboard/dashboard/contact')({
  loader: async () => {
    const [contact, profile] = await Promise.all([getBookingContact(), getProfile()])
    return { contact, sectionVisibility: (profile?.section_visibility as Record<string, boolean> | null) ?? null }
  },
  component: BookingContactEditor,
})

function BookingContactEditor() {
  const { contact: initialData, sectionVisibility } = Route.useLoaderData()
  const { saving, saved, error, onSave: save } = useDashboardSave(updateBookingContact)
  const sectionToggle = useSectionToggle('contact', sectionVisibility)

  const { register, handleSubmit, watch, formState: { errors, isDirty } } = useForm<BookingContactUpdate>({
    resolver: zodResolver(bookingContactUpdateSchema),
    defaultValues: {
      contact_mode: initialData?.contact_mode || 'details',
      manager_name: initialData?.manager_name || '',
      email: initialData?.email || '',
      phone: initialData?.phone || '',
      address: initialData?.address || '',
      booking_email: initialData?.booking_email || '',
    },
  })

  const contactMode = watch('contact_mode')

  const onSave = handleSubmit(async (data) => {
    await Promise.all([save(data), sectionToggle.save()])
  })

  return (
    <form onSubmit={onSave}>
      <DashboardHeader title="Booking Contact" saving={saving} saved={saved} error={error} isDirty={isDirty || sectionToggle.isDirty} sectionEnabled={sectionToggle.enabled} onToggleSection={sectionToggle.toggle} />

      <fieldset className="mb-8">
        <legend className={FORM_LABEL}>Contact Mode</legend>
        <div className="flex gap-6 mt-1">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="radio" value="details" {...register('contact_mode')} className="accent-accent" />
            <span className="text-sm text-text-primary">Display contact details</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="radio" value="form" {...register('contact_mode')} className="accent-accent" />
            <span className="text-sm text-text-primary">Show contact form</span>
          </label>
        </div>
      </fieldset>

      {contactMode === 'details' ? (
        <div className="space-y-6">
          <FormInput label="Manager / Agent Name" registration={register('manager_name')} error={errors.manager_name} placeholder="e.g. Helen" />
          <FormInput label="Email" registration={register('email')} error={errors.email} type="email" placeholder="booking@example.com" />
          <FormInput label="Phone" registration={register('phone')} error={errors.phone} type="tel" placeholder="+44 7xxx xxx xxx" />
          <FormInput label="Address" registration={register('address')} error={errors.address} placeholder="City, Country" />
        </div>
      ) : (
        <div className="space-y-6">
          <FormInput label="Booking Email" registration={register('booking_email')} error={errors.booking_email} type="email" placeholder="booking@example.com" />
          <p className="text-xs text-text-secondary -mt-4">
            Form submissions will be sent to this email. Leave blank to use your account email.
          </p>
        </div>
      )}
    </form>
  )
}
```

**Step 2: Verify build**

Run: `npx tsc --noEmit`
Expected: No type errors

**Step 3: Commit**

```bash
git add src/routes/_dashboard/dashboard.contact.tsx
git commit -m "feat: add contact mode radio toggle to dashboard contact page"
```

---

### Task 7: Update Public EPK Rendering

**Files:**
- Modify: `src/routes/$slug.tsx`

**Step 1: Update the contact section navigation check**

In `src/routes/$slug.tsx`, find the nav item check at line ~386:

```ts
bookingContact && bookingContact.manager_name && { label: 'Contact', href: '#contact' },
```

Replace with:

```ts
bookingContact && (bookingContact.contact_mode === 'form' || bookingContact.manager_name) && { label: 'Contact', href: '#contact' },
```

**Step 2: Update the contact section renderer**

Find the contact renderer at line ~1059:

```tsx
contact: bookingContact && bookingContact.manager_name ? (
  <EPKSection key="contact" id="contact" heading="Booking Contact" animate={animateSections}>
    <div className={`${textSecClass} space-y-2`}>
      <p><strong>Management:</strong> {bookingContact.manager_name}</p>
      {bookingContact.email && <p><strong>Email:</strong> {bookingContact.email}</p>}
      {bookingContact.phone && <p><strong>Phone:</strong> {bookingContact.phone}</p>}
    </div>
  </EPKSection>
) : null,
```

Replace with:

```tsx
contact: bookingContact && (bookingContact.contact_mode === 'form' || bookingContact.manager_name) ? (
  <EPKSection key="contact" id="contact" heading="Booking Contact" animate={animateSections}>
    {bookingContact.contact_mode === 'form' ? (
      <ContactForm profileId={data!.profileId} accentColor={resolvedAccent} textSecClass={textSecClass} />
    ) : (
      <div className={`${textSecClass} space-y-2`}>
        <p><strong>Management:</strong> {bookingContact.manager_name}</p>
        {bookingContact.email && <p><strong>Email:</strong> {bookingContact.email}</p>}
        {bookingContact.phone && <p><strong>Phone:</strong> {bookingContact.phone}</p>}
      </div>
    )}
  </EPKSection>
) : null,
```

**Step 3: Add the ContactForm component**

Add this component inside `$slug.tsx` (before the main route component, after the imports). Import `submitContactForm` at the top:

```tsx
import { submitContactForm } from '~/server/booking-contact'
```

Add the component:

```tsx
function ContactForm({ profileId, accentColor, textSecClass }: { profileId: string; accentColor: string; textSecClass: string }) {
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setStatus('sending')
    setErrorMsg('')

    const form = e.currentTarget
    const formData = new FormData(form)

    const result = await submitContactForm({
      data: {
        name: formData.get('name') as string,
        email: formData.get('email') as string,
        phone: (formData.get('phone') as string) || '',
        message: formData.get('message') as string,
        profile_id: profileId,
        _honey: formData.get('_honey') as string,
      },
    })

    if ('error' in result && result.error) {
      setStatus('error')
      setErrorMsg(result.error)
    } else {
      setStatus('sent')
      form.reset()
    }
  }

  if (status === 'sent') {
    return (
      <div className={`${textSecClass} text-center py-8`}>
        <p className="text-lg font-semibold mb-2">Message sent!</p>
        <p>Thank you for your inquiry. We'll be in touch soon.</p>
        <button type="button" onClick={() => setStatus('idle')} className="mt-4 text-sm underline" style={{ color: accentColor }}>
          Send another message
        </button>
      </div>
    )
  }

  const inputClass = `w-full bg-transparent border border-current/20 px-4 py-3 text-inherit placeholder:opacity-50 focus:outline-none transition-colors text-sm`

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Honeypot — hidden from humans */}
      <input type="text" name="_honey" tabIndex={-1} autoComplete="off" className="absolute opacity-0 h-0 w-0 pointer-events-none" aria-hidden="true" />

      <div>
        <label className={`block text-xs font-semibold uppercase tracking-wider ${textSecClass} mb-2`}>Name *</label>
        <input type="text" name="name" required maxLength={200} placeholder="Your name" className={inputClass} style={{ borderColor: `${accentColor}33` }} />
      </div>
      <div>
        <label className={`block text-xs font-semibold uppercase tracking-wider ${textSecClass} mb-2`}>Email *</label>
        <input type="email" name="email" required placeholder="your@email.com" className={inputClass} style={{ borderColor: `${accentColor}33` }} />
      </div>
      <div>
        <label className={`block text-xs font-semibold uppercase tracking-wider ${textSecClass} mb-2`}>Phone</label>
        <input type="tel" name="phone" maxLength={50} placeholder="+44 7xxx xxx xxx" className={inputClass} style={{ borderColor: `${accentColor}33` }} />
      </div>
      <div>
        <label className={`block text-xs font-semibold uppercase tracking-wider ${textSecClass} mb-2`}>Message *</label>
        <textarea name="message" required maxLength={2000} rows={5} placeholder="Tell us about your event..." className={`${inputClass} resize-none leading-relaxed`} style={{ borderColor: `${accentColor}33` }} />
      </div>

      {status === 'error' && <p className="text-sm text-red-500">{errorMsg}</p>}

      <button
        type="submit"
        disabled={status === 'sending'}
        className="px-6 py-3 text-sm font-semibold uppercase tracking-wider text-white transition-colors disabled:opacity-50"
        style={{ backgroundColor: accentColor }}
      >
        {status === 'sending' ? 'Sending...' : 'Send Message'}
      </button>
    </form>
  )
}
```

**Step 4: Verify build**

Run: `npx tsc --noEmit`
Expected: No type errors

**Step 5: Commit**

```bash
git add src/routes/\$slug.tsx
git commit -m "feat: render contact form on public EPK when contact_mode is 'form'"
```

---

### Task 8: Manual Testing Checklist

**Step 1: Set environment variables locally**

Add to `.env`:
```
AWS_ACCESS_KEY_ID=<your-key>
AWS_SECRET_ACCESS_KEY=<your-secret>
AWS_REGION=eu-west-1
SES_FROM_EMAIL=noreply@yourdomain.com
```

**Step 2: Test dashboard — details mode**

1. Run `npm run dev`
2. Navigate to `/dashboard/contact`
3. Verify "Display contact details" is selected by default
4. Verify existing fields (Manager Name, Email, Phone, Address) appear
5. Edit a field, click Save, verify it persists on reload

**Step 3: Test dashboard — form mode**

1. Select "Show contact form" radio
2. Verify the 4 detail fields hide and "Booking Email" field appears
3. Enter a booking email, click Save
4. Reload — verify form mode and booking email persist

**Step 4: Test public EPK — details mode**

1. Set contact_mode back to 'details', fill in manager name
2. Visit the public EPK page
3. Verify contact details display as before

**Step 5: Test public EPK — form mode**

1. Set contact_mode to 'form' in dashboard
2. Visit the public EPK page
3. Verify the contact form renders (Name, Email, Phone, Message)
4. Submit a test message
5. Verify email arrives at the configured booking email
6. Verify "Message sent!" confirmation appears

**Step 6: Test spam protection**

1. Submit 5 messages rapidly — 6th should be rate-limited
2. Inspect the honeypot field is hidden and not visible to users

**Step 7: Commit any fixes**

```bash
git add -A
git commit -m "fix: address issues found during manual testing"
```
