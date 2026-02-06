import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { getChecklistState, toggleChecklistItem, type ChecklistState } from '~/server/checklist'

export const Route = createFileRoute('/_dashboard/dashboard/next')({
  loader: () => getChecklistState(),
  component: WhatToDoNext,
})

interface ChecklistItem {
  key: keyof ChecklistState
  label: string
  description: string
  type: 'auto' | 'manual'
  link?: string
}

const PHASES: { title: string; items: ChecklistItem[] }[] = [
  {
    title: 'Complete your EPK',
    items: [
      { key: 'has_display_name', label: 'Add a display name', description: 'Set your artist name so people know who you are.', type: 'auto', link: '/dashboard' },
      { key: 'has_profile_image', label: 'Upload a profile photo', description: 'A professional photo makes your EPK stand out.', type: 'auto', link: '/dashboard/bio' },
      { key: 'has_bio', label: 'Write your bio', description: 'Tell promoters and fans your story.', type: 'auto', link: '/dashboard/bio' },
      { key: 'has_hero_image', label: 'Upload a hero image', description: 'The first thing visitors see on your page.', type: 'auto', link: '/dashboard/hero' },
      { key: 'has_mixes', label: 'Add at least one mix', description: 'Showcase your sound with a mix or track.', type: 'auto', link: '/dashboard/music' },
      { key: 'has_contact', label: 'Add your contact info', description: 'Let promoters know how to book you.', type: 'auto', link: '/dashboard/contact' },
      { key: 'has_socials', label: 'Add your social links', description: 'Connect your Instagram, SoundCloud, and more.', type: 'auto', link: '/dashboard/socials' },
    ],
  },
  {
    title: 'Go live & share',
    items: [
      { key: 'is_published', label: 'Publish your EPK', description: 'Flip the switch in the sidebar to make your page live.', type: 'auto' },
      { key: 'has_social_preview', label: 'Set up your social preview', description: 'Control how your link looks when shared on social media.', type: 'auto', link: '/dashboard/social-preview' },
      { key: 'shared_social', label: 'Share your EPK on social media', description: 'Post your EPK link on Instagram, Twitter, or Facebook.', type: 'manual' },
      { key: 'added_to_bio', label: 'Add your EPK link to your bio/Linktree', description: 'Make your EPK easy to find from your social profiles.', type: 'manual' },
      { key: 'sent_to_promoter', label: 'Send your EPK to a promoter or venue', description: 'Email your link to someone who books shows.', type: 'manual' },
    ],
  },
  {
    title: 'Level up',
    items: [
      { key: 'has_custom_domain', label: 'Set up a custom domain', description: 'Use your own domain for a professional look.', type: 'auto', link: '/dashboard/settings' },
      { key: 'added_to_email_sig', label: 'Add your EPK to your email signature', description: 'Every email becomes a chance to share your work.', type: 'manual' },
      { key: 'included_in_demo', label: 'Include your EPK in a demo submission', description: 'Attach your EPK link when sending demos to labels.', type: 'manual' },
      { key: 'has_custom_theme', label: 'Choose a theme that fits your brand', description: 'Customise colors and fonts to match your identity.', type: 'auto', link: '/dashboard/theme' },
    ],
  },
]

function WhatToDoNext() {
  const initialState = Route.useLoaderData()

  if (!initialState) {
    return (
      <div>
        <div className="mb-8 pb-6 border-b border-border">
          <h1 className="font-display font-extrabold text-2xl tracking-tight uppercase">What to do next</h1>
        </div>
        <p className="text-sm text-text-secondary">Unable to load checklist. Please try refreshing the page.</p>
      </div>
    )
  }

  return <WhatToDoNextContent initialState={initialState} />
}

function WhatToDoNextContent({ initialState }: { initialState: ChecklistState }) {
  const [state, setState] = useState<ChecklistState>(initialState)

  const MANUAL_KEYS = new Set<keyof ChecklistState>(['shared_social', 'added_to_bio', 'sent_to_promoter', 'added_to_email_sig', 'included_in_demo'])

  const handleToggle = async (key: keyof ChecklistState, checked: boolean) => {
    if (!MANUAL_KEYS.has(key)) return
    setState((prev) => ({ ...prev, [key]: checked }))
    const result = await toggleChecklistItem({ data: { key: key as 'shared_social', checked } })
    if ('error' in result) {
      setState((prev) => ({ ...prev, [key]: !checked }))
    }
  }

  const focusPhaseIndex = PHASES.findIndex((phase) =>
    phase.items.some((item) => !state[item.key])
  )

  return (
    <div>
      <div className="mb-8 pb-6 border-b border-border">
        <h1 className="font-display font-extrabold text-2xl tracking-tight uppercase">What to do next</h1>
        <p className="text-sm text-text-secondary mt-1">Make the most of your EPK with these steps.</p>
      </div>

      <div className="space-y-6 max-w-2xl">
        {PHASES.map((phase, phaseIndex) => {
          const completed = phase.items.filter((item) => state[item.key]).length
          const total = phase.items.length
          const isFullyComplete = completed === total
          const isFocus = phaseIndex === focusPhaseIndex
          const isPastFocus = focusPhaseIndex !== -1 && phaseIndex > focusPhaseIndex

          return (
            <PhaseCard
              key={phaseIndex}
              phaseNumber={phaseIndex + 1}
              title={phase.title}
              items={phase.items}
              state={state}
              completed={completed}
              total={total}
              isFullyComplete={isFullyComplete}
              defaultExpanded={isFocus || focusPhaseIndex === -1}
              muted={isPastFocus}
              onToggle={handleToggle}
            />
          )
        })}
      </div>
    </div>
  )
}

function PhaseCard({
  phaseNumber,
  title,
  items,
  state,
  completed,
  total,
  isFullyComplete,
  defaultExpanded,
  muted,
  onToggle,
}: {
  phaseNumber: number
  title: string
  items: ChecklistItem[]
  state: ChecklistState
  completed: number
  total: number
  isFullyComplete: boolean
  defaultExpanded: boolean
  muted: boolean
  onToggle: (key: keyof ChecklistState, checked: boolean) => void
}) {
  const [expanded, setExpanded] = useState(defaultExpanded)

  return (
    <div className={`border border-border transition-opacity ${muted ? 'opacity-60' : ''}`}>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-6 py-4 text-left focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
      >
        <div className="flex items-center gap-3">
          {isFullyComplete ? (
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-green-500 text-white text-xs">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
            </span>
          ) : (
            <span className="flex items-center justify-center w-6 h-6 rounded-full border-2 border-border text-xs font-bold text-text-secondary">
              {phaseNumber}
            </span>
          )}
          <span className="font-display font-bold text-sm uppercase tracking-wider">{title}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-text-secondary font-medium">{completed}/{total}</span>
          <div className="w-20 h-1.5 bg-border rounded-full overflow-hidden">
            <div
              className="h-full bg-accent rounded-full transition-all"
              style={{ width: `${(completed / total) * 100}%` }}
            />
          </div>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className={`transition-transform ${expanded ? 'rotate-180' : ''}`}
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </div>
      </button>

      {expanded && (
        <div className="px-6 pb-4 space-y-1">
          {items.map((item) => {
            const checked = state[item.key]
            const isManual = item.type === 'manual'

            return (
              <div key={item.key} className="flex items-start gap-3 py-2">
                {isManual ? (
                  <button
                    type="button"
                    onClick={() => onToggle(item.key, !checked)}
                    className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded border-2 transition-colors flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-1 ${
                      checked ? 'bg-accent border-accent' : 'border-border hover:border-accent/50'
                    }`}
                    aria-label={checked ? `Uncheck: ${item.label}` : `Check: ${item.label}`}
                  >
                    {checked && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                    )}
                  </button>
                ) : (
                  <span className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center ${
                    checked ? 'bg-accent border-accent' : 'border-border'
                  }`}>
                    {checked && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                    )}
                  </span>
                )}
                <div className="flex-1 min-w-0">
                  {!checked && item.link ? (
                    <Link to={item.link} className="text-sm font-medium text-text-primary hover:text-accent transition-colors">
                      {item.label}
                    </Link>
                  ) : (
                    <span className={`text-sm font-medium ${checked ? 'text-text-secondary line-through' : 'text-text-primary'}`}>
                      {item.label}
                    </span>
                  )}
                  <p className={`text-xs mt-0.5 ${checked ? 'text-text-secondary/50' : 'text-text-secondary'}`}>
                    {item.description}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
