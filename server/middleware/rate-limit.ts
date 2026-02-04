// server/middleware/rate-limit.ts

interface Bucket {
  tokens: number
  lastRefill: number
}

const buckets = new Map<string, Bucket>()

// Clean up stale entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, bucket] of buckets) {
    if (now - bucket.lastRefill > 300_000) buckets.delete(key)
  }
}, 300_000)

function checkRateLimit(key: string, maxTokens: number, refillRatePerSecond: number): boolean {
  const now = Date.now()
  let bucket = buckets.get(key)

  if (!bucket) {
    bucket = { tokens: maxTokens - 1, lastRefill: now }
    buckets.set(key, bucket)
    return true
  }

  // Refill tokens based on elapsed time
  const elapsed = (now - bucket.lastRefill) / 1000
  bucket.tokens = Math.min(maxTokens, bucket.tokens + elapsed * refillRatePerSecond)
  bucket.lastRefill = now

  if (bucket.tokens < 1) return false

  bucket.tokens -= 1
  return true
}

// Rate limit config by path prefix
const RATE_LIMITS: Record<string, { maxTokens: number; refillRate: number }> = {
  '/api/booking-request': { maxTokens: 3, refillRate: 3 / 60 }, // 3 per minute
}

export default defineEventHandler((event) => {
  const path = getRequestURL(event).pathname
  const ip = getHeader(event, 'x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'

  for (const [prefix, config] of Object.entries(RATE_LIMITS)) {
    if (path.startsWith(prefix)) {
      const key = `${prefix}:${ip}`
      if (!checkRateLimit(key, config.maxTokens, config.refillRate)) {
        throw createError({ statusCode: 429, message: 'Too many requests. Please try again later.' })
      }
      break
    }
  }
})
