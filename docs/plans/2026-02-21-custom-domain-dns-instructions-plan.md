# Custom Domain DNS Instructions — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Surface DNS verification records and add a verify button in the BYOD flow, plus create a public support page with per-provider CNAME/TXT setup guides.

**Architecture:** Enhance existing `checkDomainStatus` and `addCustomDomain` server functions to return Vercel's verification records. Update the `BYODFlow` component to display a DNS records table with copy buttons and a verify action. Add a new public route at `/support/custom-domain` with static provider-specific instructions.

**Tech Stack:** TanStack Start (server functions + file-based routing), Tailwind CSS v4, Vercel Domains API v10

---

### Task 1: Enhance `addCustomDomain` server function to return verification records

**Files:**
- Modify: `src/server/domains.ts:27-52` (addCustomDomain handler)

**Step 1: Update the success return to include verification data**

In `src/server/domains.ts`, the `addCustomDomain` handler currently returns `{ success: true, domain: data.domain }`. Change it to also parse and return the Vercel API response body:

```ts
export const addCustomDomain = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => z.object({ domain: z.string().min(1).max(253).regex(domainRegex, 'Invalid domain format') }).parse(data))
  .handler(async ({ data }) => {
    const { supabase, user } = await withAuth()

    const { data: profile } = await supabase.from('profiles').select('tier').eq('id', user.id).single()
    if (profile?.tier !== 'pro') return { error: 'Pro plan required for custom domains' }

    const teamParam = VERCEL_TEAM_ID ? `&teamId=${VERCEL_TEAM_ID}` : ''
    const res = await fetch(`https://api.vercel.com/v10/projects/${VERCEL_PROJECT_ID}/domains?${teamParam}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${VERCEL_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: data.domain }),
    })

    if (!res.ok) {
      const err = await res.json()
      return { error: err.error?.message || 'Failed to add domain' }
    }

    const responseData = await res.json()
    await supabase.from('profiles').update({ custom_domain: data.domain }).eq('id', user.id)

    return {
      success: true,
      domain: data.domain,
      verified: responseData.verified || false,
      verification: responseData.verification || [],
    }
  })
```

**Step 2: Verify the change compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/server/domains.ts
git commit -m "feat: return verification records from addCustomDomain"
```

---

### Task 2: Enhance `checkDomainStatus` to trigger verify and return full status

**Files:**
- Modify: `src/server/domains.ts:74-96` (checkDomainStatus handler)

**Step 1: Update checkDomainStatus to call the verify endpoint, then return full status**

Replace the existing `checkDomainStatus` handler:

```ts
export const checkDomainStatus = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => z.object({ domain: z.string().min(1).max(253) }).parse(data))
  .handler(async ({ data }) => {
    const { supabase, user } = await withAuth()

    const { data: profile } = await supabase
      .from('profiles')
      .select('custom_domain')
      .eq('id', user.id)
      .single()

    if (profile?.custom_domain !== data.domain) return { configured: false, verified: false, verification: [] }

    const teamParam = VERCEL_TEAM_ID ? `?teamId=${VERCEL_TEAM_ID}` : ''

    // Trigger Vercel to re-check domain verification
    await fetch(`https://api.vercel.com/v10/projects/${VERCEL_PROJECT_ID}/domains/${data.domain}/verify${teamParam}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${VERCEL_TOKEN}` },
    })

    // Fetch current domain status
    const res = await fetch(`https://api.vercel.com/v10/projects/${VERCEL_PROJECT_ID}/domains/${data.domain}${teamParam}`, {
      headers: { Authorization: `Bearer ${VERCEL_TOKEN}` },
    })

    if (!res.ok) return { configured: false, verified: false, verification: [] }

    const domainData = await res.json()
    return {
      configured: true,
      verified: domainData.verified || false,
      verification: domainData.verification || [],
    }
  })
```

**Step 2: Verify the change compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/server/domains.ts
git commit -m "feat: checkDomainStatus triggers verify and returns full status"
```

---

### Task 3: Update the BYODFlow component with DNS records table and verify button

**Files:**
- Modify: `src/routes/_dashboard/dashboard.settings.tsx:409-484` (BYODFlow component)

**Step 1: Rewrite the BYODFlow component**

Replace the existing `BYODFlow` function in `dashboard.settings.tsx` with the enhanced version. Key changes:

- Track `verification` records and `verified` status in state
- After adding a domain, store the verification records from the response
- Show a DNS records table with CNAME + any TXT verification records
- Add copy-to-clipboard buttons
- Show status badges (Pending / Verified)
- "Verify DNS Configuration" button that calls `checkDomainStatus` and updates state
- Link to `/support/custom-domain`

```tsx
type VerificationRecord = {
  type: string
  domain: string
  value: string
  reason: string
}

function BYODFlow({ profile }: { profile: ProfileRow | null }) {
  const [domain, setDomain] = useState(profile?.custom_domain || '')
  const [verified, setVerified] = useState<boolean | null>(null)
  const [verification, setVerification] = useState<VerificationRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [statusMessage, setStatusMessage] = useState('')

  // On mount, if domain already set, fetch current status
  useEffect(() => {
    if (profile?.custom_domain) {
      handleCheckStatus(profile.custom_domain)
    }
  }, [])

  const handleCheckStatus = async (domainToCheck: string) => {
    setLoading(true)
    setError('')
    setStatusMessage('')
    const result = await checkDomainStatus({ data: { domain: domainToCheck } })
    setLoading(false)
    setVerified(result.verified ?? false)
    setVerification(result.verification ?? [])
    if (result.verified) {
      setStatusMessage('Domain is verified and active!')
    }
  }

  const handleAdd = async () => {
    setLoading(true)
    setError('')
    setStatusMessage('')
    const result = await addCustomDomain({ data: { domain } })
    setLoading(false)
    if ('error' in result) {
      setError(result.error as string)
    } else {
      setVerified(result.verified ?? false)
      setVerification(result.verification ?? [])
      setStatusMessage('Domain added! Configure the DNS records below.')
    }
  }

  const handleRemove = async () => {
    setLoading(true)
    setError('')
    const result = await removeCustomDomain()
    setLoading(false)
    if (result && 'error' in result && result.error) {
      setError(result.error as string)
    } else {
      setDomain('')
      setVerified(null)
      setVerification([])
      setStatusMessage('Domain removed.')
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  if (profile?.custom_domain) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm text-accent">{profile.custom_domain}</span>
            {verified === true && (
              <span className="text-xs bg-green-500/10 text-green-400 px-2 py-0.5 font-medium uppercase tracking-wider">Verified</span>
            )}
            {verified === false && (
              <span className="text-xs bg-yellow-500/10 text-yellow-400 px-2 py-0.5 font-medium uppercase tracking-wider">Pending</span>
            )}
          </div>
          <button type="button" onClick={handleRemove} disabled={loading} className="text-xs text-red-500 hover:text-red-600 transition-colors">
            {loading ? 'Removing...' : 'Remove'}
          </button>
        </div>

        {/* DNS Records Table */}
        <div className="border border-border text-sm">
          <div className="grid grid-cols-[80px_1fr_1fr] bg-card px-4 py-2 text-xs font-semibold uppercase tracking-wider text-text-secondary border-b border-border">
            <span>Type</span>
            <span>Name / Host</span>
            <span>Value / Target</span>
          </div>
          <div className="grid grid-cols-[80px_1fr_1fr] px-4 py-3 border-b border-border items-center">
            <span className="text-text-secondary text-xs font-mono">CNAME</span>
            <span className="font-mono text-xs break-all">{profile.custom_domain.startsWith('www.') ? 'www' : '@'}</span>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-accent break-all">cname.vercel-dns.com</span>
              <button type="button" onClick={() => copyToClipboard('cname.vercel-dns.com')} className="text-text-secondary hover:text-text-primary transition-colors shrink-0" title="Copy">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
              </button>
            </div>
          </div>
          {verification.map((v, i) => (
            <div key={i} className="grid grid-cols-[80px_1fr_1fr] px-4 py-3 border-b border-border last:border-b-0 items-center">
              <span className="text-text-secondary text-xs font-mono">{v.type}</span>
              <span className="font-mono text-xs break-all">{v.domain}</span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-accent break-all">{v.value}</span>
                <button type="button" onClick={() => copyToClipboard(v.value)} className="text-text-secondary hover:text-text-primary transition-colors shrink-0" title="Copy">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Root domain note */}
        {!profile.custom_domain.startsWith('www.') && (
          <p className="text-xs text-text-secondary/70">
            Some registrars don't support CNAME records on root domains. If yours doesn't, use an ALIAS or ANAME record instead, or use a <code className="text-accent">www.</code> subdomain.
          </p>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => handleCheckStatus(profile.custom_domain!)}
            disabled={loading}
            className={BTN_PRIMARY + ' text-xs'}
          >
            {loading ? 'Checking...' : 'Verify DNS Configuration'}
          </button>
        </div>

        {statusMessage && <p className="text-xs text-green-400">{statusMessage}</p>}
        {error && <p className="text-xs text-red-500">{error}</p>}

        <p className="text-xs text-text-secondary">
          Need help? <a href="/support/custom-domain" target="_blank" className="text-accent hover:underline">Step-by-step guides for popular DNS providers</a>
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <input
        type="text"
        value={domain}
        onChange={(e) => setDomain(e.target.value)}
        placeholder="myepk.bio"
        className={FORM_INPUT}
      />
      <button
        type="button"
        onClick={handleAdd}
        disabled={!domain || loading}
        className={BTN_PRIMARY}
      >
        {loading ? 'Adding...' : 'Add Domain'}
      </button>
      {statusMessage && <p className="text-xs text-green-400">{statusMessage}</p>}
      {error && <p className="text-xs text-red-500">{error}</p>}
      <p className="text-xs text-text-secondary">
        After adding your domain, you'll need to configure DNS records. <a href="/support/custom-domain" target="_blank" className="text-accent hover:underline">See our setup guides</a>
      </p>
    </div>
  )
}
```

**Step 2: Add `useEffect` import if not already present**

Check the imports at the top of `dashboard.settings.tsx`. Currently line 2 imports `useState` — add `useEffect`:

```ts
import { useState, useEffect } from 'react'
```

**Step 3: Verify the change compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 4: Manual test**

Run: `npm run dev`
- Navigate to `/dashboard/settings`
- Verify the custom domain section renders correctly
- If a domain is already set, it should show the DNS records table and verify button
- If no domain, it should show the input with the support page link

**Step 5: Commit**

```bash
git add src/routes/_dashboard/dashboard.settings.tsx
git commit -m "feat: show DNS records table and verify button in BYOD flow"
```

---

### Task 4: Create the public support page at `/support/custom-domain`

**Files:**
- Create: `src/routes/support/custom-domain.tsx`

**Step 1: Create the support directory route**

Create `src/routes/support/custom-domain.tsx` as a public route with static content. The page should:

- Use the same body styles as the rest of the app (`bg-bg text-text-primary`)
- Have a back-to-home link
- Include provider-specific accordion sections for: Cloudflare, GoDaddy, Namecheap, Google Domains, Route 53 (AWS), Porkbun
- Each section shows numbered steps for adding CNAME and TXT records
- Include a troubleshooting section at the bottom

```tsx
import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'

export const Route = createFileRoute('/support/custom-domain')({
  component: CustomDomainSupport,
  head: () => ({
    meta: [
      { title: 'Custom Domain Setup Guide — myEPK' },
      { name: 'description', content: 'Step-by-step instructions for connecting your custom domain to myEPK. Guides for Cloudflare, GoDaddy, Namecheap, Google Domains, Route 53, and Porkbun.' },
    ],
  }),
})

const PROVIDERS = [
  {
    name: 'Cloudflare',
    steps: [
      'Log in to your Cloudflare dashboard and select your domain.',
      'Go to DNS → Records.',
      'Click "Add record".',
      'For the CNAME record: set Type to CNAME, Name to @ (or www), and Target to cname.vercel-dns.com. Set Proxy status to "DNS only" (grey cloud) — this is important, Cloudflare proxying can interfere with SSL.',
      'For the TXT record: set Type to TXT, Name to the value shown in your myEPK settings (e.g. _vercel.yourdomain.com), and Content to the verification value shown in your settings.',
      'Click "Save" for each record.',
    ],
    note: 'You must disable Cloudflare proxying (orange cloud → grey cloud) for the CNAME record. Vercel needs direct DNS resolution to issue SSL certificates.',
  },
  {
    name: 'GoDaddy',
    steps: [
      'Log in to GoDaddy and go to My Products → your domain → DNS.',
      'Click "Add" under DNS Records.',
      'For the CNAME record: set Type to CNAME, Name to @ or www, and Value to cname.vercel-dns.com. Leave TTL as default.',
      'For the TXT record: set Type to TXT, Name to the value shown in your myEPK settings (e.g. _vercel.yourdomain.com), and Value to the verification string from your settings.',
      'Click "Save" for each record.',
    ],
    note: 'GoDaddy does not support CNAME on the root domain (@). If you want to use a bare domain (no www), you\'ll need to either use their domain forwarding or switch to a provider that supports ALIAS/ANAME records.',
  },
  {
    name: 'Namecheap',
    steps: [
      'Log in to Namecheap and go to Domain List → Manage → Advanced DNS.',
      'Click "Add New Record".',
      'For the CNAME record: set Type to CNAME, Host to @ (or www), and Value to cname.vercel-dns.com.',
      'For the TXT record: set Type to TXT Record, Host to the subdomain prefix shown in your settings (e.g. _vercel), and Value to the verification string.',
      'Click the green check to save each record.',
    ],
    note: 'If using the root domain, Namecheap supports URL Redirect Records as an alternative. Check their documentation for "ALIAS" record support.',
  },
  {
    name: 'Google Domains',
    steps: [
      'Log in to Google Domains (domains.google) and select your domain.',
      'Go to DNS in the left sidebar.',
      'Scroll to "Custom records" and click "Manage custom records".',
      'For the CNAME record: set Host name to @ or www, Type to CNAME, TTL to 3600, and Data to cname.vercel-dns.com.',
      'For the TXT record: set Host name to the subdomain prefix from your settings (e.g. _vercel), Type to TXT, and Data to the verification value.',
      'Click "Save" for each record.',
    ],
    note: 'Google Domains has been migrated to Squarespace Domains. The interface may vary slightly — look for DNS settings under your domain management.',
  },
  {
    name: 'Route 53 (AWS)',
    steps: [
      'Log in to the AWS Console and go to Route 53 → Hosted Zones → your domain.',
      'Click "Create record".',
      'For the CNAME record: leave Record name empty (for root) or enter www, set Record type to CNAME, and Value to cname.vercel-dns.com.',
      'For the TXT record: set Record name to the subdomain prefix from your settings (e.g. _vercel), Record type to TXT, and Value to the verification string wrapped in double quotes.',
      'Click "Create records".',
    ],
    note: 'Route 53 supports ALIAS records for the root domain. Set Record type to "A — Routes traffic to an IPv4 address" and enable "Alias", then select the CNAME target.',
  },
  {
    name: 'Porkbun',
    steps: [
      'Log in to Porkbun and go to Domain Management → your domain → DNS Records.',
      'Click "Edit" next to DNS Records.',
      'For the CNAME record: set Type to CNAME, Host to blank (for root) or www, and Answer to cname.vercel-dns.com.',
      'For the TXT record: set Type to TXT, Host to the subdomain prefix from your settings (e.g. _vercel), and Answer to the verification string.',
      'Click "Submit" for each record.',
    ],
    note: 'Porkbun supports ALIAS records for root domains. If CNAME doesn\'t work on @, try the ALIAS type instead.',
  },
]

function ProviderSection({ provider }: { provider: typeof PROVIDERS[number] }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="border border-border">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-card transition-colors"
      >
        <span className="font-semibold text-sm">{provider.name}</span>
        <svg className={`w-4 h-4 text-text-secondary transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="px-5 pb-5 border-t border-border">
          <ol className="list-decimal list-inside space-y-2 mt-4 text-sm text-text-secondary">
            {provider.steps.map((step, i) => (
              <li key={i} className="leading-relaxed">{step}</li>
            ))}
          </ol>
          {provider.note && (
            <div className="mt-4 bg-yellow-500/5 border border-yellow-500/20 px-4 py-3 text-xs text-yellow-300">
              <span className="font-semibold uppercase tracking-wider">Note:</span> {provider.note}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function CustomDomainSupport() {
  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-2xl mx-auto px-6 py-16">
        <Link to="/" className="text-xs text-text-secondary hover:text-accent transition-colors uppercase tracking-wider font-semibold">
          ← Back to myEPK
        </Link>

        <h1 className="text-3xl font-display font-extrabold tracking-tight uppercase mt-8 mb-4">
          Custom Domain Setup
        </h1>
        <p className="text-text-secondary text-sm mb-10 leading-relaxed">
          Connect your own domain to your myEPK page. You'll need to add two DNS records at your domain registrar: a <strong className="text-text-primary">CNAME</strong> record for routing and a <strong className="text-text-primary">TXT</strong> record for domain verification and SSL.
        </p>

        {/* What you need */}
        <div className="bg-surface border border-border p-5 mb-10">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-text-secondary mb-3">What you'll need</h2>
          <ul className="text-sm text-text-secondary space-y-2">
            <li>• A <strong className="text-text-primary">CNAME</strong> record pointing to <code className="text-accent bg-card px-1.5 py-0.5">cname.vercel-dns.com</code></li>
            <li>• A <strong className="text-text-primary">TXT</strong> record for verification — the exact name and value are shown in your <Link to="/dashboard/settings" className="text-accent hover:underline">dashboard settings</Link></li>
          </ul>
        </div>

        {/* Provider guides */}
        <h2 className="text-xs font-semibold uppercase tracking-wider text-text-secondary mb-4">Provider guides</h2>
        <div className="space-y-0 divide-y-0 mb-10">
          {PROVIDERS.map((p) => (
            <ProviderSection key={p.name} provider={p} />
          ))}
        </div>

        {/* Troubleshooting */}
        <h2 className="text-xs font-semibold uppercase tracking-wider text-text-secondary mb-4">Troubleshooting</h2>
        <div className="bg-surface border border-border p-5 space-y-4 text-sm text-text-secondary">
          <div>
            <h3 className="font-semibold text-text-primary mb-1">DNS changes aren't taking effect</h3>
            <p>DNS propagation can take up to 48 hours, though it typically completes within a few minutes. Use a tool like <a href="https://www.whatsmydns.net" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">whatsmydns.net</a> to check propagation status worldwide.</p>
          </div>
          <div>
            <h3 className="font-semibold text-text-primary mb-1">Domain shows "Pending" after adding DNS records</h3>
            <p>Wait a few minutes for propagation, then click "Verify DNS Configuration" in your settings. If it still shows pending, double-check that the TXT record name and value match exactly what's shown in your dashboard.</p>
          </div>
          <div>
            <h3 className="font-semibold text-text-primary mb-1">SSL certificate not issued</h3>
            <p>Vercel issues SSL certificates automatically once DNS is verified. If using Cloudflare, make sure the CNAME record is set to "DNS only" (grey cloud), not "Proxied" (orange cloud). Cloudflare's proxy intercepts the SSL challenge.</p>
          </div>
          <div>
            <h3 className="font-semibold text-text-primary mb-1">Root domain (no www) not working</h3>
            <p>Some registrars don't support CNAME records on root domains. Options: use a <code className="text-accent">www.</code> subdomain instead, switch to a provider that supports ALIAS/ANAME records (like Cloudflare, Route 53, or Porkbun), or set up domain forwarding from your root to www.</p>
          </div>
        </div>

        <p className="text-xs text-text-secondary mt-10">
          Still stuck? Contact us at <a href="mailto:support@myepk.bio" className="text-accent hover:underline">support@myepk.bio</a>
        </p>
      </div>
    </div>
  )
}
```

**Step 2: Verify the route compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Manual test**

Run: `npm run dev`
- Navigate to `/support/custom-domain`
- Verify the page renders with all provider sections
- Click each accordion to confirm it expands/collapses
- Click the "Back to myEPK" link and the "dashboard settings" link

**Step 4: Commit**

```bash
git add src/routes/support/custom-domain.tsx
git commit -m "feat: add public custom domain setup support page"
```

---

### Task 5: End-to-end verification

**Step 1: Build check**

Run: `npm run build`
Expected: Clean build with no errors

**Step 2: Manual test the full BYOD flow**

1. Go to `/dashboard/settings` → Custom Domain → "Use your own" tab
2. Enter a test domain, click "Add Domain"
3. Verify DNS records table appears with CNAME and TXT records
4. Verify copy buttons work
5. Click "Verify DNS Configuration" — should show pending status
6. Click the support page link — opens `/support/custom-domain` in new tab
7. Verify all provider sections expand and content is correct

**Step 3: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: address any issues found during e2e verification"
```
