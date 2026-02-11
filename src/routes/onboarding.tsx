import { createFileRoute, redirect, isRedirect } from '@tanstack/react-router'
import { useState, useEffect, useRef, useCallback } from 'react'
import { getCurrentUser } from '~/server/auth'
import { checkSlugAvailability, completeOnboarding } from '~/server/profile'
import { FORM_INPUT, FORM_INPUT_ERROR, FORM_LABEL, FORM_ERROR_MSG, BTN_PRIMARY } from '~/components/forms'
import { PREDEFINED_GENRES } from '~/utils/genres'
import { RESERVED_SLUGS } from '~/utils/constants'

export const Route = createFileRoute('/onboarding')({
  beforeLoad: async () => {
    try {
      const result = await getCurrentUser()
      if (!result) {
        throw redirect({ to: '/login' })
      }
      if (!result.user.email_confirmed_at) {
        throw redirect({ to: '/verify-email' })
      }
      if (result.profile?.onboarding_completed) {
        throw redirect({ to: '/dashboard' })
      }
      return { user: result.user, profile: result.profile }
    } catch (e) {
      if (isRedirect(e)) throw e
      throw redirect({ to: '/login' })
    }
  },
  component: OnboardingWizard,
})

type Step = 'name' | 'slug' | 'genres'

function OnboardingWizard() {
  const { profile } = Route.useRouteContext()

  const [step, setStep] = useState<Step>('name')
  const [displayName, setDisplayName] = useState(profile?.display_name || '')
  const [slug, setSlug] = useState(profile?.slug || '')
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null)
  const [slugChecking, setSlugChecking] = useState(false)
  const [slugError, setSlugError] = useState('')
  const [genres, setGenres] = useState<string[]>(profile?.genres || [])
  const [customGenre, setCustomGenre] = useState('')
  const [nameError, setNameError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const slugTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Generate slug from display name
  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  }

  // Validate slug format client-side
  const isValidSlugFormat = (s: string) => {
    return s.length >= 2 && s.length <= 50 && /^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(s)
  }

  // Debounced slug availability check
  const checkSlug = useCallback(async (slugValue: string) => {
    if (!isValidSlugFormat(slugValue)) {
      setSlugAvailable(null)
      setSlugChecking(false)
      return
    }
    if (RESERVED_SLUGS.has(slugValue)) {
      setSlugAvailable(false)
      setSlugError('This URL is reserved')
      setSlugChecking(false)
      return
    }
    setSlugChecking(true)
    setSlugError('')
    try {
      const result = await checkSlugAvailability({ data: { slug: slugValue } })
      if ('available' in result) {
        setSlugAvailable(result.available)
        if (!result.available && 'reason' in result) {
          setSlugError(result.reason as string)
        }
      }
    } catch {
      setSlugError('Could not check availability')
    } finally {
      setSlugChecking(false)
    }
  }, [])

  useEffect(() => {
    if (slugTimerRef.current) clearTimeout(slugTimerRef.current)
    if (!slug || slug.length < 2) {
      setSlugAvailable(null)
      return
    }
    slugTimerRef.current = setTimeout(() => {
      checkSlug(slug)
    }, 400)
    return () => {
      if (slugTimerRef.current) clearTimeout(slugTimerRef.current)
    }
  }, [slug, checkSlug])

  const handleNameNext = () => {
    const trimmed = displayName.trim()
    if (!trimmed) {
      setNameError('Please enter your DJ / artist name')
      return
    }
    if (trimmed.length > 100) {
      setNameError('Name must be 100 characters or less')
      return
    }
    setNameError('')
    // Auto-generate a slug from the name if the user hasn't customized it yet
    const currentSlugIsAuto = slug === generateSlug(profile?.display_name || '') || slug === profile?.slug || !slug
    if (currentSlugIsAuto) {
      const generated = generateSlug(trimmed)
      if (generated.length >= 2) {
        setSlug(generated)
      }
    }
    setStep('slug')
  }

  const handleSlugNext = () => {
    if (!isValidSlugFormat(slug)) {
      setSlugError('Must be at least 2 characters, lowercase letters, numbers, and hyphens only')
      return
    }
    if (slugAvailable === false) return
    if (slugChecking) return
    setStep('genres')
  }

  const handleComplete = async () => {
    setSubmitting(true)
    setSubmitError('')
    try {
      const result = await completeOnboarding({
        data: {
          display_name: displayName.trim(),
          slug,
          genres,
        },
      })
      if (result && 'error' in result && result.error) {
        setSubmitError(result.error)
        setSubmitting(false)
        return
      }
      window.location.href = '/dashboard'
    } catch {
      setSubmitError('An unexpected error occurred')
      setSubmitting(false)
    }
  }

  const toggleGenre = (genre: string) => {
    setGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre],
    )
  }

  const addCustomGenre = () => {
    const trimmed = customGenre.trim()
    if (trimmed && !genres.includes(trimmed) && genres.length < 20) {
      setGenres((prev) => [...prev, trimmed])
      setCustomGenre('')
    }
  }

  // Step indicator
  const steps: { key: Step; label: string }[] = [
    { key: 'name', label: 'Name' },
    { key: 'slug', label: 'URL' },
    { key: 'genres', label: 'Genres' },
  ]
  const currentIdx = steps.findIndex((s) => s.key === step)

  return (
    <div className="theme-dark min-h-screen bg-bg font-body flex flex-col items-center justify-center px-4">
      {/* Progress indicator */}
      <div className="flex items-center gap-3 mb-12">
        {steps.map((s, i) => (
          <div key={s.key} className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  i < currentIdx
                    ? 'bg-accent text-white'
                    : i === currentIdx
                      ? 'bg-accent text-white'
                      : 'bg-surface border border-border text-text-secondary'
                }`}
              >
                {i < currentIdx ? (
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  i + 1
                )}
              </div>
              <span
                className={`text-xs font-semibold uppercase tracking-wider hidden sm:inline ${
                  i <= currentIdx ? 'text-text-primary' : 'text-text-secondary'
                }`}
              >
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={`w-8 h-px transition-colors ${
                  i < currentIdx ? 'bg-accent' : 'bg-border'
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      <div className="w-full max-w-lg">
        {step === 'name' && (
          <div>
            <h1 className="font-display font-extrabold text-3xl tracking-tight text-center mb-3">
              What's your DJ name?
            </h1>
            <p className="text-text-secondary text-center text-sm mb-8">
              This is how you'll appear on your press kit.
            </p>

            <div className="mb-6">
              <label htmlFor="display_name" className={FORM_LABEL}>
                Artist / DJ Name
              </label>
              <input
                id="display_name"
                type="text"
                value={displayName}
                onChange={(e) => {
                  setDisplayName(e.target.value)
                  if (nameError) setNameError('')
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleNameNext()
                  }
                }}
                className={nameError ? FORM_INPUT_ERROR : FORM_INPUT}
                placeholder="e.g. DJ Shadow, Bonobo, Peggy Gou"
                autoFocus
              />
              {nameError && <p className={FORM_ERROR_MSG}>{nameError}</p>}
            </div>

            <button
              type="button"
              onClick={handleNameNext}
              className={`w-full ${BTN_PRIMARY} py-3`}
            >
              Continue
            </button>
          </div>
        )}

        {step === 'slug' && (
          <div>
            <h1 className="font-display font-extrabold text-3xl tracking-tight text-center mb-3">
              Choose your URL
            </h1>
            <p className="text-text-secondary text-center text-sm mb-8">
              This is the unique link to your press kit. You can change it later.
            </p>

            <div className="mb-6">
              <label htmlFor="slug" className={FORM_LABEL}>
                Your EPK URL
              </label>
              <div className="flex items-center gap-2">
                <span className="text-text-secondary text-sm shrink-0">myepk.bio/</span>
                <input
                  id="slug"
                  type="text"
                  value={slug}
                  onChange={(e) => {
                    const cleaned = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')
                    setSlug(cleaned)
                    setSlugAvailable(null)
                    setSlugError('')
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleSlugNext()
                    }
                  }}
                  className={`flex-1 bg-card border px-4 py-3 text-text-primary focus:border-accent focus:outline-none transition-colors text-sm ${
                    slugError ? 'border-red-500' : slugAvailable === true ? 'border-green-500' : 'border-text-primary/20'
                  }`}
                  placeholder="your-name"
                  autoFocus
                />
              </div>

              {/* Slug status indicator */}
              <div className="mt-2 h-5">
                {slugChecking && (
                  <p className="text-xs text-text-secondary">Checking availability...</p>
                )}
                {!slugChecking && slugAvailable === true && slug.length >= 2 && (
                  <p className="text-xs text-green-500 flex items-center gap-1">
                    <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    myepk.bio/{slug} is available
                  </p>
                )}
                {!slugChecking && slugError && (
                  <p className={FORM_ERROR_MSG}>{slugError}</p>
                )}
                {!slugChecking && !slugError && slug.length > 0 && slug.length < 2 && (
                  <p className="text-xs text-text-secondary">Must be at least 2 characters</p>
                )}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep('name')}
                className="px-6 py-3 text-sm font-semibold uppercase tracking-wider text-text-secondary hover:text-text-primary transition-colors"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleSlugNext}
                disabled={!slugAvailable || slugChecking}
                className={`flex-1 ${BTN_PRIMARY} py-3`}
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {step === 'genres' && (
          <div>
            <h1 className="font-display font-extrabold text-3xl tracking-tight text-center mb-3">
              What do you play?
            </h1>
            <p className="text-text-secondary text-center text-sm mb-8">
              Select your genres so promoters can find you. You can update these anytime.
            </p>

            <div className="mb-6">
              <label className={FORM_LABEL}>Genres</label>
              <div className="flex flex-wrap gap-2 mb-4">
                {PREDEFINED_GENRES.map((genre) => (
                  <button
                    key={genre}
                    type="button"
                    onClick={() => toggleGenre(genre)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
                      genres.includes(genre)
                        ? 'bg-accent text-white'
                        : 'bg-card border border-border text-text-secondary hover:border-accent/30'
                    }`}
                  >
                    {genre}
                  </button>
                ))}
              </div>

              {/* Custom genres shown as removable pills */}
              {genres.filter((g) => !(PREDEFINED_GENRES as readonly string[]).includes(g)).length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {genres
                    .filter((g) => !(PREDEFINED_GENRES as readonly string[]).includes(g))
                    .map((genre) => (
                      <button
                        key={genre}
                        type="button"
                        onClick={() => toggleGenre(genre)}
                        className="px-3 py-1.5 rounded-full text-xs font-bold bg-accent text-white transition-colors"
                      >
                        {genre} &times;
                      </button>
                    ))}
                </div>
              )}

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Add custom genre..."
                  value={customGenre}
                  onChange={(e) => setCustomGenre(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addCustomGenre()
                    }
                  }}
                  className={FORM_INPUT}
                />
              </div>
            </div>

            {submitError && (
              <div className="border border-red-500/50 bg-red-500/10 rounded-lg px-4 py-3 mb-6 text-red-400 text-sm">
                {submitError}
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep('slug')}
                className="px-6 py-3 text-sm font-semibold uppercase tracking-wider text-text-secondary hover:text-text-primary transition-colors"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleComplete}
                disabled={submitting}
                className={`flex-1 ${BTN_PRIMARY} py-3`}
              >
                {submitting ? 'Setting up...' : 'Complete Setup'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
