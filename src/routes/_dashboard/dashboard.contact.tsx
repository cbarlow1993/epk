import { createFileRoute } from '@tanstack/react-router'
import { useState, useCallback } from 'react'
import { getBookingContact, updateBookingContact } from '~/server/booking-contact'

const FIELDS = [
  { key: 'manager_name', label: 'Manager / Agent Name', type: 'text', placeholder: 'e.g. Helen' },
  { key: 'email', label: 'Email', type: 'email', placeholder: 'booking@example.com' },
  { key: 'phone', label: 'Phone', type: 'tel', placeholder: '+44 7xxx xxx xxx' },
  { key: 'address', label: 'Address', type: 'text', placeholder: 'City, Country' },
] as const

export const Route = createFileRoute('/_dashboard/dashboard/contact')({
  loader: () => getBookingContact(),
  component: BookingContactEditor,
})

function BookingContactEditor() {
  const initialData = Route.useLoaderData()
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(FIELDS.map((f) => [f.key, (initialData as Record<string, string> | null)?.[f.key] || '']))
  )
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const [timer, setTimer] = useState<ReturnType<typeof setTimeout> | null>(null)
  const autoSave = useCallback((field: string, value: string) => {
    if (timer) clearTimeout(timer)
    const t = setTimeout(async () => {
      setSaving(true)
      setSaved(false)
      await updateBookingContact({ data: { [field]: value } })
      setSaving(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }, 800)
    setTimer(t)
  }, [timer])

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-black uppercase tracking-wider">Booking Contact</h1>
        <span className="text-xs text-text-secondary">
          {saving ? 'Saving...' : saved ? 'Saved' : ''}
        </span>
      </div>

      <div className="space-y-6">
        {FIELDS.map((field) => (
          <div key={field.key}>
            <label className="block text-sm uppercase tracking-widest font-bold mb-2">{field.label}</label>
            <input
              type={field.type}
              value={values[field.key]}
              onChange={(e) => {
                setValues((prev) => ({ ...prev, [field.key]: e.target.value }))
                autoSave(field.key, e.target.value)
              }}
              className="w-full bg-dark-card border border-white/10 rounded-lg px-4 py-3 text-white placeholder-text-secondary/50 focus:border-accent focus:outline-none transition-colors text-sm"
              placeholder={field.placeholder}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
