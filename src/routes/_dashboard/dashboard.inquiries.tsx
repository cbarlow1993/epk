import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { getBookingRequests, updateBookingRequestStatus } from '~/server/booking-requests'
import { BTN_BASE } from '~/components/forms'
import type { BookingRequestRow } from '~/types/database'

export const Route = createFileRoute('/_dashboard/dashboard/inquiries')({
  loader: () => getBookingRequests(),
  component: InquiriesDashboard,
})

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-accent/20 text-accent',
  read: 'bg-blue-500/20 text-blue-400',
  replied: 'bg-green-500/10 text-green-600',
  archived: 'bg-bg text-text-secondary',
}

const STATUS_OPTIONS: BookingRequestRow['status'][] = ['new', 'read', 'replied', 'archived']

function InquiriesDashboard() {
  const initialRequests = Route.useLoaderData()
  const [requests, setRequests] = useState<BookingRequestRow[]>(initialRequests || [])
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const handleStatusChange = async (id: string, status: BookingRequestRow['status']) => {
    const result = await updateBookingRequestStatus({ data: { id, status } })
    if ('success' in result) {
      setRequests(prev => prev.map(r => r.id === id ? { ...r, status } : r))
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-display font-semibold tracking-tight mb-8">Booking Inquiries</h1>

      {requests.length === 0 ? (
        <p className="text-text-secondary text-sm">No booking inquiries yet. They'll appear here when someone submits the form on your EPK.</p>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => (
            <div key={req.id} className="bg-white border border-border rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => setExpandedId(expandedId === req.id ? null : req.id)}
                className="w-full flex items-center gap-4 px-4 py-3 text-left hover:bg-border transition-colors"
              >
                <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded ${STATUS_COLORS[req.status]}`}>
                  {req.status}
                </span>
                <span className="font-bold text-sm flex-1 truncate">{req.name}</span>
                <span className="text-xs text-text-secondary">{req.event_name || 'No event name'}</span>
                <span className="text-xs text-text-secondary">
                  {new Date(req.created_at).toLocaleDateString()}
                </span>
              </button>

              {expandedId === req.id && (
                <div className="px-4 pb-4 border-t border-border">
                  <div className="grid sm:grid-cols-2 gap-x-8 gap-y-2 py-4 text-sm">
                    <div><span className="text-text-secondary">Email:</span> <a href={`mailto:${req.email}`} className="text-accent hover:underline">{req.email}</a></div>
                    {req.event_name && <div><span className="text-text-secondary">Event:</span> {req.event_name}</div>}
                    {req.event_date && <div><span className="text-text-secondary">Date:</span> {new Date(req.event_date).toLocaleDateString()}</div>}
                    {req.venue_location && <div><span className="text-text-secondary">Venue:</span> {req.venue_location}</div>}
                    {req.budget_range && <div><span className="text-text-secondary">Budget:</span> {req.budget_range}</div>}
                  </div>
                  <div className="bg-white/50 rounded-lg p-4 mb-4">
                    <p className="text-xs font-medium text-text-secondary mb-2">Message</p>
                    <p className="text-sm whitespace-pre-line">{req.message}</p>
                  </div>
                  <div className="flex gap-2">
                    {STATUS_OPTIONS.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => handleStatusChange(req.id, s)}
                        className={`${BTN_BASE} text-xs ${req.status === s ? 'bg-accent text-white' : 'bg-bg text-text-primary hover:bg-border'}`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
