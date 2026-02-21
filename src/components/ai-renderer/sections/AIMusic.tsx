import { useAITokens } from '../AITokenProvider'
import { sanitizeEmbed } from '~/utils/sanitize'
import type { MixRow } from '~/types/database'

interface AIMusicProps {
  mixes: MixRow[]
}

export function AIMusic({ mixes }: AIMusicProps) {
  const tokens = useAITokens()
  const music = tokens.sections.music

  if (mixes.length === 0) return null

  return (
    <section
      id="music"
      className="px-4"
      style={{
        paddingBlock: music.padding || 'var(--ai-section-padding)',
        background: music.background || 'transparent',
        color: music.textColor || 'var(--ai-color-text)',
      }}
    >
      <div className="mx-auto" style={{ maxWidth: 'var(--ai-content-width)' }}>
        <h2
          className="mb-8"
          style={{
            fontFamily: 'var(--ai-font-h2)',
            fontSize: 'var(--ai-size-h2)',
            fontWeight: 'var(--ai-weight-h2)',
            color: 'var(--ai-color-heading)',
          }}
        >
          Music
        </h2>
        {music.variant === 'cards' && <MusicCards mixes={mixes} />}
        {music.variant === 'list' && <MusicList mixes={mixes} />}
        {music.variant === 'waveform' && <MusicWaveform mixes={mixes} />}
        {music.variant === 'featured' && <MusicFeatured mixes={mixes} />}
      </div>
    </section>
  )
}

/**
 * Renders a mix embed iframe. Uses sanitizeEmbed from ~/utils/sanitize
 * to sanitize the HTML before rendering — this is the same pattern used
 * throughout the existing public EPK page ($slug.tsx).
 */
function MixEmbed({ mix }: { mix: MixRow }) {
  if (!mix.embed_html) return null
  const sanitized = sanitizeEmbed(mix.embed_html)
  return (
    <div
      className="w-full [&_iframe]:w-full [&_iframe]:rounded-none"
      // Safe: content is sanitized via sanitizeEmbed() above
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  )
}

function MusicCards({ mixes }: AIMusicProps) {
  const tokens = useAITokens()
  const music = tokens.sections.music
  const cols = music.columnsDesktop ?? 3

  return (
    <div
      className="grid gap-4"
      style={{
        gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
      }}
    >
      {mixes.map((mix) => (
        <div
          key={mix.id}
          className="overflow-hidden border"
          style={{
            borderColor: 'var(--ai-color-border)',
            borderRadius: 'var(--ai-radius-md)',
            backgroundColor: 'var(--ai-color-surface)',
            boxShadow: `var(--ai-shadow-${tokens.decorative.shadow})`,
          }}
        >
          {mix.embed_html ? (
            <MixEmbed mix={mix} />
          ) : (
            <a
              href={mix.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block hover:opacity-90 transition-opacity"
            >
              {music.showCoverArt !== false && mix.image_url && (
                <img
                  src={mix.image_url}
                  alt={mix.title}
                  className="w-full aspect-video object-cover"
                  loading="lazy"
                />
              )}
              <div className="p-4">
                <p
                  className="font-semibold text-sm mb-1"
                  style={{ color: 'var(--ai-color-heading)' }}
                >
                  {mix.title}
                </p>
                {mix.description && (
                  <p
                    className="text-xs mb-1"
                    style={{ color: 'var(--ai-color-textMuted)' }}
                  >
                    {mix.description}
                  </p>
                )}
              </div>
            </a>
          )}
        </div>
      ))}
    </div>
  )
}

function MusicList({ mixes }: AIMusicProps) {
  const tokens = useAITokens()
  const music = tokens.sections.music

  return (
    <div
      className="divide-y"
      style={{ borderColor: 'var(--ai-color-border)' }}
    >
      {mixes.map((mix) =>
        mix.embed_html ? (
          <div key={mix.id} className="py-2">
            <MixEmbed mix={mix} />
          </div>
        ) : (
          <a
            key={mix.id}
            href={mix.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-4 py-3 px-2 hover:opacity-80 transition-opacity"
          >
            {music.showCoverArt !== false && mix.image_url && (
              <img
                src={mix.image_url}
                alt={mix.title}
                className="w-12 h-12 object-cover shrink-0"
                style={{ borderRadius: 'var(--ai-radius-sm)' }}
                loading="lazy"
              />
            )}
            <div className="min-w-0 flex-1">
              <p
                className="font-semibold text-sm"
                style={{ color: 'var(--ai-color-heading)' }}
              >
                {mix.title}
              </p>
              {mix.description && (
                <p
                  className="text-xs truncate"
                  style={{ color: 'var(--ai-color-textMuted)' }}
                >
                  {mix.description}
                </p>
              )}
            </div>
          </a>
        ),
      )}
    </div>
  )
}

function MusicWaveform({ mixes }: AIMusicProps) {
  const tokens = useAITokens()
  const music = tokens.sections.music

  return (
    <div className="space-y-6">
      {mixes.map((mix) => (
        <div
          key={mix.id}
          className="border overflow-hidden"
          style={{
            borderColor: 'var(--ai-color-border)',
            borderRadius: 'var(--ai-radius-md)',
            backgroundColor: 'var(--ai-color-surface)',
          }}
        >
          {mix.embed_html ? (
            <MixEmbed mix={mix} />
          ) : (
            <a
              href={mix.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-4 p-4 hover:opacity-80 transition-opacity"
            >
              {music.showCoverArt !== false && mix.image_url && (
                <img
                  src={mix.image_url}
                  alt={mix.title}
                  className="w-16 h-16 object-cover shrink-0"
                  style={{ borderRadius: 'var(--ai-radius-sm)' }}
                  loading="lazy"
                />
              )}
              <div className="flex-1 min-w-0">
                <p
                  className="font-semibold text-sm mb-1"
                  style={{ color: 'var(--ai-color-heading)' }}
                >
                  {mix.title}
                </p>
                {mix.description && (
                  <p
                    className="text-xs"
                    style={{ color: 'var(--ai-color-textMuted)' }}
                  >
                    {mix.description}
                  </p>
                )}
                {/* Waveform-style visual bar */}
                <div
                  className="mt-2 h-1 w-full rounded-full"
                  style={{ backgroundColor: 'var(--ai-color-accent)', opacity: 0.3 }}
                />
              </div>
            </a>
          )}
        </div>
      ))}
    </div>
  )
}

function MusicFeatured({ mixes }: AIMusicProps) {
  const tokens = useAITokens()
  const music = tokens.sections.music
  const [featured, ...rest] = mixes

  if (!featured) return null

  return (
    <div className="space-y-6">
      {/* Featured first mix */}
      <div
        className="border overflow-hidden"
        style={{
          borderColor: 'var(--ai-color-border)',
          borderRadius: 'var(--ai-radius-md)',
          backgroundColor: 'var(--ai-color-surface)',
          boxShadow: `var(--ai-shadow-${tokens.decorative.shadow})`,
        }}
      >
        {featured.embed_html ? (
          <MixEmbed mix={featured} />
        ) : (
          <a
            href={featured.url}
            target="_blank"
            rel="noopener noreferrer"
            className="grid md:grid-cols-[2fr_3fr] hover:opacity-90 transition-opacity"
          >
            {music.showCoverArt !== false && featured.image_url && (
              <div className="aspect-video md:aspect-auto overflow-hidden">
                <img
                  src={featured.image_url}
                  alt={featured.title}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
            )}
            <div className="p-6">
              <p
                className="text-lg font-semibold mb-2"
                style={{ color: 'var(--ai-color-heading)' }}
              >
                {featured.title}
              </p>
              {featured.description && (
                <p className="text-sm" style={{ color: 'var(--ai-color-textMuted)' }}>
                  {featured.description}
                </p>
              )}
            </div>
          </a>
        )}
      </div>

      {/* Remaining in grid */}
      {rest.length > 0 && (
        <div className="grid sm:grid-cols-2 gap-4">
          {rest.map((mix) => (
            <div
              key={mix.id}
              className="border overflow-hidden"
              style={{
                borderColor: 'var(--ai-color-border)',
                borderRadius: 'var(--ai-radius-md)',
                backgroundColor: 'var(--ai-color-surface)',
              }}
            >
              {mix.embed_html ? (
                <MixEmbed mix={mix} />
              ) : (
                <a
                  href={mix.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block hover:opacity-90 transition-opacity"
                >
                  {music.showCoverArt !== false && mix.image_url && (
                    <img
                      src={mix.image_url}
                      alt={mix.title}
                      className="w-full aspect-video object-cover"
                      loading="lazy"
                    />
                  )}
                  <div className="p-4">
                    <p
                      className="font-semibold text-sm"
                      style={{ color: 'var(--ai-color-heading)' }}
                    >
                      {mix.title}
                    </p>
                  </div>
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
