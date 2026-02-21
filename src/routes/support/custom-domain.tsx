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
          &larr; Back to myEPK
        </Link>

        <h1 className="text-3xl font-display font-extrabold tracking-tight uppercase mt-8 mb-4">
          Custom Domain Setup
        </h1>
        <p className="text-text-secondary text-sm mb-10 leading-relaxed">
          Connect your own domain to your myEPK page. You'll need to add two DNS records at your domain registrar: a <strong className="text-text-primary">CNAME</strong> record for routing and a <strong className="text-text-primary">TXT</strong> record for domain verification and SSL.
        </p>

        <div className="bg-surface border border-border p-5 mb-10">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-text-secondary mb-3">What you'll need</h2>
          <ul className="text-sm text-text-secondary space-y-2">
            <li>&bull; A <strong className="text-text-primary">CNAME</strong> record pointing to <code className="text-accent bg-card px-1.5 py-0.5">cname.vercel-dns.com</code></li>
            <li>&bull; A <strong className="text-text-primary">TXT</strong> record for verification — the exact name and value are shown in your <Link to="/dashboard/settings" className="text-accent hover:underline">dashboard settings</Link></li>
          </ul>
        </div>

        <h2 className="text-xs font-semibold uppercase tracking-wider text-text-secondary mb-4">Provider guides</h2>
        <div className="space-y-0 divide-y-0 mb-10">
          {PROVIDERS.map((p) => (
            <ProviderSection key={p.name} provider={p} />
          ))}
        </div>

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
