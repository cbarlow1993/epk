import sanitizeHtml from 'sanitize-html'

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ['h2', 'h3', 'p', 'br', 'strong', 'em', 'a', 'ul', 'ol', 'li'],
  allowedAttributes: {
    a: ['href', 'target', 'rel'],
  },
  transformTags: {
    a: sanitizeHtml.simpleTransform('a', { target: '_blank', rel: 'noopener noreferrer' }),
  },
}

export function sanitize(html: string): string {
  return sanitizeHtml(html, SANITIZE_OPTIONS)
}

const EMBED_SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ['iframe'],
  allowedAttributes: {
    iframe: ['src', 'width', 'height', 'frameborder', 'allow', 'allowfullscreen', 'style', 'title'],
  },
  allowedIframeHostnames: [
    'w.soundcloud.com', 'open.spotify.com', 'www.mixcloud.com',
    'www.youtube.com', 'www.youtube-nocookie.com', 'bandcamp.com',
  ],
}

export function sanitizeEmbed(html: string): string {
  return sanitizeHtml(html, EMBED_SANITIZE_OPTIONS)
}
