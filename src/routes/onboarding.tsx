import { createFileRoute, redirect, isRedirect } from '@tanstack/react-router'
import { useState, useEffect, useRef, useCallback } from 'react'
import { getCurrentUser } from '~/server/auth'
import { checkSlugAvailability, completeOnboarding, updateProfile } from '~/server/profile'
import { createCheckoutSession } from '~/server/billing'
import { upsertMix } from '~/server/mixes'
import { upsertEvent } from '~/server/events'
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

type Step = 'profile' | 'genres' | 'music' | 'events' | 'plan' | 'publish'

const STEP_META: { key: Step; label: string }[] = [
  { key: 'profile', label: 'Profile' },
  { key: 'genres', label: 'Genres' },
  { key: 'music', label: 'Music' },
  { key: 'events', label: 'Events' },
  { key: 'plan', label: 'Plan' },
  { key: 'publish', label: 'Launch' },
]

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className || 'w-4 h-4'}>
      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
    </svg>
  )
}

function CheckLine({ className }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M20 6L9 17l-5-5" />
    </svg>
  )
}

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

  // Music step state
  const [mixes, setMixes] = useState<{ title: string; url: string }[]>([])
  const [mixTitle, setMixTitle] = useState('')
  const [mixUrl, setMixUrl] = useState('')
  const [mixSaving, setMixSaving] = useState(false)
  const [mixError, setMixError] = useState('')

  // Events step state
  const [events, setEvents] = useState<{ name: string; date: string }[]>([])
  const [eventName, setEventName] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [eventSaving, setEventSaving] = useState(false)
  const [eventError, setEventError] = useState('')

  // Plan step state
  const [upgrading, setUpgrading] = useState(false)
  const [upgradeError, setUpgradeError] = useState('')

  // Publish step state
  const [publishing, setPublishing] = useState(false)

  const slugTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // --- Profile step logic ---

  const generateSlug = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  }

  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false)

  const handleNameChange = (value: string) => {
    setDisplayName(value)
    if (nameError) setNameError('')
    if (!slugManuallyEdited) {
      setSlug(generateSlug(value))
    }
  }

  const handleSlugChange = (value: string) => {
    const cleaned = value.toLowerCase().replace(/[^a-z0-9-]/g, '')
    setSlug(cleaned)
    setSlugManuallyEdited(true)
    setSlugAvailable(null)
    setSlugError('')
  }

  const isValidSlugFormat = (s: string) => {
    return s.length >= 2 && s.length <= 50 && /^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(s)
  }

  const checkSlugFn = useCallback(async (slugValue: string) => {
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
    slugTimerRef.current = setTimeout(() => { checkSlugFn(slug) }, 400)
    return () => { if (slugTimerRef.current) clearTimeout(slugTimerRef.current) }
  }, [slug, checkSlugFn])

  const handleProfileNext = () => {
    const trimmed = displayName.trim()
    if (!trimmed) { setNameError('Please enter your DJ / artist name'); return }
    if (trimmed.length > 100) { setNameError('Name must be 100 characters or less'); return }
    if (!isValidSlugFormat(slug)) { setSlugError('Must be at least 2 characters, lowercase letters, numbers, and hyphens only'); return }
    if (slugAvailable === false || slugChecking) return
    setNameError('')
    setStep('genres')
  }

  // --- Genres → save profile + advance ---

  const handleSaveProfile = async (nextStep: Step) => {
    setSubmitting(true)
    setSubmitError('')
    try {
      const result = await completeOnboarding({
        data: { display_name: displayName.trim(), slug, genres },
      })
      if (result && 'error' in result && result.error) {
        setSubmitError(result.error)
        setSubmitting(false)
        return
      }
      setSubmitting(false)
      setStep(nextStep)
    } catch {
      setSubmitError('An unexpected error occurred')
      setSubmitting(false)
    }
  }

  // --- Music step logic ---

  const handleAddMix = async () => {
    if (!mixTitle.trim() || !mixUrl.trim()) {
      setMixError('Title and URL are required')
      return
    }
    setMixSaving(true)
    setMixError('')
    try {
      const result = await upsertMix({
        data: { title: mixTitle.trim(), url: mixUrl.trim(), category: 'Mixes', sort_order: mixes.length },
      })
      if (result && 'error' in result && result.error) {
        setMixError(typeof result.error === 'string' ? result.error : 'Failed to add mix')
      } else {
        setMixes((prev) => [...prev, { title: mixTitle.trim(), url: mixUrl.trim() }])
        setMixTitle('')
        setMixUrl('')
      }
    } catch {
      setMixError('Failed to add mix')
    } finally {
      setMixSaving(false)
    }
  }

  // --- Events step logic ---

  const handleAddEvent = async () => {
    if (!eventName.trim()) {
      setEventError('Event name is required')
      return
    }
    setEventSaving(true)
    setEventError('')
    try {
      const result = await upsertEvent({
        data: {
          name: eventName.trim(),
          category: 'Events',
          sort_order: events.length,
          ...(eventDate ? { event_date: eventDate } : {}),
        },
      })
      if (result && 'error' in result && result.error) {
        setEventError(typeof result.error === 'string' ? result.error : 'Failed to add event')
      } else {
        setEvents((prev) => [...prev, { name: eventName.trim(), date: eventDate }])
        setEventName('')
        setEventDate('')
      }
    } catch {
      setEventError('Failed to add event')
    } finally {
      setEventSaving(false)
    }
  }

  // --- Plan step logic ---

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

  // --- Publish step logic ---

  const handlePublish = async () => {
    setPublishing(true)
    try {
      await updateProfile({ data: { published: true } })
      window.location.href = '/dashboard'
    } catch {
      setPublishing(false)
    }
  }

  // --- Genre helpers ---

  const toggleGenre = (genre: string) => {
    setGenres((prev) => prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre])
  }

  const addCustomGenre = () => {
    const trimmed = customGenre.trim()
    if (trimmed && !genres.includes(trimmed) && genres.length < 20) {
      setGenres((prev) => [...prev, trimmed])
      setCustomGenre('')
    }
  }

  // --- Render ---

  const currentIdx = STEP_META.findIndex((s) => s.key === step)

  return (
    <div className="theme-dark min-h-screen bg-bg font-body flex flex-col items-center justify-center px-4 py-12">
      {/* Progress indicator */}
      <div className="flex items-center gap-2 sm:gap-3 mb-12 flex-wrap justify-center">
        {STEP_META.map((s, i) => (
          <div key={s.key} className="flex items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-1.5">
              <div
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  i < currentIdx
                    ? 'bg-accent text-white'
                    : i === currentIdx
                      ? 'bg-accent text-white'
                      : 'bg-surface border border-border text-text-secondary'
                }`}
              >
                {i < currentIdx ? <CheckIcon /> : i + 1}
              </div>
              <span
                className={`text-[10px] sm:text-xs font-semibold uppercase tracking-wider hidden sm:inline ${
                  i <= currentIdx ? 'text-text-primary' : 'text-text-secondary'
                }`}
              >
                {s.label}
              </span>
            </div>
            {i < STEP_META.length - 1 && (
              <div className={`w-4 sm:w-8 h-px transition-colors ${i < currentIdx ? 'bg-accent' : 'bg-border'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      <div className="w-full max-w-lg">

        {/* ====== STEP 1: Profile ====== */}
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
                <label htmlFor="display_name" className={FORM_LABEL}>Artist / DJ Name</label>
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
                <label htmlFor="slug" className={FORM_LABEL}>Your EPK URL</label>
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
                <div className="mt-2 h-5">
                  {slugChecking && <p className="text-xs text-text-secondary">Checking availability...</p>}
                  {!slugChecking && slugAvailable === true && slug.length >= 2 && (
                    <p className="text-xs text-green-500 flex items-center gap-1">
                      <CheckIcon className="w-3.5 h-3.5" />
                      myepk.bio/{slug} is available
                    </p>
                  )}
                  {!slugChecking && slugError && <p className={FORM_ERROR_MSG}>{slugError}</p>}
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

        {/* ====== STEP 2: Genres ====== */}
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

              {genres.filter((g) => !(PREDEFINED_GENRES as readonly string[]).includes(g)).length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {genres.filter((g) => !(PREDEFINED_GENRES as readonly string[]).includes(g)).map((genre) => (
                    <button key={genre} type="button" onClick={() => toggleGenre(genre)} className="px-3 py-1.5 rounded-full text-xs font-bold bg-accent text-white transition-colors">
                      {genre} &times;
                    </button>
                  ))}
                </div>
              )}

              <input
                type="text"
                placeholder="Add custom genre..."
                value={customGenre}
                onChange={(e) => setCustomGenre(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomGenre() } }}
                className={FORM_INPUT}
              />
            </div>

            {submitError && (
              <div className="border border-red-500/50 bg-red-500/10 rounded-lg px-4 py-3 mb-6 text-red-400 text-sm">{submitError}</div>
            )}

            <div className="flex gap-3">
              <button type="button" onClick={() => setStep('profile')} className="px-6 py-3 text-sm font-semibold uppercase tracking-wider text-text-secondary hover:text-text-primary transition-colors">
                Back
              </button>
              <button
                type="button"
                onClick={() => handleSaveProfile('music')}
                disabled={submitting}
                className={`flex-1 ${BTN_PRIMARY} py-3`}
              >
                {submitting ? 'Saving...' : 'Continue'}
              </button>
            </div>
          </div>
        )}

        {/* ====== STEP 3: Music ====== */}
        {step === 'music' && (
          <div>
            <h1 className="font-display font-extrabold text-3xl tracking-tight text-center mb-3">
              Add your music
            </h1>
            <p className="text-text-secondary text-center text-sm mb-8">
              Share links to your mixes, tracks, or sets. SoundCloud, Spotify, Mixcloud, and more.
            </p>

            {/* Added mixes list */}
            {mixes.length > 0 && (
              <div className="mb-6 space-y-2">
                {mixes.map((mix, i) => (
                  <div key={i} className="flex items-center gap-3 bg-surface border border-border px-4 py-3">
                    <CheckLine className="text-accent flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate">{mix.title}</p>
                      <p className="text-xs text-text-secondary truncate">{mix.url}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-4 mb-6">
              <div>
                <label htmlFor="mix_title" className={FORM_LABEL}>Title</label>
                <input
                  id="mix_title"
                  type="text"
                  value={mixTitle}
                  onChange={(e) => { setMixTitle(e.target.value); setMixError('') }}
                  className={FORM_INPUT}
                  placeholder="e.g. Summer Terrace Mix 2026"
                />
              </div>
              <div>
                <label htmlFor="mix_url" className={FORM_LABEL}>URL</label>
                <input
                  id="mix_url"
                  type="url"
                  value={mixUrl}
                  onChange={(e) => { setMixUrl(e.target.value); setMixError('') }}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddMix() } }}
                  className={FORM_INPUT}
                  placeholder="https://soundcloud.com/..."
                />
              </div>
              {mixError && <p className={FORM_ERROR_MSG}>{mixError}</p>}
              <button
                type="button"
                onClick={handleAddMix}
                disabled={mixSaving || !mixTitle.trim() || !mixUrl.trim()}
                className="w-full py-2.5 border border-accent text-accent text-sm font-semibold uppercase tracking-wider hover:bg-accent/10 transition-colors disabled:opacity-50"
              >
                {mixSaving ? 'Adding...' : 'Add Mix'}
              </button>
            </div>

            <div className="flex gap-3">
              <button type="button" onClick={() => setStep('genres')} className="px-6 py-3 text-sm font-semibold uppercase tracking-wider text-text-secondary hover:text-text-primary transition-colors">
                Back
              </button>
              <button type="button" onClick={() => setStep('events')} className={`flex-1 ${BTN_PRIMARY} py-3`}>
                {mixes.length > 0 ? 'Continue' : 'Skip for Now'}
              </button>
            </div>
          </div>
        )}

        {/* ====== STEP 4: Events ====== */}
        {step === 'events' && (
          <div>
            <h1 className="font-display font-extrabold text-3xl tracking-tight text-center mb-3">
              Add your events
            </h1>
            <p className="text-text-secondary text-center text-sm mb-8">
              Showcase venues, festivals, or brands you've played for.
            </p>

            {/* Added events list */}
            {events.length > 0 && (
              <div className="mb-6 space-y-2">
                {events.map((ev, i) => (
                  <div key={i} className="flex items-center gap-3 bg-surface border border-border px-4 py-3">
                    <CheckLine className="text-accent flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate">{ev.name}</p>
                      {ev.date && <p className="text-xs text-text-secondary">{ev.date}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-4 mb-6">
              <div>
                <label htmlFor="event_name" className={FORM_LABEL}>Event / Venue Name</label>
                <input
                  id="event_name"
                  type="text"
                  value={eventName}
                  onChange={(e) => { setEventName(e.target.value); setEventError('') }}
                  className={FORM_INPUT}
                  placeholder="e.g. Fabric London, Tomorrowland"
                />
              </div>
              <div>
                <label htmlFor="event_date" className={FORM_LABEL}>Date <span className="text-text-secondary font-normal normal-case tracking-normal">(optional)</span></label>
                <input
                  id="event_date"
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddEvent() } }}
                  className={FORM_INPUT}
                />
              </div>
              {eventError && <p className={FORM_ERROR_MSG}>{eventError}</p>}
              <button
                type="button"
                onClick={handleAddEvent}
                disabled={eventSaving || !eventName.trim()}
                className="w-full py-2.5 border border-accent text-accent text-sm font-semibold uppercase tracking-wider hover:bg-accent/10 transition-colors disabled:opacity-50"
              >
                {eventSaving ? 'Adding...' : 'Add Event'}
              </button>
            </div>

            <div className="flex gap-3">
              <button type="button" onClick={() => setStep('music')} className="px-6 py-3 text-sm font-semibold uppercase tracking-wider text-text-secondary hover:text-text-primary transition-colors">
                Back
              </button>
              <button type="button" onClick={() => setStep('plan')} className={`flex-1 ${BTN_PRIMARY} py-3`}>
                {events.length > 0 ? 'Continue' : 'Skip for Now'}
              </button>
            </div>
          </div>
        )}

        {/* ====== STEP 5: Plan ====== */}
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
                  {['Professional EPK page', 'Custom URL slug', 'Mixes, events & photos', 'Technical rider & contact', 'Social links'].map((f) => (
                    <li key={f} className="flex gap-2.5 text-sm">
                      <CheckLine className="text-text-secondary flex-shrink-0 mt-0.5" />
                      <span className="text-text-secondary">{f}</span>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => setStep('publish')}
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
                    <CheckLine className="text-accent flex-shrink-0 mt-0.5" />
                    <span className="text-text-primary font-medium">Everything in Free, plus:</span>
                  </li>
                  {['Custom domain', 'Remove platform branding', 'SEO & social preview controls', 'Advanced theme customization'].map((f) => (
                    <li key={f} className="flex gap-2.5 text-sm">
                      <CheckLine className="text-accent flex-shrink-0 mt-0.5" />
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

        {/* ====== STEP 6: Publish ====== */}
        {step === 'publish' && (
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center mx-auto mb-6">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <path d="M22 4L12 14.01l-3-3" />
              </svg>
            </div>

            <h1 className="font-display font-extrabold text-3xl tracking-tight mb-3">
              You're all set!
            </h1>
            <p className="text-text-secondary text-sm mb-2">
              Your press kit is ready at <span className="text-accent font-medium">myepk.bio/{slug}</span>
            </p>
            <p className="text-text-secondary text-sm mb-10">
              Publish now to make it live, or head to the dashboard to keep customizing.
            </p>

            <div className="space-y-3 max-w-xs mx-auto">
              <button
                type="button"
                onClick={handlePublish}
                disabled={publishing}
                className={`w-full ${BTN_PRIMARY} py-3`}
              >
                {publishing ? 'Publishing...' : 'Publish & Go to Dashboard'}
              </button>
              <button
                type="button"
                onClick={() => { window.location.href = '/dashboard' }}
                className="w-full py-3 text-text-secondary text-sm font-semibold uppercase tracking-wider hover:text-text-primary transition-colors"
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
