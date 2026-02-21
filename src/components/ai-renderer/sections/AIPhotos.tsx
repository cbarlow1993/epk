import { useState } from 'react'
import { useAITokens } from '../AITokenProvider'

type PhotoRow = { id: string; image_url: string; caption: string | null; sort_order: number }

interface AIPhotosProps {
  photos: PhotoRow[]
}

export function AIPhotos({ photos }: AIPhotosProps) {
  const tokens = useAITokens()
  const photosTokens = tokens.sections.photos

  if (photos.length === 0) return null

  return (
    <section
      id="photos"
      className="px-4"
      style={{
        paddingBlock: photosTokens.padding || 'var(--ai-section-padding)',
        background: photosTokens.background || 'transparent',
        color: photosTokens.textColor || 'var(--ai-color-text)',
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
          Photos
        </h2>
        {photosTokens.variant === 'masonry' && <PhotosMasonry photos={photos} />}
        {photosTokens.variant === 'grid' && <PhotosGrid photos={photos} />}
        {photosTokens.variant === 'carousel' && <PhotosCarousel photos={photos} />}
        {photosTokens.variant === 'lightbox' && <PhotosLightbox photos={photos} />}
      </div>
    </section>
  )
}

function PhotosMasonry({ photos }: AIPhotosProps) {
  const tokens = useAITokens()
  const photosTokens = tokens.sections.photos
  const cols = photosTokens.columnsDesktop ?? 3

  return (
    <div
      className="space-y-4"
      style={{
        columnCount: cols,
        columnGap: photosTokens.gap || '1rem',
      }}
    >
      {photos.map((photo) => (
        <div key={photo.id} className="break-inside-avoid mb-4">
          <img
            src={photo.image_url}
            alt={photo.caption || ''}
            className="w-full h-auto"
            style={{ borderRadius: 'var(--ai-radius-md)' }}
            loading="lazy"
          />
          {photo.caption && (
            <p
              className="text-xs mt-1"
              style={{ color: 'var(--ai-color-textMuted)' }}
            >
              {photo.caption}
            </p>
          )}
        </div>
      ))}
    </div>
  )
}

function PhotosGrid({ photos }: AIPhotosProps) {
  const tokens = useAITokens()
  const photosTokens = tokens.sections.photos
  const cols = photosTokens.columnsDesktop ?? 3
  const aspectRatio = photosTokens.aspectRatio ?? 'square'

  const aspectClass =
    aspectRatio === 'square' ? 'aspect-square' :
    aspectRatio === 'landscape' ? 'aspect-video' :
    aspectRatio === 'portrait' ? 'aspect-[3/4]' :
    ''

  return (
    <div
      className="grid gap-4"
      style={{
        gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
        gap: photosTokens.gap || '1rem',
      }}
    >
      {photos.map((photo) => (
        <div key={photo.id} className="overflow-hidden" style={{ borderRadius: 'var(--ai-radius-md)' }}>
          <img
            src={photo.image_url}
            alt={photo.caption || ''}
            className={`w-full object-cover ${aspectClass}`}
            loading="lazy"
          />
          {photo.caption && (
            <p
              className="text-xs mt-1 px-1"
              style={{ color: 'var(--ai-color-textMuted)' }}
            >
              {photo.caption}
            </p>
          )}
        </div>
      ))}
    </div>
  )
}

function PhotosCarousel({ photos }: AIPhotosProps) {
  return (
    <div className="relative">
      <div
        className="flex gap-4 overflow-x-auto pb-4"
        style={{ scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch' }}
      >
        {photos.map((photo) => (
          <div
            key={photo.id}
            className="flex-none w-[300px] shrink-0"
            style={{ scrollSnapAlign: 'start' }}
          >
            <img
              src={photo.image_url}
              alt={photo.caption || ''}
              className="w-full aspect-[4/3] object-cover"
              style={{ borderRadius: 'var(--ai-radius-md)' }}
              loading="lazy"
            />
            {photo.caption && (
              <p
                className="text-xs mt-1"
                style={{ color: 'var(--ai-color-textMuted)' }}
              >
                {photo.caption}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function PhotosLightbox({ photos }: AIPhotosProps) {
  const tokens = useAITokens()
  const photosTokens = tokens.sections.photos
  const cols = photosTokens.columnsDesktop ?? 3
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  return (
    <>
      <div
        className="grid gap-4"
        style={{
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
          gap: photosTokens.gap || '1rem',
        }}
      >
        {photos.map((photo, index) => (
          <button
            key={photo.id}
            type="button"
            onClick={() => setLightboxIndex(index)}
            className="overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
            style={{ borderRadius: 'var(--ai-radius-md)' }}
          >
            <img
              src={photo.image_url}
              alt={photo.caption || ''}
              className="w-full aspect-square object-cover"
              loading="lazy"
            />
          </button>
        ))}
      </div>

      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={() => setLightboxIndex(null)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setLightboxIndex(null)
            if (e.key === 'ArrowLeft') setLightboxIndex((prev) => prev !== null && prev > 0 ? prev - 1 : prev)
            if (e.key === 'ArrowRight') setLightboxIndex((prev) => prev !== null && prev < photos.length - 1 ? prev + 1 : prev)
          }}
          tabIndex={0}
          role="dialog"
          aria-modal="true"
          ref={(el) => { if (el) el.focus() }}
        >
          <button
            onClick={() => setLightboxIndex(null)}
            className="absolute top-4 right-4 text-white/70 hover:text-white text-2xl z-10"
            aria-label="Close lightbox"
          >
            ✕
          </button>

          {lightboxIndex > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); setLightboxIndex(lightboxIndex - 1) }}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white text-3xl z-10"
              aria-label="Previous photo"
            >
              ‹
            </button>
          )}

          {lightboxIndex < photos.length - 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); setLightboxIndex(lightboxIndex + 1) }}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white text-3xl z-10"
              aria-label="Next photo"
            >
              ›
            </button>
          )}

          <div onClick={(e) => e.stopPropagation()} className="max-w-5xl max-h-[90vh] flex flex-col items-center">
            <img
              src={photos[lightboxIndex].image_url}
              alt={photos[lightboxIndex].caption || ''}
              className="max-w-full max-h-[80vh] object-contain"
            />
            {photos[lightboxIndex].caption && (
              <p className="text-white/70 text-sm mt-3 text-center px-4">
                {photos[lightboxIndex].caption}
              </p>
            )}
            <p className="text-white/40 text-xs mt-2" aria-live="polite">
              {lightboxIndex + 1} / {photos.length}
            </p>
          </div>
        </div>
      )}
    </>
  )
}
