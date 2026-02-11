import { createFileRoute, redirect, isRedirect } from '@tanstack/react-router'
import { useState, useEffect, useRef, useCallback } from 'react'
import { getCurrentUser } from '~/server/auth'
import { checkSlugAvailability, completeOnboarding } from '~/server/profile'
import { createCheckoutSession } from '~/server/billing'
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

type Step = 'profile' | 'genres' | 'plan'

function OnboardingWizard() {
  const { profile } = Route.useRouteContext()

  const [step, setStep] = useState<Step>('profile')
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

  // Auto-generate slug as the user types their name
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false)

  const handleNameChange = (value: string) => {
    setDisplayName(value)
    if (nameError) setNameError('')
    if (!slugManuallyEdited) {
      const generated = generateSlug(value)
      setSlug(generated)
    }
  }

  const handleSlugChange = (value: string) => {
    const cleaned = value.toLowerCase().replace(/[^a-z0-9-]/g, '')
    setSlug(cleaned)
    setSlugManuallyEdited(true)
    setSlugAvailable(null)
    setSlugError('')
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

  const handleProfileNext = () => {
    const trimmed = displayName.trim()
    if (!trimmed) {
      setNameError('Please enter your DJ / artist name')
      return
    }
    if (trimmed.length > 100) {
      setNameError('Name must be 100 characters or less')
      return
    }
    if (!isValidSlugFormat(slug)) {
      setSlugError('Must be at least 2 characters, lowercase letters, numbers, and hyphens only')
      return
    }
    if (slugAvailable === false) return
    if (slugChecking) return
    setNameError('')
    setStep('genres')
  }

  const handleSaveAndShowPlan = async () => {
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
      setSubmitting(false)
      setStep('plan')
    } catch {
      setSubmitError('An unexpected error occurred')
      setSubmitting(false)
    }
  }

  const [upgrading, setUpgrading] = useState(false)
  const [upgradeError, setUpgradeError] = useState('')

  const handleUpgrade = async () => {
    setUpgrading(true)
    setUpgradeError('')
    try {
      const result = await createCheckoutSession({ data: {} })
      if ('url' in result && result.url) {
        window.location.href = result.url
      } else {
        setUpgradeError('error' in result && result.error ? result.error : 'Unable to start checkout')
        setUpgrading(false)
      }
    } catch {
      setUpgradeError('Something went wrong. Please try again.')
      setUpgrading(false)
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
    { key: 'profile', label: 'Profile' },
    { key: 'genres', label: 'Genres' },
    { key: 'plan', label: 'Plan' },
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
        {step === 'profile' && (
          <div>
            <h1 className="font-display font-extrabold text-3xl tracking-tight text-center mb-3">
              Set up your profile
            </h1>
            <p className="text-text-secondary text-center text-sm mb-8">
              Choose your name and claim your unique URL.
            </p>

            <div className="space-y-6 mb-8">
              <div>
                <label htmlFor="display_name" className={FORM_LABEL}>
                  Artist / DJ Name
                </label>
                <input
                  id="display_name"
                  type="text"
                  value={displayName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className={nameError ? FORM_INPUT_ERROR : FORM_INPUT}
                  placeholder="e.g. DJ Shadow, Bonobo, Peggy Gou"
                  autoFocus
                />
                {nameError && <p className={FORM_ERROR_MSG}>{nameError}</p>}
              </div>

              <div>
                <label htmlFor="slug" className={FORM_LABEL}>
                  Your EPK URL
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-text-secondary text-sm shrink-0">myepk.bio/</span>
                  <input
                    id="slug"
                    type="text"
                    value={slug}
                    onChange={(e) => handleSlugChange(e.target.value)}
                    className={`flex-1 bg-card border px-4 py-3 text-text-primary focus:border-accent focus:outline-none transition-colors text-sm ${
                      slugError ? 'border-red-500' : slugAvailable === true ? 'border-green-500' : 'border-text-primary/20'
                    }`}
                    placeholder="your-name"
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
            </div>

            <button
              type="button"
              onClick={handleProfileNext}
              disabled={!slugAvailable || slugChecking || !displayName.trim()}
              className={`w-full ${BTN_PRIMARY} py-3`}
            >
              Continue
            </button>
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
                onClick={() => setStep('profile')}
                className="px-6 py-3 text-sm font-semibold uppercase tracking-wider text-text-secondary hover:text-text-primary transition-colors"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleSaveAndShowPlan}
                disabled={submitting}
                className={`flex-1 ${BTN_PRIMARY} py-3`}
              >
                {submitting ? 'Saving...' : 'Continue'}
              </button>
            </div>
          </div>
        )}

        {step === 'plan' && (
          <div className="max-w-2xl mx-auto">
            <h1 className="font-display font-extrabold text-3xl tracking-tight text-center mb-3">
              Choose your plan
            </h1>
            <p className="text-text-secondary text-center text-sm mb-10">
              Get started for free, or unlock everything with Pro.
            </p>

            <div className="grid sm:grid-cols-2 gap-6">
              {/* Free plan */}
              <div className="border border-border bg-surface p-6 flex flex-col">
                <h3 className="font-display font-bold text-lg uppercase tracking-wider">Free</h3>
                <p className="text-3xl font-extrabold mt-2">
                  $0<span className="text-sm font-normal text-text-secondary">/month</span>
                </p>
                <ul className="mt-6 space-y-3 flex-1">
                  {[
                    'Professional EPK page',
                    'Custom URL slug',
                    'Mixes, events & photos',
                    'Technical rider & contact',
                    'Social links',
                  ].map((f) => (
                    <li key={f} className="flex gap-2.5 text-sm">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-text-secondary flex-shrink-0 mt-0.5">
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                      <span className="text-text-secondary">{f}</span>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => { window.location.href = '/dashboard' }}
                  className="mt-6 w-full py-3 border border-border text-text-secondary text-sm font-semibold uppercase tracking-wider hover:border-text-secondary hover:text-text-primary transition-colors"
                >
                  Continue with Free
                </button>
              </div>

              {/* Pro plan */}
              <div className="border-2 border-accent bg-accent/5 p-6 flex flex-col relative">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-accent text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1">
                  Recommended
                </div>
                <h3 className="font-display font-bold text-lg uppercase tracking-wider text-accent">Pro</h3>
                <p className="text-3xl font-extrabold mt-2">
                  $5<span className="text-sm font-normal text-text-secondary">/month</span>
                </p>
                <ul className="mt-6 space-y-3 flex-1">
                  <li className="flex gap-2.5 text-sm">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-accent flex-shrink-0 mt-0.5">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                    <span className="text-text-primary font-medium">Everything in Free, plus:</span>
                  </li>
                  {[
                    'Custom domain',
                    'Remove platform branding',
                    'SEO & social preview controls',
                    'Advanced theme customization',
                  ].map((f) => (
                    <li key={f} className="flex gap-2.5 text-sm">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-accent flex-shrink-0 mt-0.5">
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                      <span className="text-text-primary">{f}</span>
                    </li>
                  ))}
                </ul>

                {upgradeError && <p className="mt-4 text-xs text-red-500">{upgradeError}</p>}

                <button
                  type="button"
                  onClick={handleUpgrade}
                  disabled={upgrading}
                  className={`mt-6 w-full ${BTN_PRIMARY} py-3`}
                >
                  {upgrading ? 'Redirecting...' : 'Upgrade Now'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
