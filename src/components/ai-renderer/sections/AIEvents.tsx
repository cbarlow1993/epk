import { useAITokens } from '../AITokenProvider'
import { formatEventDate } from '~/utils/dates'
import type { EventRow } from '~/types/database'

interface AIEventsProps {
  events: EventRow[]
}

export function AIEvents({ events }: AIEventsProps) {
  const tokens = useAITokens()
  const eventsTokens = tokens.sections.events

  if (events.length === 0) return null

  const visibleEvents = eventsTokens.showPastEvents
    ? events
    : events.filter((e) => {
        if (!e.event_date) return true
        return new Date(e.event_date) >= new Date()
      })

  const limitedEvents = eventsTokens.maxVisible
    ? visibleEvents.slice(0, eventsTokens.maxVisible)
    : visibleEvents

  if (limitedEvents.length === 0) return null

  return (
    <section
      id="events"
      className="px-4"
      style={{
        paddingBlock: eventsTokens.padding || 'var(--ai-section-padding)',
        background: eventsTokens.background || 'transparent',
        color: eventsTokens.textColor || 'var(--ai-color-text)',
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
          Events
        </h2>
        {eventsTokens.variant === 'timeline' && <EventsTimeline events={limitedEvents} />}
        {eventsTokens.variant === 'grid' && <EventsGrid events={limitedEvents} />}
        {eventsTokens.variant === 'list' && <EventsList events={limitedEvents} />}
        {eventsTokens.variant === 'calendar' && <EventsCalendar events={limitedEvents} />}
      </div>
    </section>
  )
}

function EventsTimeline({ events }: AIEventsProps) {
  const tokens = useAITokens()

  return (
    <div className="relative">
      <div
        className="absolute left-4 md:left-1/2 top-0 bottom-0 w-0.5 -translate-x-1/2"
        style={{ backgroundColor: 'var(--ai-color-accent)', opacity: 0.3 }}
      />
      <div className="space-y-8">
        {events.map((event, index) => (
          <div
            key={event.id}
            className={`relative flex flex-col ${index % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'}`}
          >
            <div
              className="absolute left-4 md:left-1/2 w-3 h-3 rounded-full -translate-x-1/2 mt-4 z-10"
              style={{
                backgroundColor: 'var(--ai-color-accent)',
                borderWidth: '2px',
                borderColor: 'var(--ai-color-background)',
              }}
            />
            <div className="hidden md:block md:w-1/2" />
            <a
              href={event.link_url || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-10 md:ml-0 md:w-1/2 flex items-start gap-4 border p-4 hover:opacity-80 transition-opacity"
              style={{
                borderColor: 'var(--ai-color-border)',
                borderRadius: 'var(--ai-radius-md)',
                backgroundColor: 'var(--ai-color-surface)',
                boxShadow: `var(--ai-shadow-${tokens.decorative.shadow})`,
              }}
            >
              {event.image_url && (
                <img
                  src={event.image_url}
                  alt={event.name}
                  className="w-16 h-16 object-cover shrink-0"
                  style={{ borderRadius: 'var(--ai-radius-sm)' }}
                  loading="lazy"
                />
              )}
              <div className="min-w-0">
                <p
                  className="font-semibold text-sm"
                  style={{ color: 'var(--ai-color-heading)' }}
                >
                  {event.name}
                </p>
                {formatEventDate(event.event_date, event.event_date_end) && (
                  <p
                    className="text-xs mt-0.5"
                    style={{ color: 'var(--ai-color-textMuted)' }}
                  >
                    {formatEventDate(event.event_date, event.event_date_end)}
                  </p>
                )}
                {event.description && (
                  <p
                    className="text-xs mt-1 line-clamp-2"
                    style={{ color: 'var(--ai-color-textMuted)' }}
                  >
                    {event.description}
                  </p>
                )}
              </div>
            </a>
          </div>
        ))}
      </div>
    </div>
  )
}

function EventsGrid({ events }: AIEventsProps) {
  const tokens = useAITokens()

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
      {events.map((event) => (
        <a
          key={event.id}
          href={event.link_url || '#'}
          target="_blank"
          rel="noopener noreferrer"
          className="block overflow-hidden border hover:scale-105 transition-transform"
          style={{
            borderColor: 'var(--ai-color-border)',
            borderRadius: 'var(--ai-radius-md)',
            backgroundColor: 'var(--ai-color-surface)',
            boxShadow: `var(--ai-shadow-${tokens.decorative.shadow})`,
          }}
        >
          <div
            className="aspect-square overflow-hidden"
            style={{ backgroundColor: 'var(--ai-color-surface)' }}
          >
            {event.image_url && (
              <img
                src={event.image_url}
                alt={event.name}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            )}
          </div>
          <div className="px-3 py-2" style={{ backgroundColor: 'var(--ai-color-surface)' }}>
            <p
              className="text-xs text-center leading-tight"
              style={{ color: 'var(--ai-color-textMuted)' }}
            >
              {event.name}
            </p>
            {formatEventDate(event.event_date, event.event_date_end) && (
              <p
                className="text-[10px] text-center mt-0.5 opacity-70"
                style={{ color: 'var(--ai-color-textMuted)' }}
              >
                {formatEventDate(event.event_date, event.event_date_end)}
              </p>
            )}
          </div>
        </a>
      ))}
    </div>
  )
}

function EventsList({ events }: AIEventsProps) {
  return (
    <div className="divide-y" style={{ borderColor: 'var(--ai-color-border)' }}>
      {events.map((event) => (
        <a
          key={event.id}
          href={event.link_url || '#'}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-4 py-4 hover:opacity-80 transition-opacity"
        >
          {event.image_url && (
            <img
              src={event.image_url}
              alt={event.name}
              className="w-14 h-14 object-cover shrink-0"
              style={{ borderRadius: 'var(--ai-radius-sm)' }}
              loading="lazy"
            />
          )}
          <div className="flex-1 min-w-0">
            <p
              className="font-semibold text-sm"
              style={{ color: 'var(--ai-color-heading)' }}
            >
              {event.name}
            </p>
            {event.description && (
              <p
                className="text-xs mt-0.5 line-clamp-1"
                style={{ color: 'var(--ai-color-textMuted)' }}
              >
                {event.description}
              </p>
            )}
          </div>
          {formatEventDate(event.event_date, event.event_date_end) && (
            <span
              className="text-xs shrink-0"
              style={{ color: 'var(--ai-color-textMuted)' }}
            >
              {formatEventDate(event.event_date, event.event_date_end)}
            </span>
          )}
        </a>
      ))}
    </div>
  )
}

function EventsCalendar({ events }: AIEventsProps) {
  const tokens = useAITokens()

  return (
    <div className="space-y-4">
      {events.map((event) => {
        const date = event.event_date ? new Date(event.event_date) : null
        return (
          <a
            key={event.id}
            href={event.link_url || '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-start gap-4 border p-4 hover:opacity-80 transition-opacity"
            style={{
              borderColor: 'var(--ai-color-border)',
              borderRadius: 'var(--ai-radius-md)',
              backgroundColor: 'var(--ai-color-surface)',
              boxShadow: `var(--ai-shadow-${tokens.decorative.shadow})`,
            }}
          >
            {date && (
              <div
                className="shrink-0 w-16 text-center py-2"
                style={{
                  backgroundColor: 'var(--ai-color-accent)',
                  color: '#fff',
                  borderRadius: 'var(--ai-radius-sm)',
                }}
              >
                <div className="text-xs font-semibold uppercase">
                  {date.toLocaleDateString('en', { month: 'short' })}
                </div>
                <div className="text-xl font-bold">{date.getDate()}</div>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p
                className="font-semibold text-sm"
                style={{ color: 'var(--ai-color-heading)' }}
              >
                {event.name}
              </p>
              {formatEventDate(event.event_date, event.event_date_end) && (
                <p
                  className="text-xs mt-0.5"
                  style={{ color: 'var(--ai-color-textMuted)' }}
                >
                  {formatEventDate(event.event_date, event.event_date_end)}
                </p>
              )}
              {event.description && (
                <p
                  className="text-xs mt-1 line-clamp-2"
                  style={{ color: 'var(--ai-color-textMuted)' }}
                >
                  {event.description}
                </p>
              )}
            </div>
            {event.image_url && (
              <img
                src={event.image_url}
                alt={event.name}
                className="w-20 h-20 object-cover shrink-0"
                style={{ borderRadius: 'var(--ai-radius-sm)' }}
                loading="lazy"
              />
            )}
          </a>
        )
      })}
    </div>
  )
}
