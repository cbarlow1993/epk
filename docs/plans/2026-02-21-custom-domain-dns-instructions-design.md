# Custom Domain DNS Instructions — Design

## Problem

After adding a BYOD custom domain, users see minimal instructions ("Add a CNAME record pointing to cname.vercel-dns.com"). The Vercel API returns TXT verification challenges, but the code discards them. Users have no way to see what DNS records are needed or verify their configuration.

## Solution

Two deliverables:

1. **Improved BYOD flow in Settings** — surface all required DNS records and add a verify button
2. **Public support page** at `/support/custom-domain` — step-by-step guides for popular DNS providers

---

## Part 1: Settings BYOD Flow

### Server Changes

**`addCustomDomain`** — return the `verification` array from the Vercel API response:
```ts
return { success: true, domain: data.domain, verification: responseData.verification || [] }
```

**`checkDomainStatus`** — return full status instead of just `configured: boolean`:
- Call `POST /projects/:id/domains/:domain/verify` to trigger Vercel re-check
- Call `GET /projects/:id/domains/:domain` to get current state
- Return: `{ verified, verification, configured: true }`

### UI Changes

After a domain is added, show a DNS setup card:

| Purpose | Type | Host/Name | Value |
|---------|------|-----------|-------|
| Routing | CNAME | `@` or `www` | `cname.vercel-dns.com` |
| Verification | TXT | `_vercel.example.com` | `vc-xxxxx...` (from API) |

- Copy-to-clipboard buttons on the values
- Status badge: "Pending" (yellow) or "Verified" (green)
- Note: root domains may need ALIAS/ANAME instead of CNAME at some registrars
- **"Verify DNS Configuration" button** — calls `checkDomainStatus`, triggers Vercel verify, refreshes UI state
- Link to `/support/custom-domain` for detailed provider guides

The pre-add state also gets the support page link so users know what's involved.

---

## Part 2: Public Support Page `/support/custom-domain`

A public route with step-by-step CNAME + TXT record instructions for:

- Cloudflare
- GoDaddy
- Namecheap
- Google Domains
- Route 53 (AWS)
- Porkbun

Each provider section includes:
- Where to find DNS settings
- Exact fields to fill in (with placeholder values)
- Screenshots-style descriptions of the UI flow

Plus a troubleshooting section covering:
- DNS propagation (can take up to 48h, typically minutes)
- Common mistakes (proxying in Cloudflare, wrong record type for root domains)
- How to check DNS propagation externally
