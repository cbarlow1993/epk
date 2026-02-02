import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { getBookingContact, updateBookingContact } from '~/server/booking-contact'
import { bookingContactUpdateSchema, type BookingContactUpdate } from '~/schemas/booking-contact'
import { FormInput } from '~/components/forms'

export const Route = createFileRoute('/_dashboard/dashboard/contact')({
  loader: () => getBookingContact(),
  component: BookingContactEditor,
})

function BookingContactEditor() {
  const initialData = Route.useLoaderData()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const { register, handleSubmit, formState: { errors, isDirty } } = useForm<BookingContactUpdate>({
    resolver: zodResolver(bookingContactUpdateSchema),
    defaultValues: {
      manager_name: (initialData as Record<string, string> | null)?.manager_name || '',
      email: (initialData as Record<string, string> | null)?.email || '',
      phone: (initialData as Record<string, string> | null)?.phone || '',
      address: (initialData as Record<string, string> | null)?.address || '',
    },
  })

  const onSave = handleSubmit(async (data) => {
    setSaving(true)
    setSaved(false)
    setError('')
    try {
      const result = await updateBookingContact({ data })
      if (result && 'error' in result) {
        setError(result.error as string)
      } else {
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      }
    } catch {
      setError('Failed to save. Please try again.')
    }
    setSaving(false)
  })

  return (
    <form onSubmit={onSave}>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-black uppercase tracking-wider">Booking Contact</h1>
        <div className="flex items-center gap-3">
          {saved && <span className="text-xs text-green-400">Saved</span>}
          {error && <span className="text-xs text-red-400">{error}</span>}
          <button
            type="submit"
            disabled={saving || (!isDirty && !saved)}
            className="px-5 py-2 rounded-lg text-sm font-bold uppercase tracking-wider bg-accent text-black hover:bg-accent/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      <div className="space-y-6">
        <FormInput
          label="Manager / Agent Name"
          registration={register('manager_name')}
          error={errors.manager_name}
          placeholder="e.g. Helen"
        />
        <FormInput
          label="Email"
          registration={register('email')}
          error={errors.email}
          type="email"
          placeholder="booking@example.com"
        />
        <FormInput
          label="Phone"
          registration={register('phone')}
          error={errors.phone}
          type="tel"
          placeholder="+44 7xxx xxx xxx"
        />
        <FormInput
          label="Address"
          registration={register('address')}
          error={errors.address}
          placeholder="City, Country"
        />
      </div>
    </form>
  )
}
