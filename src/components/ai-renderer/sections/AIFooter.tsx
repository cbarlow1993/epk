import { useAITokens } from '../AITokenProvider'
import { SocialIcon } from '~/components/SocialIcon'
import type { SocialLinkRow } from '~/types/database'

interface AIFooterProps {
  displayName: string
  socialLinks: SocialLinkRow[]
  hideBranding?: boolean
  tier?: string
}

export function AIFooter({ displayName, socialLinks, hideBranding, tier }: AIFooterProps) {
  const tokens = useAITokens()

  if (tokens.layout.footerStyle === 'hidden') return null

  if (tokens.layout.footerStyle === 'detailed') {
    return (
      <footer
        className="px-4 py-12 border-t"
        style={{
          borderColor: 'var(--ai-color-border)',
          backgroundColor: 'var(--ai-color-surface)',
          color: 'var(--ai-color-textMuted)',
          fontFamily: 'var(--ai-font-body)',
        }}
      >
        <div className="mx-auto" style={{ maxWidth: 'var(--ai-content-width)' }}>
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <p
              className="font-semibold"
              style={{ color: 'var(--ai-color-heading)', fontFamily: 'var(--ai-font-h3)' }}
            >
              {displayName}
            </p>
            {socialLinks.length > 0 && (
              <div className="flex items-center gap-3">
                {socialLinks.map((link) => (
                  <a
                    key={link.id}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={link.platform}
                    aria-label={`${link.platform} profile`}
                    className="w-8 h-8 rounded-full border flex items-center justify-center hover:opacity-80 transition-opacity"
                    style={{ borderColor: 'var(--ai-color-border)' }}
                  >
                    <SocialIcon platform={link.platform} />
                  </a>
                ))}
              </div>
            )}
          </div>
          {!(hideBranding && tier === 'pro') && (
            <p className="text-xs text-center mt-6 opacity-50">
              Built with <a href="/" className="hover:underline" style={{ color: 'var(--ai-color-accent)' }}>myEPK</a>
            </p>
          )}
        </div>
      </footer>
    )
  }

  // Minimal footer (default)
  return (
    <footer
      className="px-4 py-6 text-center border-t"
      style={{
        borderColor: 'var(--ai-color-border)',
        color: 'var(--ai-color-textMuted)',
        fontFamily: 'var(--ai-font-body)',
      }}
    >
      {!(hideBranding && tier === 'pro') && (
        <p className="text-xs opacity-50">
          Built with <a href="/" className="hover:underline" style={{ color: 'var(--ai-color-accent)' }}>myEPK</a>
        </p>
      )}
    </footer>
  )
}
